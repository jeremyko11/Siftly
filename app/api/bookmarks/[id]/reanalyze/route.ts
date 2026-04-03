import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { analyzeItem } from '@/lib/vision-analyzer'
import { categorizeBatch } from '@/lib/categorizer'
import { resolveAIClient } from '@/lib/ai-client'
import { getActiveModel, getProvider } from '@/lib/settings'

// POST /api/bookmarks/[id]/reanalyze
// Re-run AI analysis on a single bookmark (vision + enrichment + categorization)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch the bookmark with media items and categories
  const bookmark = await prisma.bookmark.findUnique({
    where: { id },
    include: {
      mediaItems: true,
      categories: { include: { category: true } },
    },
  })

  if (!bookmark) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 })
  }

  const errors: string[] = []

  // ── Step 1: Vision analysis for media items ────────────────────────────────
  if (bookmark.mediaItems.length > 0) {
    const provider = await getProvider()
    const model = await getActiveModel()
    const apiKeySetting = await prisma.setting.findUnique({
      where: { key: provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey' },
    })
    const apiKey = apiKeySetting?.value?.trim() ?? ''
    const client = await resolveAIClient({ dbKey: apiKey }).catch(() => null)

    for (const media of bookmark.mediaItems) {
      try {
        await analyzeItem(
          { id: media.id, url: media.url, thumbnailUrl: media.thumbnailUrl, type: media.type },
          client,
          model,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Media ${media.id}: ${msg}`)
      }
    }
  }

  // ── Step 2: Re-categorize ──────────────────────────────────────────────────
  try {
    // Get all category descriptions for the prompt
    const categories = await prisma.category.findMany()
    const categoryDescriptions: Record<string, string> = {}
    for (const cat of categories) {
      categoryDescriptions[cat.slug] = cat.description ?? cat.name
    }
    const allSlugs = categories.map((c) => c.slug)

    // Parse entities
    let entities: { hashtags?: string[]; tools?: string[] } = {}
    try {
      if (bookmark.entities) entities = JSON.parse(bookmark.entities)
    } catch { /* ignore */ }

    // Parse semantic tags
    let semanticTags: string[] = []
    try {
      if (bookmark.semanticTags) semanticTags = JSON.parse(bookmark.semanticTags)
    } catch { /* ignore */ }

    // Parse fetched content
    let fetchedContent: string | undefined
    try {
      if (bookmark.fetchedContent) {
        const parsed = JSON.parse(bookmark.fetchedContent)
        fetchedContent = Object.values(parsed).join('\n').slice(0, 3000)
      }
    } catch { /* ignore */ }

    const provider = await getProvider()
    const model = await getActiveModel()
    const apiKeySetting = await prisma.setting.findUnique({
      where: { key: provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey' },
    })
    const apiKey = apiKeySetting?.value?.trim() ?? ''
    const client = await resolveAIClient({ dbKey: apiKey }).catch(() => null)

    const results = await categorizeBatch(
      [{
        tweetId: bookmark.tweetId,
        text: bookmark.text,
        imageTags: bookmark.mediaItems[0]?.imageTags ?? undefined,
        semanticTags,
        hashtags: entities.hashtags,
        tools: entities.tools,
        fetchedContent,
      }],
      client,
      categoryDescriptions,
      allSlugs,
    )

    const result = results[0]
    if (result && result.assignments.length > 0) {
      // Replace all existing category assignments
      await prisma.bookmarkCategory.deleteMany({ where: { bookmarkId: id } })

      for (const assignment of result.assignments) {
        const category = categories.find((c) => c.slug === assignment.category)
        if (category) {
          await prisma.bookmarkCategory.create({
            data: { bookmarkId: id, categoryId: category.id, confidence: assignment.confidence },
          })
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Categorization: ${msg}`)
  }

  // ── Step 3: Update enrichedAt timestamp ────────────────────────────────────
  await prisma.bookmark.update({
    where: { id },
    data: { enrichedAt: new Date() },
  })

  // Fetch updated bookmark
  const updated = await prisma.bookmark.findUnique({
    where: { id },
    include: {
      mediaItems: true,
      categories: { include: { category: true } },
    },
  })

  return NextResponse.json({
    bookmark: updated,
    errors: errors.length > 0 ? errors : undefined,
    reanalyzedAt: new Date().toISOString(),
  })
}
