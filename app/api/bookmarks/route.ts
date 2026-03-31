import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 24
const MAX_LIMIT = 100

function parseIntParam(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed
}

export async function DELETE(): Promise<NextResponse> {
  try {
    // Delete media items and category links first (cascade), then bookmarks
    await prisma.$transaction([
      prisma.bookmarkCategory.deleteMany({}),
      prisma.mediaItem.deleteMany({}),
      prisma.bookmark.deleteMany({}),
      prisma.category.deleteMany({}),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Clear bookmarks error:', err)
    return NextResponse.json(
      { error: `Failed to clear bookmarks: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  const q = searchParams.get('q')?.trim() ?? ''
  const source = searchParams.get('source')?.trim() ?? ''
  const categorySlug = searchParams.get('category')?.trim() ?? ''
  const mediaType = searchParams.get('mediaType')?.trim() ?? ''
  const uncategorized = searchParams.get('uncategorized') === 'true'
  const sortParam = searchParams.get('sort')?.trim() ?? 'newest'
  const page = parseIntParam(searchParams.get('page'), DEFAULT_PAGE)
  const limit = Math.min(parseIntParam(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT)
  const skip = (page - 1) * limit
  const orderDir = sortParam === 'oldest' ? 'asc' : 'desc'

  const where: Record<string, unknown> = {}

  if (source === 'bookmark' || source === 'like') {
    where.source = source
  }

  if (q) {
    where.text = { contains: q }
  }

  if (uncategorized) {
    where.categories = { none: {} }
  } else if (categorySlug) {
    where.categories = {
      some: {
        category: { slug: categorySlug },
      },
    }
  }

  if (mediaType === 'photo' || mediaType === 'video') {
    where.mediaItems = {
      some: { type: mediaType },
    }
  }

  try {
    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ tweetCreatedAt: orderDir }, { importedAt: orderDir }],
        include: {
          mediaItems: true,
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      prisma.bookmark.count({ where }),
    ])

    const formatted = bookmarks.map((bookmark) => {
      // Extract expanded URLs and hashtags from rawJson
      let urls: string[] = []
      let hashtags: string[] = []
      if (bookmark.rawJson) {
        try {
          const raw = JSON.parse(bookmark.rawJson)
          urls = (raw.entities?.urls ?? []).map((u: { unwound_url?: string; expanded_url?: string; url?: string }) => u.unwound_url ?? u.expanded_url ?? u.url ?? '').filter(Boolean)
          hashtags = (raw.entities?.hashtags ?? []).map((h: { text?: string }) => h.text ?? '').filter(Boolean)
        } catch {}
      }
      // Fallback: extract directly from tweet text if rawJson had no entities (old imports)
      if (urls.length === 0) {
        const urlMatches = bookmark.text.match(/https?:\/\/[^\s]+/g) ?? []
        urls = urlMatches.filter((u) => !u.includes('t.co/'))
        // If still empty (all were t.co), keep t.co URLs so the card shows something
        if (urls.length === 0 && urlMatches.length > 0) {
          urls = urlMatches
        }
      }
      if (hashtags.length === 0) {
        const tagMatches = bookmark.text.match(/#[\w\u4e00-\u9fff]+/g) ?? []
        hashtags = tagMatches.map((t) => t.replace(/^#/, ''))
      }
      return {
        id: bookmark.id,
        tweetId: bookmark.tweetId,
        text: bookmark.text,
        authorHandle: bookmark.authorHandle,
        authorName: bookmark.authorName,
        source: bookmark.source,
        tweetCreatedAt: bookmark.tweetCreatedAt?.toISOString() ?? null,
        importedAt: bookmark.importedAt.toISOString(),
        mediaItems: bookmark.mediaItems.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
        })),
        categories: bookmark.categories.map((bc) => ({
          id: bc.category.id,
          name: bc.category.name,
          slug: bc.category.slug,
          color: bc.category.color,
          confidence: bc.confidence,
        })),
        rawJson: bookmark.rawJson ?? undefined,
        urls,
        hashtags,
      }
    })

    return NextResponse.json({
      bookmarks: formatted,
      total,
      page,
      limit,
    })
  } catch (err) {
    console.error('Bookmarks fetch error:', err)
    return NextResponse.json(
      { error: `Failed to fetch bookmarks: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
