import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST: Batch categorize bookmarks
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { ids?: string[]; categoryId?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { ids = [], categoryId } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  if (!categoryId || typeof categoryId !== 'string') {
    return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
  }

  // Validate categoryId exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  })

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  // Validate all bookmark IDs exist
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

  // Upsert BookmarkCategory entries in a transaction
  try {
    await prisma.$transaction(
      ids.map((bookmarkId) =>
        prisma.bookmarkCategory.upsert({
          where: {
            bookmarkId_categoryId: {
              bookmarkId,
              categoryId,
            },
          },
          update: { confidence: 1.0 },
          create: {
            bookmarkId,
            categoryId,
            confidence: 1.0,
          },
        })
      )
    )

    return NextResponse.json({ updated: ids.length })
  } catch (err) {
    console.error('Batch categorize error:', err)
    return NextResponse.json(
      { error: `Failed to categorize bookmarks: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
