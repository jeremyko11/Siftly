import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import JSZip from 'jszip'

// GET /api/export/obsidian?category=ai-resources&format=zip
// Exports bookmarks in Obsidian-friendly markdown format
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const categorySlug = searchParams.get('category') ?? undefined
  const format = searchParams.get('format') ?? 'zip'

  const where = categorySlug
    ? { categories: { some: { category: { slug: categorySlug } } } }
    : {}

  const bookmarks = await prisma.bookmark.findMany({
    where,
    include: {
      categories: { include: { category: true } },
      mediaItems: true,
    },
    orderBy: { importedAt: 'desc' },
  })

  if (bookmarks.length === 0) {
    return NextResponse.json({ error: 'No bookmarks to export' }, { status: 404 })
  }

  // Parse semantic tags for each bookmark
  async function getSemanticTags(bookmark: typeof bookmarks[number]): Promise<string[]> {
    if (!bookmark.semanticTags) return []
    try { return JSON.parse(bookmark.semanticTags) as string[] } catch { return [] }
  }

  // Build markdown file content for a single bookmark
  function buildMarkdown(bookmark: typeof bookmarks[number], tags: string[]): string {
    const categories = bookmark.categories.map((bc) => bc.category.slug)
    const hashtags = bookmark.entities
      ? (() => {
          try { return (JSON.parse(bookmark.entities) as { hashtags?: string[] }).hashtags ?? [] } catch { return [] }
        })()
      : []

    const allTags = [...new Set([...categories, ...tags, ...hashtags.map((h: string) => h.replace(/^#/, ''))])]

    const frontmatter = [
      '---',
      `tweetId: "${bookmark.tweetId}"`,
      `author: "@${bookmark.authorHandle}"`,
      `authorName: "${bookmark.authorName.replace(/"/g, '\\"')}"`,
      bookmark.tweetCreatedAt ? `tweetDate: "${bookmark.tweetCreatedAt.toISOString()}"` : null,
      `importedAt: "${bookmark.importedAt.toISOString()}"`,
      `source: "${bookmark.source}"`,
      `url: "https://x.com/${bookmark.authorHandle}/status/${bookmark.tweetId}"`,
      allTags.length > 0 ? `tags:\n${allTags.map((t: string) => `  - ${t}`).join('\n')}` : null,
      categories.length > 0 ? `categories: [${categories.map((c) => `"${c}"`).join(', ')}]` : null,
      bookmark.enrichmentMeta
        ? (() => {
            try {
              const meta = JSON.parse(bookmark.enrichmentMeta)
              if (meta.sentiment) return `sentiment: "${meta.sentiment}"`
              return null
            } catch { return null }
          })()
        : null,
      '---',
      '',
    ].filter(Boolean).join('\n')

    const sections: string[] = []

    // Title block
    sections.push(`# Tweet by @${bookmark.authorHandle}\n`)

    // Metadata line
    const metaParts: string[] = [`[@${bookmark.authorHandle}](https://x.com/${bookmark.authorHandle})`]
    if (bookmark.tweetCreatedAt) {
      metaParts.push(bookmark.tweetCreatedAt.toLocaleDateString())
    }
    if (categories.length > 0) {
      metaParts.push(categories.map((c: string) => `[[${c}]]`).join(' '))
    }
    sections.push(`> ${metaParts.join(' · ')}\n`)

    // Tweet text
    sections.push(`## ${bookmark.text}\n`)

    // Media (if any)
    if (bookmark.mediaItems.length > 0) {
      sections.push('### Media\n')
      for (const media of bookmark.mediaItems) {
        if (media.type === 'photo') {
          sections.push(`![${media.type}](${media.url})\n`)
        } else {
          sections.push(`[${media.type}](${media.url})\n`)
        }
      }
    }

    // Fetched content (external link content)
    if (bookmark.fetchedContent) {
      try {
        const fetched = JSON.parse(bookmark.fetchedContent) as Record<string, string>
        for (const [url, content] of Object.entries(fetched)) {
          if (content) {
            sections.push(`### Content from ${url}\n`)
            sections.push(`${content.slice(0, 2000)}\n`)
          }
        }
      } catch { /* ignore */ }
    }

    // Hashtags
    if (hashtags.length > 0) {
      sections.push(`### Hashtags\n${hashtags.join(' ')}\n`)
    }

    // Link
    sections.push(`\n---\n[View on X](https://x.com/${bookmark.authorHandle}/status/${bookmark.tweetId})`)

    return frontmatter + sections.join('\n')
  }

  // Group bookmarks by primary category
  const byCategory = new Map<string, typeof bookmarks>()
  for (const bookmark of bookmarks) {
    const primaryCat = bookmark.categories[0]?.category.slug ?? 'uncategorized'
    if (!byCategory.has(primaryCat)) byCategory.set(primaryCat, [])
    byCategory.get(primaryCat)!.push(bookmark)
  }

  if (format === 'json') {
    // Return JSON with all bookmarks formatted for Obsidian
    const result = await Promise.all(
      bookmarks.map(async (b) => {
        const tags = await getSemanticTags(b)
        const categories = b.categories.map((bc) => bc.category.slug)
        return {
          slug: b.tweetId,
          frontmatter: {
            tweetId: b.tweetId,
            author: b.authorHandle,
            authorName: b.authorName,
            tweetDate: b.tweetCreatedAt?.toISOString(),
            importedAt: b.importedAt.toISOString(),
            source: b.source,
            url: `https://x.com/${b.authorHandle}/status/${b.tweetId}`,
            categories,
            tags,
          },
          content: b.text,
          hashtags: (() => { try { return (JSON.parse(b.entities ?? '{}') as { hashtags?: string[] }).hashtags ?? [] } catch { return [] } })(),
          categories,
        }
      }),
    )
    return NextResponse.json({ bookmarks: result, count: bookmarks.length })
  }

  // Default: ZIP with markdown files organized by category
  const zip = new JSZip()

  for (const [catSlug, catBookmarks] of byCategory) {
    const folder = zip.folder(catSlug)!

    for (const bookmark of catBookmarks) {
      const tags = await getSemanticTags(bookmark)
      // Sanitize filename
      const safeName = bookmark.tweetId.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `${safeName}.md`
      folder.file(filename, buildMarkdown(bookmark, tags))
    }
  }

  // Add a README
  zip.file(
    'README.md',
    `# Siftly Obsidian Export

Exported ${bookmarks.length} bookmarks from Siftly.

## Categories

${Array.from(byCategory.keys()).map((cat) => `- [[${cat}]] (${byCategory.get(cat)!.length} notes)`).join('\n')}

## How to Use

1. Copy this folder to your Obsidian vault
2. Each .md file is a tweet/bookmark with YAML frontmatter
3. Categories are folders and tags in frontmatter
4. Run the [[${categorySlug ?? 'all'}]] filter in Obsidian to browse by category

Generated by Siftly - ${new Date().toLocaleDateString()}
`,
  )

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const filename = categorySlug ? `siftly-${categorySlug}.zip` : 'siftly-obsidian.zip'

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
