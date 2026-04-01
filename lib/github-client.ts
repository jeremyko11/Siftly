/**
 * GitHub API client for fetching repo metadata and README content.
 * Uses GitHub PAT from database settings, with rate-limit awareness.
 */

import prisma from '@/lib/db'
import { decryptSafe } from '@/lib/crypto'

const GITHUB_API = 'https://api.github.com'
const README_MAX_CHARS = 50_000
const BATCH_DELAY_MS = 150  // between requests to avoid rate limits

// ── Token retrieval ─────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'github_personal_access_token' },
  })
  if (!setting?.value) return null
  return decryptSafe(setting.value).trim() || null
}

// ── GitHub API fetch ────────────────────────────────────────────────────────────

async function githubFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<{ data: T; rateLimit: number }> {
  const url = `${GITHUB_API}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Siftly/1.0',
      ...(options?.headers ?? {}),
    },
  })

  const remaining = parseInt(res.headers.get('x-ratelimit-remaining') ?? '60', 10)
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new GitHubApiError(res.status, errorBody)
  }

  const data = (await res.json()) as T
  return { data, rateLimit: remaining }
}

class GitHubApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`GitHub API error ${status}: ${body.slice(0, 200)}`)
  }
}

// ── Parse GitHub URL ───────────────────────────────────────────────────────────

const GITHUB_URL_RE = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\/.*)?$/i

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(GITHUB_URL_RE)
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

export function buildGitHubUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`
}

// ── Fetch repo metadata ─────────────────────────────────────────────────────────

export interface RepoMetadata {
  owner: string
  name: string
  fullName: string
  description: string | null
  url: string
  stars: number
  language: string | null
  topics: string[]
}

export async function fetchRepoMetadata(
  owner: string,
  repo: string,
  token: string,
): Promise<RepoMetadata> {
  const { data } = await githubFetch<{
    owner: { login: string }
    name: string
    full_name: string
    description: string | null
    html_url: string
    stargazers_count: number
    language: string | null
    topics: string[]
  }>(`/repos/${owner}/${repo}`, token)

  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    url: data.html_url,
    stars: data.stargazers_count,
    language: data.language,
    topics: data.topics ?? [],
  }
}

// ── Fetch README content ───────────────────────────────────────────────────────

export async function fetchReadme(
  owner: string,
  repo: string,
  token: string,
): Promise<string | null> {
  try {
    const { data } = await githubFetch<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/readme`,
      token,
    )

    if (data.encoding === 'base64') {
      const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
      return decoded.slice(0, README_MAX_CHARS)
    }
    return null
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) return null
    throw err
  }
}

// ── Sync result type ───────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number
  analyzed: number
  errors: string[]
}

// ── Resolve t.co shortlink to final URL ───────────────────────────────────────

async function resolveTcoUrl(tcoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(tcoUrl, {
      method: 'HEAD',
      redirect: 'follow',
    })
    return res.url
  } catch {
    return null
  }
}

// ── Main sync function ────────────────────────────────────────────────────────

/**
 * Extract GitHub URLs from bookmarks and sync metadata + README.
 * Returns after queuing work — analysis runs in background via fire-and-forget.
 */
export async function syncReposFromBookmarks(
  bookmarkIds?: string[],
  onProgress?: (msg: string) => void,
): Promise<SyncResult> {
  const token = await getToken()
  if (!token) {
    throw new Error('No GitHub PAT configured. Add githubPersonalAccessToken in Settings.')
  }

  // Collect all GitHub URLs from bookmarks
  const bookmarks = bookmarkIds
    ? await prisma.bookmark.findMany({
        where: { id: { in: bookmarkIds } },
        select: { id: true, rawJson: true, text: true },
      })
    : await prisma.bookmark.findMany({
        select: { id: true, rawJson: true, text: true },
      })

  const seen = new Set<string>()
  const reposToSync: { owner: string; repo: string; bookmarkId: string; url: string }[] = []

  for (const bm of bookmarks) {
    // From entities.urls in rawJson (expanded_url may point to GitHub even if not unwound)
    try {
      if (bm.rawJson) {
        const raw = JSON.parse(bm.rawJson)
        const urlObjs: unknown[] = raw?.entities?.urls ?? raw?.legacy?.entities?.urls ?? []
        for (const u of urlObjs as { unwound_url?: string; expanded_url?: string; url?: string }[]) {
          const url = u.unwound_url ?? u.expanded_url ?? u.url ?? ''
          const parsed = parseGitHubUrl(url)
          if (parsed && !seen.has(parsed.repo.toLowerCase())) {
            seen.add(parsed.repo.toLowerCase())
            reposToSync.push({ ...parsed, bookmarkId: bm.id, url })
          }
        }
      }
    } catch { /* ignore parse errors */ }

    // From tweet text — match github.com links AND t.co shortlinks (resolve them below)
    const textMatches = bm.text.matchAll(/https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/gi)
    for (const m of textMatches) {
      const owner = m[1]
      const repo = m[2]
      const fullKey = `${owner}/${repo}`.toLowerCase()
      if (!seen.has(fullKey)) {
        seen.add(fullKey)
        reposToSync.push({ owner, repo, bookmarkId: bm.id, url: m[0] })
      }
    }

    // Also resolve t.co shortlinks from text that may point to GitHub
    // (Bird import strips t.co from entities.urls, so we resolve them on-demand)
    const tcoMatches = bm.text.matchAll(/https?:\/\/t\.co\/[a-zA-Z0-9]+/gi)
    for (const m of tcoMatches) {
      const tcoUrl = m[0]
      try {
        const resolved = await resolveTcoUrl(tcoUrl)
        if (resolved) {
          const parsed = parseGitHubUrl(resolved)
          if (parsed && !seen.has(parsed.repo.toLowerCase())) {
            seen.add(parsed.repo.toLowerCase())
            reposToSync.push({ ...parsed, bookmarkId: bm.id, url: resolved })
          }
        }
      } catch { /* ignore resolution errors */ }
    }
  }

  onProgress?.(`Found ${reposToSync.length} unique repos to sync`)

  const errors: string[] = []
  let synced = 0

  for (let i = 0; i < reposToSync.length; i++) {
    const { owner, repo, bookmarkId, url } = reposToSync[i]

    try {
      // Check if already exists
      const existing = await prisma.repo.findUnique({ where: { fullName: `${owner}/${repo}` } })

      if (existing) {
        // Link bookmark to existing repo
        await prisma.bookmarkRepo.upsert({
          where: { bookmarkId_repoId: { bookmarkId, repoId: existing.id } },
          update: {},
          create: { bookmarkId, repoId: existing.id },
        }).catch(() => {}) // ignore if already linked
      } else {
        // Fetch and store
        const meta = await fetchRepoMetadata(owner, repo, token)
        const readme = await fetchReadme(owner, repo, token)

        const created = await prisma.repo.create({
          data: {
            owner: meta.owner,
            name: meta.name,
            fullName: meta.fullName,
            description: meta.description,
            url: meta.url,
            stars: meta.stars,
            language: meta.language,
            topics: JSON.stringify(meta.topics),
            readmeContent: readme,
          },
        })

        await prisma.bookmarkRepo.create({
          data: { bookmarkId, repoId: created.id },
        }).catch(() => {})

        synced++
        onProgress?.(`Synced ${i + 1}/${reposToSync.length}: ${meta.fullName}`)

        // Rate limit pacing
        if (i < reposToSync.length - 1) {
          await delay(BATCH_DELAY_MS)
        }
      }
    } catch (err) {
      const msg = `Failed to sync ${owner}/${repo}: ${err instanceof Error ? err.message : err}`
      errors.push(msg)
      console.warn(msg)
    }
  }

  return { synced, analyzed: 0, errors }
}

// ── Delay helper ───────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
