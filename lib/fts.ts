/**
 * SQLite FTS5 virtual table for fast full-text search across bookmarks.
 * FTS5 uses Porter stemming and tokenization — much faster than LIKE '%keyword%' table scans.
 *
 * The table is rebuilt after enrichment runs. At search time it provides ranked ID lists
 * that replace the LIKE-based keyword conditions in the search route.
 */

import prisma from '@/lib/db'

const FTS_TABLE = 'bookmark_fts'

export async function ensureFtsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE} USING fts5(
      bookmark_id UNINDEXED,
      text,
      semantic_tags,
      entities,
      image_tags,
      tokenize='porter unicode61'
    )
  `)
}

// ─── Last-sync tracking ────────────────────────────────────────────────────────

const FTS_LAST_SYNC_KEY = 'fts_last_sync'

/** Get the timestamp of the last full FTS rebuild, or null if never run. */
export async function getFtsLastSync(): Promise<Date | null> {
  const setting = await prisma.setting.findUnique({ where: { key: FTS_LAST_SYNC_KEY } })
  if (!setting) return null
  const ms = parseInt(setting.value, 10)
  return isNaN(ms) ? null : new Date(ms)
}

/** Record that a full FTS rebuild completed at `date`. */
export async function setFtsLastSync(date: Date): Promise<void> {
  await prisma.setting.upsert({
    where: { key: FTS_LAST_SYNC_KEY },
    update: { value: String(date.getTime()) },
    create: { key: FTS_LAST_SYNC_KEY, value: String(date.getTime()) },
  })
}

// ─── Rebuild ──────────────────────────────────────────────────────────────────

/**
 * Rebuild the FTS5 table.
 *
 * - Full rebuild (no `since`): DELETEs all rows, inserts every bookmark, updates `fts_last_sync`.
 * - Incremental rebuild (`since` provided): DELETEs only rows for bookmarks imported after `since`,
 *   then inserts only those bookmarks. Does NOT update `fts_last_sync` — the caller should only
 *   call this when `since` is from a previous full rebuild, so the timestamp stays accurate.
 *
 * Call after import or enrichment runs. Idempotent.
 */
export async function rebuildFts(since?: Date): Promise<void> {
  await ensureFtsTable()

  const bookmarks = await prisma.bookmark.findMany({
    where: since ? { importedAt: { gt: since } } : undefined,
    select: {
      id: true,
      text: true,
      semanticTags: true,
      entities: true,
      mediaItems: { select: { imageTags: true } },
    },
  })

  if (bookmarks.length === 0) return

  if (since) {
    // Incremental: delete rows for the bookmarks we're about to re-insert
    const ids = bookmarks.map((b) => b.id)
    await prisma.$executeRawUnsafe(
      `DELETE FROM ${FTS_TABLE} WHERE bookmark_id IN (${ids.map(() => '?').join(',')})`,
      ...ids,
    )
  } else {
    // Full rebuild: clear everything first
    await prisma.$executeRawUnsafe(`DELETE FROM ${FTS_TABLE}`)
  }

  // Insert in batches of 200 to stay within SQLite variable limits
  const BATCH = 200
  for (let i = 0; i < bookmarks.length; i += BATCH) {
    const batch = bookmarks.slice(i, i + BATCH)
    await prisma.$transaction(
      batch.map((b) => {
        const imageTagsText = b.mediaItems
          .map((m) => m.imageTags ?? '')
          .filter(Boolean)
          .join(' ')
        return prisma.$executeRaw`
          INSERT INTO bookmark_fts(bookmark_id, text, semantic_tags, entities, image_tags)
          VALUES (${b.id}, ${b.text}, ${b.semanticTags ?? ''}, ${b.entities ?? ''}, ${imageTagsText})
        `
      }),
    )
  }

  if (!since) {
    await setFtsLastSync(new Date())
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

/** Result entry: FTS5 bookmark ID plus a highlighted text snippet. */
export interface FtsSearchResult {
  id: string
  /** Original text with matched terms wrapped in <mark>…</mark>. */
  highlight: string
}

/**
 * Search FTS5 table for bookmarks matching the given keywords.
 * Returns results ordered by relevance rank, each with a <mark>-wrapped highlight snippet.
 * Returns [] on error (caller should fall back to LIKE queries).
 */
export async function ftsSearch(keywords: string[]): Promise<FtsSearchResult[]> {
  if (keywords.length === 0) return []

  try {
    await ensureFtsTable()

    // Sanitize each keyword: remove FTS5 special chars
    const terms = keywords
      .map((kw) => kw.replace(/["*()]/g, ' ').trim())
      .filter((kw) => kw.length >= 2)

    if (terms.length === 0) return []

    const matchQuery = terms.join(' OR ')

    const results = await prisma.$queryRaw<{ bookmark_id: string }[]>`
      SELECT bookmark_id FROM bookmark_fts
      WHERE bookmark_fts MATCH ${matchQuery}
      ORDER BY rank
      LIMIT 150
    `

    if (results.length === 0) return []

    // Fetch original texts so we can build highlights from the actual bookmark content
    const ids = results.map((r) => r.bookmark_id)
    const bookmarks = await prisma.bookmark.findMany({
      where: { id: { in: ids } },
      select: { id: true, text: true, semanticTags: true, entities: true },
    })
    const bookmarkMap = new Map(bookmarks.map((b) => [b.id, b]))

    return results
      .map((r) => {
        const b = bookmarkMap.get(r.bookmark_id)
        if (!b) return null
        const textToHighlight = b.text
        const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
        const highlight = textToHighlight.replace(pattern, '<mark>$1</mark>')
        return { id: r.bookmark_id, highlight }
      })
      .filter((r): r is FtsSearchResult => r !== null)
  } catch {
    // FTS table may not be populated yet or query has syntax error — fall back gracefully
    return []
  }
}
