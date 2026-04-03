/**
 * /api/fetch — content fetching for bookmarks.
 *
 * POST /api/fetch  — start fetching content for bookmarks
 * GET  /api/fetch  — get fetch status
 * DELETE /api/fetch — abort running fetch
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  fetchContentForBookmarks,
  getFetchState,
  abortFetch,
  resetFetch,
} from '@/lib/content-fetch'
import { checkTools } from '@/lib/agent-reach'

// ── GET /api/fetch — status ────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const state = getFetchState()
  const tools = checkTools()

  return NextResponse.json({
    status: state.status,
    done: state.done,
    total: state.total,
    errors: state.errors,
    tools,
    elapsed: state.startTime ? Date.now() - state.startTime : 0,
  })
}

// ── DELETE /api/fetch — abort ─────────────────────────────────────────────────

export async function DELETE(): Promise<NextResponse> {
  const state = getFetchState()
  if (state.status !== 'running' && state.status !== 'stopping') {
    return NextResponse.json({ error: 'No fetch running' }, { status: 409 })
  }
  abortFetch()
  return NextResponse.json({ aborted: true })
}

// ── POST /api/fetch — start ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const state = getFetchState()
  if (state.status === 'running' || state.status === 'stopping') {
    return NextResponse.json({ error: 'Fetch already running' }, { status: 409 })
  }

  let body: { bookmarkIds?: string[]; force?: boolean } = {}
  try {
    const text = await request.text()
    if (text.trim()) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { bookmarkIds = [], force = false } = body

  // Determine which bookmarks to fetch
  let bookmarksToFetch: string[]
  if (bookmarkIds.length > 0) {
    bookmarksToFetch = bookmarkIds
  } else {
    // Default: all bookmarks that haven't been fetched yet
    const unbatched = await prisma.bookmark.findMany({
      where: force ? {} : { contentFetchedAt: null },
      select: { id: true },
    })
    bookmarksToFetch = unbatched.map((b) => b.id)
  }

  if (bookmarksToFetch.length === 0) {
    return NextResponse.json({
      status: 'idle',
      fetched: 0,
      message: 'No bookmarks to fetch',
    })
  }

  resetFetch()

  // Fire and forget — caller polls GET /api/fetch for progress
  void (async () => {
    try {
      await fetchContentForBookmarks(bookmarksToFetch)
    } finally {
      const finalState = getFetchState()
      // If aborted, reset to idle
      if (finalState.status === 'stopping') {
        resetFetch()
      }
    }
  })()

  return NextResponse.json({
    status: 'started',
    total: bookmarksToFetch.length,
    message: `Fetching content for ${bookmarksToFetch.length} bookmarks`,
  })
}
