export const dynamic = 'force-dynamic'

import prisma from '@/lib/db'
import DashboardContent from './DashboardContent'
import type { BookmarkWithMedia } from '@/lib/types'

const RECENT_QUERY = {
  take: 6,
  orderBy: [{ tweetCreatedAt: 'desc' as const }, { importedAt: 'desc' as const }],
  include: {
    mediaItems: { select: { id: true, type: true, url: true, thumbnailUrl: true } },
    categories: {
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
      },
    },
  },
}

const TOP_CATS_QUERY = {
  include: { _count: { select: { bookmarks: true } } },
  orderBy: { bookmarks: { _count: 'desc' as const } },
  take: 10,
} as const

async function queryDashboard() {
  return Promise.all([
    prisma.bookmark.count(),
    prisma.category.count(),
    prisma.mediaItem.count(),
    prisma.bookmark.count({ where: { categories: { none: {} } } }),
    prisma.bookmark.findMany(RECENT_QUERY),
    prisma.category.findMany(TOP_CATS_QUERY),
    prisma.bookmark.count({ where: { source: 'bookmark' } }),
    prisma.bookmark.count({ where: { source: 'like' } }),
  ])
}

type QueryResult = Awaited<ReturnType<typeof queryDashboard>>

function buildDashboardData(result: QueryResult) {
  const [totalBookmarks, totalCategories, totalMedia, uncategorizedCount, recentRaw, catsRaw, bookmarkSourceCount, likeSourceCount] = result

  const recentBookmarks: BookmarkWithMedia[] = recentRaw.map((b) => ({
    id: b.id,
    tweetId: b.tweetId,
    text: b.text,
    authorHandle: b.authorHandle,
    authorName: b.authorName,
    tweetCreatedAt: b.tweetCreatedAt?.toISOString() ?? null,
    importedAt: b.importedAt.toISOString(),
    mediaItems: b.mediaItems,
    categories: b.categories.map((bc) => ({
      id: bc.category.id,
      name: bc.category.name,
      slug: bc.category.slug,
      color: bc.category.color,
      confidence: null,
    })),
  }))

  return {
    totalBookmarks,
    bookmarkSourceCount,
    likeSourceCount,
    totalCategories,
    totalMedia,
    uncategorizedCount,
    recentBookmarks,
    topCategories: catsRaw.map((c) => ({
      name: c.name,
      slug: c.slug,
      color: c.color,
      count: c._count.bookmarks,
    })),
  }
}

const EMPTY_DASHBOARD = {
  totalBookmarks: 0,
  bookmarkSourceCount: 0,
  likeSourceCount: 0,
  totalCategories: 0,
  totalMedia: 0,
  uncategorizedCount: 0,
  recentBookmarks: [] as BookmarkWithMedia[],
  topCategories: [] as { name: string; slug: string; color: string; count: number }[],
}

async function getDashboardData() {
  try {
    const result = await queryDashboard()
    return buildDashboardData(result)
  } catch {
    return EMPTY_DASHBOARD
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardContent data={data} />
}
