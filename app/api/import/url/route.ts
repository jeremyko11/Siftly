import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { fetchContentForUrl } from '@/lib/agent-reach'

// POST /api/import/url
// Save any URL as a bookmark with auto-fetched content
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: {
    url?: string
    title?: string
    text?: string
    tags?: string[]
    categoryIds?: string[]
  } = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { url, title, text, tags, categoryIds } = body
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Validate URL
  let parsedUrl: URL
  try { parsedUrl = new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Extract tweetId if this is a Twitter URL
  const tweetIdMatch = parsedUrl.pathname.match(/\/status\/(\d+)/)
  const isTweet = !!tweetIdMatch

  if (isTweet) {
    // For Twitter URLs, create a minimal bookmark representation
    const tweetId = tweetIdMatch![1]
    const existing = await prisma.bookmark.findUnique({ where: { tweetId } })
    if (existing) {
      return NextResponse.json({ bookmark: existing, duplicate: true })
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        tweetId,
        text: text ?? title ?? `Tweet ${tweetId}`,
        authorHandle: 'unknown',
        authorName: title ?? 'Unknown',
        rawJson: JSON.stringify({ url, title, importedVia: 'url-import' }),
        semanticTags: tags ? JSON.stringify(tags) : undefined,
        source: 'bookmark',
      },
    })

    // Assign categories if provided
    if (categoryIds?.length) {
      for (const catId of categoryIds) {
        await prisma.bookmarkCategory.create({
          data: { bookmarkId: bookmark.id, categoryId: catId },
        })
      }
    }

    return NextResponse.json({ bookmark, duplicate: false })
  }

  // For non-Twitter URLs, use a generated ID based on URL hash
  const urlHash = Math.abs(Array.from(url).reduce((a, c) => a + c.charCodeAt(0), 0))
  const syntheticTweetId = `url_${urlHash}_${Date.now()}`

  const existingByUrl = await prisma.bookmark.findFirst({
    where: {
      tweetId: { startsWith: 'url_' },
      rawJson: { contains: url },
    },
  })
  if (existingByUrl) {
    return NextResponse.json({ bookmark: existingByUrl, duplicate: true })
  }

  // Fetch content via Agent-Reach (YouTube, Reddit, generic)
  let fetchedContent: string | null = null
  try {
    fetchedContent = await fetchContentForUrl(url)
  } catch { /* ignore */ }

  const contentJson = fetchedContent
    ? JSON.stringify({ [url]: fetchedContent.slice(0, 5000) })
    : undefined

  const bookmark = await prisma.bookmark.create({
    data: {
      tweetId: syntheticTweetId,
      text: text ?? title ?? url,
      authorHandle: parsedUrl.hostname.replace('www.', ''),
      authorName: title ?? parsedUrl.hostname,
      rawJson: JSON.stringify({ url, title, importedVia: 'url-import' }),
      semanticTags: tags ? JSON.stringify(tags) : undefined,
      fetchedContent: contentJson,
      contentFetchedAt: fetchedContent ? new Date() : undefined,
      source: 'bookmark',
    },
  })

  if (categoryIds?.length) {
    for (const catId of categoryIds) {
      await prisma.bookmarkCategory.create({
        data: { bookmarkId: bookmark.id, categoryId: catId },
      })
    }
  }

  return NextResponse.json({ bookmark, duplicate: false })
}
