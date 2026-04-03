import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDue, calculateNextReview } from '@/lib/spaced-repetition'

// GET /api/review - Get review queue
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'due' // 'due' | 'all' | 'upcoming'

  const now = new Date()
  now.setHours(23, 59, 59, 999) // end of today

  const where =
    status === 'due'
      ? { nextReviewAt: { lte: now } }
      : status === 'upcoming'
      ? { nextReviewAt: { gt: now } }
      : {}

  const schedules = await prisma.reviewSchedule.findMany({
    where,
    include: {
      bookmark: {
        select: {
          id: true,
          tweetId: true,
          text: true,
          authorHandle: true,
          authorName: true,
          categories: {
            include: { category: { select: { name: true, color: true } } },
          },
        },
      },
    },
    orderBy:
      status === 'upcoming' ? { nextReviewAt: 'asc' as const } : { nextReviewAt: 'asc' as const },
  })

  const reviews = schedules.map((s) => ({
    bookmarkId: s.bookmarkId,
    interval: s.interval,
    easeFactor: s.easeFactor,
    repetitions: s.repetitions,
    nextReviewAt: s.nextReviewAt.toISOString(),
    lastReviewAt: s.lastReviewAt?.toISOString() ?? null,
    tweetId: s.bookmark.tweetId,
    text: s.bookmark.text.slice(0, 300),
    authorHandle: s.bookmark.authorHandle,
    authorName: s.bookmark.authorName,
    categories: s.bookmark.categories.map((bc) => ({
      name: bc.category.name,
      color: bc.category.color,
    })),
  }))

  // Stats
  const [dueCount, totalCount, upcomingCount] = await Promise.all([
    prisma.reviewSchedule.count({ where: { nextReviewAt: { lte: now } } }),
    prisma.reviewSchedule.count(),
    prisma.reviewSchedule.count({ where: { nextReviewAt: { gt: now } } }),
  ])

  return NextResponse.json({
    reviews,
    stats: { dueCount, totalCount, upcomingCount },
  })
}

// POST /api/review - Add bookmarks to review queue
export async function POST(request: NextRequest) {
  let body: { bookmarkIds?: string[]; category?: string; addAll?: boolean } = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { addAll } = body
  let bookmarkIds = body.bookmarkIds ?? []

  if (addAll) {
    const uncategorized = await prisma.bookmark.findMany({
      where: { categories: { none: {} } },
      select: { id: true },
    })
    bookmarkIds = uncategorized.map((b) => b.id)
  }

  if (bookmarkIds.length === 0) {
    return NextResponse.json({ error: 'No bookmarks specified' }, { status: 400 })
  }

  // Get existing schedule bookmarkIds to avoid duplicates
  const existing = await prisma.reviewSchedule.findMany({
    where: { bookmarkId: { in: bookmarkIds } },
    select: { bookmarkId: true },
  })
  const existingIds = new Set(existing.map((e) => e.bookmarkId))

  const toAdd = bookmarkIds.filter((id) => !existingIds.has(id))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Insert one by one since SQLite doesn't support skipDuplicates well with createMany
  for (const bookmarkId of toAdd) {
    await prisma.reviewSchedule.create({
      data: {
        bookmarkId,
        nextReviewAt: today,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      },
    }).catch(() => {/* skip if already exists */})
  }

  return NextResponse.json({ added: toAdd.length, skipped: bookmarkIds.length - toAdd.length })
}
