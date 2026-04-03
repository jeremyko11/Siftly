import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/review/stats - Review statistics
export async function GET() {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const [
    totalScheduled,
    dueToday,
    upcoming,
    completedToday,
    avgEaseFactor,
  ] = await Promise.all([
    prisma.reviewSchedule.count(),
    prisma.reviewSchedule.count({ where: { nextReviewAt: { lte: now } } }),
    prisma.reviewSchedule.count({ where: { nextReviewAt: { gt: now } } }),
    prisma.reviewSchedule.count({
      where: {
        lastReviewAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.reviewSchedule.aggregate({
      _avg: { easeFactor: true },
    }),
  ])

  return NextResponse.json({
    totalScheduled,
    dueToday,
    upcoming,
    completedToday,
    avgEaseFactor: avgEaseFactor._avg.easeFactor ?? 2.5,
  })
}
