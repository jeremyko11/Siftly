import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST: Batch delete bookmarks
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { ids?: string[] } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { ids = [] } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  // Validate all IDs exist first
  const existingBookmarks = await prisma.bookmark.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })

  const existingIds = new Set(existingBookmarks.map((b) => b.id))
  const missingIds = ids.filter((id) => !existingIds.has(id))

  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: `Bookmarks not found: ${missingIds.join(', ')}` },
      { status: 404 }
    )
  }

  // Delete all in a single transaction
  try {
    await prisma.$transaction([
      prisma.bookmarkCategory.deleteMany({ where: { bookmarkId: { in: ids } } }),
      prisma.mediaItem.deleteMany({ where: { bookmarkId: { in: ids } } }),
      prisma.bookmarkRepo.deleteMany({ where: { bookmarkId: { in: ids } } }),
      prisma.bookmark.deleteMany({ where: { id: { in: ids } } }),
    ])

    return NextResponse.json({ deleted: ids.length })
  } catch (err) {
    console.error('Batch delete error:', err)
    return NextResponse.json(
      { error: `Failed to delete bookmarks: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
