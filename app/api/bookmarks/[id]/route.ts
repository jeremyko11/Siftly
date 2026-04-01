import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET: Fetch single bookmark
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params

  try {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id },
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
    })

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 })
    }

    return NextResponse.json({ bookmark })
  } catch (err) {
    console.error('Bookmark fetch error:', err)
    return NextResponse.json(
      { error: `Failed to fetch bookmark: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

// DELETE: Delete single bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params

  try {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 })
    }

    await prisma.bookmark.delete({ where: { id } })

    return NextResponse.json({ deleted: 1 })
  } catch (err) {
    console.error('Bookmark delete error:', err)
    return NextResponse.json(
      { error: `Failed to delete bookmark: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
