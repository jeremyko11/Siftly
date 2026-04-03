import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { calculateNextReview, qualityFromButton } from '@/lib/spaced-repetition'

// POST /api/review/[bookmarkId] - Submit a review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookmarkId: string }> }
) {
  const { bookmarkId } = await params

  let body: { quality?: number; button?: 'again' | 'hard' | 'good' } = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { quality, button } = body

  // Resolve quality from button or direct value
  let q: number
  if (button !== undefined) {
    q = qualityFromButton(button)
  } else if (quality !== undefined) {
    q = Math.max(0, Math.min(5, quality))
  } else {
    return NextResponse.json({ error: 'quality or button required' }, { status: 400 })
  }

  const schedule = await prisma.reviewSchedule.findUnique({
    where: { bookmarkId },
  })

  if (!schedule) {
    return NextResponse.json({ error: 'Bookmark not in review queue' }, { status: 404 })
  }

  const result = calculateNextReview(
    q,
    schedule.interval,
    schedule.easeFactor,
    schedule.repetitions
  )

  const updated = await prisma.reviewSchedule.update({
    where: { bookmarkId },
    data: {
      interval: result.interval,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
      nextReviewAt: result.nextReviewAt,
      lastReviewAt: new Date(),
    },
  })

  return NextResponse.json({
    bookmarkId,
    interval: updated.interval,
    easeFactor: updated.easeFactor,
    repetitions: updated.repetitions,
    nextReviewAt: updated.nextReviewAt.toISOString(),
    quality: q,
  })
}

// DELETE /api/review/[bookmarkId] - Remove from review queue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookmarkId: string }> }
) {
  const { bookmarkId } = await params

  await prisma.reviewSchedule.deleteMany({ where: { bookmarkId } })

  return NextResponse.json({ removed: bookmarkId })
}
