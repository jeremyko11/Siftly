/**
 * Content fetch pipeline — fetches external content for bookmarks.
 * Independent of the categorize pipeline; triggered via /api/fetch.
 */

import prisma from '@/lib/db'
import { fetchContentForUrl, ToolStatus } from '@/lib/agent-reach'

const CONCURRENCY = 5
const FETCH_DELAY_MS = 200 // delay between batches to avoid rate limits

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FetchContentResult {
  bookmarkId: string
  fetched: number
  skipped: number
  errors: string[]
}

export interface FetchProgress {
  status: 'idle' | 'running' | 'stopping'
  done: number
  total: number
  errors: string[]
  startTime: number
}

// ── Global state (shared across requests, like categorize/route.ts) ─────────────

const g = globalThis as typeof globalThis & {
  fetchState: FetchProgress
  fetchAbort: boolean
}

if (!g.fetchState) {
  g.fetchState = {
    status: 'idle',
    done: 0,
    total: 0,
    errors: [],
    startTime: 0,
  }
}
if (g.fetchAbort === undefined) {
  g.fetchAbort = false
}

export function getFetchState(): FetchProgress {
  return { ...g.fetchState }
}

export function shouldFetchAbort(): boolean {
  return g.fetchAbort
}

function resetFetchState(): void {
  g.fetchState = { status: 'idle', done: 0, total: 0, errors: [], startTime: 0 }
  g.fetchAbort = false
}

// ── URL extraction from entities JSON ────────────────────────────────────────

interface EntitiesJson {
  urls?: string[]
  [key: string]: unknown
}

function extractUrlsFromEntities(entitiesJson: string | null): string[] {
  if (!entitiesJson) return []
  try {
    const parsed = JSON.parse(entitiesJson) as EntitiesJson
    return Array.isArray(parsed.urls) ? parsed.urls.filter(Boolean) : []
  } catch {
    return []
  }
}

// ── Core fetch logic ──────────────────────────────────────────────────────────

async function fetchUrlWithErrorTracking(
  url: string,
  results: Map<string, string>,
  errors: string[],
): Promise<void> {
  try {
    const content = await fetchContentForUrl(url)
    if (content) {
      results.set(url, content)
    }
  } catch (err) {
    errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch content for all given bookmark IDs.
 * Updates Bookmark.fetchedContent and contentFetchedAt in batch.
 * Returns after queuing work — progress via getFetchState().
 */
export async function fetchContentForBookmarks(
  bookmarkIds: string[],
  onProgress?: (done: number, total: number, errors: string[]) => void,
): Promise<FetchContentResult> {
  g.fetchAbort = false

  // Load bookmarks with their entities
  const bookmarks = await prisma.bookmark.findMany({
    where: { id: { in: bookmarkIds } },
    select: { id: true, entities: true, contentFetchedAt: true },
  })

  // Collect all (bookmarkId, url) pairs that need fetching
  type UrlTask = { bookmarkId: string; url: string }
  const tasks: UrlTask[] = []

  for (const bm of bookmarks) {
    // Skip already fetched unless forced (contentFetchedAt set means done)
    if (bm.contentFetchedAt) continue
    const urls = extractUrlsFromEntities(bm.entities)
    for (const url of urls) {
      tasks.push({ bookmarkId: bm.id, url })
    }
  }

  g.fetchState = {
    status: 'running',
    done: 0,
    total: tasks.length,
    errors: [],
    startTime: Date.now(),
  }

  const errors: string[] = []
  const bookmarkResults = new Map<string, Map<string, string>>() // bookmarkId -> url -> content

  // Process with bounded concurrency
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    if (g.fetchAbort) break

    const batch = tasks.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (task) => {
        if (!bookmarkResults.has(task.bookmarkId)) {
          bookmarkResults.set(task.bookmarkId, new Map())
        }
        await fetchUrlWithErrorTracking(task.url, bookmarkResults.get(task.bookmarkId)!, errors)
        g.fetchState.done = Math.min(i + CONCURRENCY, tasks.length)
        g.fetchState.errors = errors.slice(0, 10) // keep first 10 errors
        onProgress?.(g.fetchState.done, g.fetchState.total, g.fetchState.errors)
      })
    )

    // Rate limit delay between batches
    if (i + CONCURRENCY < tasks.length) {
      await sleep(FETCH_DELAY_MS)
    }
  }

  // Write results to DB in batch
  const now = new Date()
  let fetched = 0

  for (const [bookmarkId, urlContentMap] of bookmarkResults) {
    if (urlContentMap.size === 0) continue

    const obj: Record<string, string> = {}
    for (const [url, content] of urlContentMap) {
      obj[url] = content
    }

    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        fetchedContent: JSON.stringify(obj),
        contentFetchedAt: now,
      },
    }).catch((err) => {
      errors.push(`DB update failed for ${bookmarkId}: ${err instanceof Error ? err.message : String(err)}`)
    })
    fetched++
  }

  g.fetchState.status = g.fetchAbort ? 'stopping' : 'idle'
  return {
    bookmarkId: '',
    fetched,
    skipped: bookmarks.length - fetched,
    errors,
  }
}

/**
 * Abort the running fetch operation.
 */
export function abortFetch(): void {
  g.fetchAbort = true
  g.fetchState.status = 'stopping'
}

/**
 * Reset fetch state to idle.
 */
export function resetFetch(): void {
  resetFetchState()
}
