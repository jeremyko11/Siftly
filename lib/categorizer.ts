import prisma from '@/lib/db'
import { buildImageContext } from '@/lib/image-context'
import { getCliAvailability, claudePrompt, modelNameToCliAlias } from '@/lib/claude-cli-auth'
import { getCodexCliAvailability, codexPrompt } from '@/lib/codex-cli'
import { getActiveModel, getProvider } from '@/lib/settings'
import { AIClient, resolveAIClient } from '@/lib/ai-client'

const BATCH_SIZE = 20

const DEFAULT_CATEGORIES = [
  {
    name: 'AI & Machine Learning',
    slug: 'ai-resources',
    color: '#8b5cf6',
    description:
      '人工智能、机器学习、LLM大模型、ChatGPT、Claude、Gemini、Grok、Midjourney、Sora、AI Agent、RAG、向量数据库、模型训练、微调、提示词工程、多模态模型、AI安全、AI创业、AI工具、AI应用',
    isAiGenerated: false,
  },
  {
    name: 'Crypto & Web3',
    slug: 'finance-crypto',
    color: '#f59e0b',
    description:
      '加密货币、比特币、以太坊、Solana、DeFi、NFT、链上活动、数字货币交易、山寨币、空投、Memecoin、Web3开发、智能合约、DAO、Layer2、钱包、区块链',
    isAiGenerated: false,
  },
  {
    name: 'Dev Tools & Engineering',
    slug: 'dev-tools',
    color: '#06b6d4',
    description:
      '软件开发、编程、GitHub开源、框架、API、数据库、DevOps、CI/CD、终端工具、调试、系统设计、后端、前端、移动开发、Rust、Go、TypeScript、Python、Docker、Vercel、Supabase',
    isAiGenerated: false,
  },
  {
    name: 'Finance & Investing',
    slug: 'finance-investing',
    color: '#10b981',
    description:
      '股票、基金、宏观经济、美联储、利率、对冲基金、风险投资、私募、房产投资、理财规划、外汇、大宗商品（不含加密货币）',
    isAiGenerated: false,
  },
  {
    name: 'Startups & Business',
    slug: 'startups-business',
    color: '#f97316',
    description:
      '创业、创始人精神、SaaS、产品市场契合、融资、VC、风险投资、增长黑客、B2B营销、销售、收入、Y Combinator、并购、商业战略、副业',
    isAiGenerated: false,
  },
  {
    name: 'News & Politics',
    slug: 'news',
    color: '#6366f1',
    description:
      '新闻时事、美国政治、国际关系、地缘政治、政府政策、选举、科技政策、AI监管、战争冲突、国际新闻、调查报道',
    isAiGenerated: false,
  },
  {
    name: 'Design & Product',
    slug: 'design',
    color: '#ec4899',
    description:
      'UI设计、UX设计、视觉设计、Figma、字体排版、设计系统、动效设计、品牌设计、用户研究、产品策略、线框图、创意工具、色彩理论',
    isAiGenerated: false,
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    color: '#14b8a6',
    description:
      '健身、营养、延寿、生物黑客、睡眠、心理健康、补剂、减肥、力量训练、认知提升、压力管理、冥想、肠道健康、可穿戴设备',
    isAiGenerated: false,
  },
  {
    name: 'Security & Privacy',
    slug: 'security-privacy',
    color: '#ef4444',
    description:
      '网络安全、黑客技术、漏洞利用、OPSEC、隐私保护、VPN、加密技术、威胁情报、社会工程学、网络钓鱼、恶意软件、零日漏洞、CTF、数据泄露',
    isAiGenerated: false,
  },
  {
    name: 'Science & Research',
    slug: 'science-research',
    color: '#3b82f6',
    description:
      '科学研究、学术论文、物理、生物、神经科学、太空探索、气候、化学、医学突破、学术研究、新兴技术、机器人、量子计算、能源',
    isAiGenerated: false,
  },
  {
    name: 'Productivity',
    slug: 'productivity',
    color: '#a855f7',
    description:
      '效率系统、时间管理、习惯养成、专注技巧、笔记方法、双链笔记、深度工作、心智模型、Obsidian、Notion、第二大脑、人生优化、工作流、自动化',
    isAiGenerated: false,
  },
  {
    name: 'Funny & Memes',
    slug: 'funny-memes',
    color: '#eab308',
    description:
      '表情包、笑话、讽刺、幽默、病毒内容、转发抽奖、搞笑截图、段子、恶搞、主要是娱乐或搞笑目的的内容',
    isAiGenerated: false,
  },
  {
    name: 'General',
    slug: 'general',
    color: '#64748b',
    description: '不属于其他分类的综合性内容，尽量少用此分类',
    isAiGenerated: false,
  },
] as const

// Default slugs only used for seeding — all runtime categorization uses DB slugs
const DEFAULT_SLUGS = DEFAULT_CATEGORIES.map((c) => c.slug)

interface BookmarkForCategorization {
  tweetId: string
  text: string
  imageTags?: string
  semanticTags?: string[]
  hashtags?: string[]
  tools?: string[]
  fetchedContent?: string
}

interface CategoryAssignment {
  category: string
  confidence: number
}

interface CategorizationResult {
  tweetId: string
  assignments: CategoryAssignment[]
}

export async function seedDefaultCategories(): Promise<void> {
  const existing = await prisma.category.findMany({ select: { slug: true } })
  const existingSlugs = new Set(existing.map((c) => c.slug))

  for (const cat of DEFAULT_CATEGORIES) {
    if (existingSlugs.has(cat.slug)) {
      // Sync name, color, and description so renames/updates propagate to existing DBs
      await prisma.category.update({
        where: { slug: cat.slug },
        data: { name: cat.name, color: cat.color, description: cat.description },
      })
    } else {
      await prisma.category.create({ data: { ...cat } })
    }
  }
}

function buildCategorizationPrompt(
  bookmarks: BookmarkForCategorization[],
  categoryDescriptions: Record<string, string>,
  allSlugs: string[],
): string {
  const categoriesList = allSlugs.map(
    (slug) => `- ${slug}: ${categoryDescriptions[slug] ?? slug.replace(/-/g, ' ')}`,
  ).join('\n')

  const tweetData = bookmarks.map((b) => {
    const entry: Record<string, unknown> = { id: b.tweetId, text: b.text.slice(0, 400) }
    const imgCtx = buildImageContext(b.imageTags)
    if (imgCtx) entry.images = imgCtx
    if (b.semanticTags?.length) entry.aiTags = b.semanticTags.slice(0, 20).join(', ')
    if (b.hashtags?.length) entry.hashtags = b.hashtags.slice(0, 10).join(', ')
    if (b.tools?.length) entry.tools = b.tools.join(', ')
    if (b.fetchedContent) entry.content = b.fetchedContent.slice(0, 3000)
    return entry
  })

  return `You are an expert librarian categorizing Twitter/X bookmarks into a personal knowledge base. Your categorizations directly power search and discovery.

BOOKMARK CONTENT: Each bookmark entry may include a "content" field — this is the fetched content from external links (articles, YouTube videos, Reddit posts) associated with the bookmark. If present, this content is usually MORE informative than the tweet text alone. Use it as the PRIMARY signal when available.

AVAILABLE CATEGORIES:
${categoriesList}

RULES:
- When a bookmark has a "content" field (fetched external content), use it INSTEAD OF the tweet text as the primary classification signal
- Every bookmark must receive at least ONE category — do NOT leave any bookmark uncategorized
- Assign 1-3 categories per bookmark based on what APPLIES
- If a bookmark discusses AI tools, LLM applications, or AI tech → ai-resources
- If a bookmark mentions code, GitHub, APIs, developer workflows → dev-tools
- If a bookmark is about making money, side projects, SaaS, startup content → startups-business
- If a bookmark is about health, fitness, nutrition, biohacking → health-wellness
- If a bookmark is about security, hacking, privacy tools → security-privacy
- If a bookmark is about finance/investment topics → finance-investing or finance-crypto
- If a bookmark is about news, current events, politics → news
- If a bookmark is about design, UI, product → design
- If a bookmark is about science, research papers → science-research
- If a bookmark is about productivity, habits, time management → productivity
- If a bookmark is humorous, meme-like, or entertaining → funny-memes
- Confidence: 0.9+ for strong signals, 0.7+ for moderate, 0.5+ for weak but present
- Use ALL signals: tweet text, image analysis, hashtags, detected tools, semantic AI tags

Return ONLY valid JSON — no markdown, no explanation. Every bookmark MUST appear in the output with at least one category assignment:
[{
  "tweetId": "123",
  "assignments": [
    {"category": "ai-resources", "confidence": 0.85},
    {"category": "dev-tools", "confidence": 0.62}
  ]
}]

BOOKMARKS:
${JSON.stringify(tweetData, null, 1)}`
}

function parseCategorizationResponse(text: string, validSlugs: Set<string>, tweetIds: string[]): CategorizationResult[] {
  const GENERAL_SLUG = 'general'
  const hasGeneral = validSlugs.has(GENERAL_SLUG)

  // Try multiple strategies to extract JSON array
  let jsonText: string | null = null

  // Strategy 1: standard array match
  const standardMatch = text.match(/\[[\s\S]*\]/)
  if (standardMatch) jsonText = standardMatch[0]

  // Strategy 2: try to find JSON-like objects wrapped in code fences
  if (!jsonText) {
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}\s*)\s*```/)
    if (codeBlockMatch) jsonText = '[' + codeBlockMatch[1] + ']'
  }

  // Strategy 3: try single object format
  if (!jsonText) {
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first !== -1 && last > first) {
      const candidate = '[' + text.slice(first, last + 1) + ']'
      try { JSON.parse(candidate); jsonText = candidate } catch { /* not valid JSON */ }
    }
  }

  if (!jsonText) {
    // No valid JSON found — return general for all bookmarks in this batch
    console.warn('[categorize] No JSON in AI response, falling back to general for', tweetIds.length, 'bookmarks')
    return tweetIds.map((tweetId) => ({
      tweetId,
      assignments: hasGeneral ? [{ category: GENERAL_SLUG, confidence: 0.5 }] : [],
    }))
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    // JSON parse failed — return general for all bookmarks in this batch
    console.warn('[categorize] JSON parse failed, falling back to general for', tweetIds.length, 'bookmarks')
    return tweetIds.map((tweetId) => ({
      tweetId,
      assignments: hasGeneral ? [{ category: GENERAL_SLUG, confidence: 0.5 }] : [],
    }))
  }

  if (!Array.isArray(parsed)) {
    // Not an array — return general for all bookmarks
    return tweetIds.map((tweetId) => ({
      tweetId,
      assignments: hasGeneral ? [{ category: GENERAL_SLUG, confidence: 0.5 }] : [],
    }))
  }

  return (parsed as Record<string, unknown>[]).map((item): CategorizationResult => {
    const tweetId = String(item.tweetId ?? '')
    const rawAssignments = Array.isArray(item.assignments) ? item.assignments : []

    const assignments: CategoryAssignment[] = (rawAssignments as Record<string, unknown>[])
      .map((a) => ({
        category: String(a.category ?? '').trim().toLowerCase().replace(/\s+/g, '-'),
        confidence: typeof a.confidence === 'number' ? Math.min(1, Math.max(0.1, a.confidence)) : 0.7,
      }))
      .filter((a) => validSlugs.has(a.category))

    // If ALL assignments were filtered out (invalid slugs), fall back to 'general'
    // This prevents silent failures where bookmarks are "processed" but get no categories
    if (assignments.length === 0 && hasGeneral) {
      assignments.push({ category: GENERAL_SLUG, confidence: 0.5 })
    }

    return { tweetId, assignments }
  })
}

export async function categorizeBatch(
  bookmarks: BookmarkForCategorization[],
  client: AIClient | null,
  categoryDescriptions: Record<string, string> = {},
  allSlugs: string[] = DEFAULT_SLUGS,
): Promise<CategorizationResult[]> {
  if (bookmarks.length === 0) return []

  const tweetIds = bookmarks.map((b) => b.tweetId)
  const validSlugs = new Set(allSlugs)
  const prompt = buildCategorizationPrompt(bookmarks, categoryDescriptions, allSlugs)
  const provider = await getProvider()

  // Prefer CLI over SDK (avoids OAuth token extraction, uses CLI directly)
  if (provider === 'openai') {
    if (await getCodexCliAvailability()) {
      const result = await codexPrompt(prompt, { timeoutMs: 60_000 })
      if (result.success && result.data) {
        try {
          return parseCategorizationResponse(result.data, validSlugs, tweetIds)
        } catch (parseErr) {
          console.warn('[categorize] Codex CLI response parse failed, falling back to SDK:', parseErr)
        }
      } else {
        console.warn('[categorize] Codex CLI failed, falling back to SDK:', result.error)
      }
    }
  } else {
    if (await getCliAvailability()) {
      const model = await getActiveModel()
      const cliModel = modelNameToCliAlias(model)

      const result = await claudePrompt(prompt, { model: cliModel, timeoutMs: 60_000 })
      if (result.success && result.data) {
        try {
          return parseCategorizationResponse(result.data, validSlugs, tweetIds)
        } catch (parseErr) {
          console.warn('[categorize] CLI response parse failed, falling back to SDK:', parseErr)
        }
      } else {
        console.warn('[categorize] CLI failed, falling back to SDK:', result.error)
      }
    }
  }

  // Fallback to SDK (requires API key)
  if (!client) {
    throw new Error('No CLI available and no API key configured.')
  }

  const model = await getActiveModel()
  const response = await Promise.race([
    client.createMessage({ model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SDK timeout (90s)')), 90_000)),
  ])

  if (!response.text) throw new Error('No text content in AI response')

  return parseCategorizationResponse(response.text, validSlugs, tweetIds)
}

export async function writeCategoryResults(results: CategorizationResult[]): Promise<void> {
  if (results.length === 0) return

  const tweetIds = results.map((r) => r.tweetId).filter(Boolean)
  if (tweetIds.length === 0) return

  // Batch-fetch all categories and bookmarks at once (eliminates N+1 queries)
  const [categories, bookmarks] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.bookmark.findMany({
      where: { tweetId: { in: tweetIds } },
      select: { id: true, tweetId: true },
    }),
  ])

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]))
  const bookmarkByTweetId = new Map(bookmarks.map((b) => [b.tweetId, b.id]))
  const now = new Date()

  // Collect all operations then execute in a single transaction (eliminates sequential await overhead)
  const upsertOps: ReturnType<typeof prisma.bookmarkCategory.upsert>[] = []
  const bookmarkIdsToUpdate: string[] = []

  for (const result of results) {
    if (!result.tweetId || result.assignments.length === 0) continue
    const bookmarkId = bookmarkByTweetId.get(result.tweetId)
    if (!bookmarkId) continue

    for (const { category: slug, confidence } of result.assignments) {
      const categoryId = categoryBySlug.get(slug)
      if (!categoryId) continue
      upsertOps.push(
        prisma.bookmarkCategory.upsert({
          where: { bookmarkId_categoryId: { bookmarkId, categoryId } },
          update: { confidence },
          create: { bookmarkId, categoryId, confidence },
        }),
      )
    }
    bookmarkIdsToUpdate.push(bookmarkId)
  }

  if (upsertOps.length === 0) return

  await prisma.$transaction([
    ...upsertOps,
    prisma.bookmark.updateMany({
      where: { id: { in: bookmarkIdsToUpdate } },
      data: { enrichedAt: now },
    }),
  ])
}

export function mapBookmarkForCategorization(b: {
  tweetId: string
  text: string
  semanticTags: string | null
  entities: string | null
  mediaItems: { imageTags: string | null }[]
  fetchedContent?: string | null
}): BookmarkForCategorization {
  const allImageTags = b.mediaItems
    .map((m) => m.imageTags)
    .filter((t): t is string => t !== null && t !== '')
    .join(' | ')

  let semanticTags: string[] | undefined
  if (b.semanticTags) {
    try { semanticTags = JSON.parse(b.semanticTags) as string[] } catch { /* ignore */ }
  }

  let hashtags: string[] | undefined
  let tools: string[] | undefined
  if (b.entities) {
    try {
      const ent = JSON.parse(b.entities) as { hashtags?: string[]; tools?: string[] }
      hashtags = ent.hashtags
      tools = ent.tools
    } catch { /* ignore */ }
  }

  return {
    tweetId: b.tweetId,
    text: b.text,
    imageTags: allImageTags || undefined,
    semanticTags,
    hashtags,
    tools,
    fetchedContent: b.fetchedContent ?? undefined,
  }
}

export const BOOKMARK_SELECT = {
  id: true,
  tweetId: true,
  text: true,
  semanticTags: true,
  entities: true,
  fetchedContent: true,
  mediaItems: { select: { imageTags: true } },
} as const

export async function categorizeAll(
  bookmarkIds: string[],
  onProgress?: (done: number, total: number) => void,
  force = false,
  shouldAbort?: () => boolean,
): Promise<void> {
  await seedDefaultCategories()

  // Resolve auth once — avoids re-resolving inside every batch call
  const provider = await getProvider()
  const keyName = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey'
  const apiKeySetting = await prisma.setting.findUnique({ where: { key: keyName } })
  let client: AIClient | null = null
  try {
    client = await resolveAIClient({ dbKey: apiKeySetting?.value })
  } catch {
    // CLI might still work — client stays null
  }

  // Load ALL categories (default + custom) for the prompt
  const dbCategories = await prisma.category.findMany({ select: { slug: true, name: true, description: true } })
  const allSlugs = dbCategories.map((c) => c.slug)
  const categoryDescriptions = Object.fromEntries(
    dbCategories.map((c) => [c.slug, c.description?.trim() || c.name]),
  )

  // Get total count for progress reporting (without loading all rows)
  let total = 0
  if (bookmarkIds.length > 0) {
    total = bookmarkIds.length
  } else if (force) {
    total = await prisma.bookmark.count()
  } else {
    total = await prisma.bookmark.count({ where: { enrichedAt: null } })
  }

  let done = 0

  if (bookmarkIds.length > 0) {
    // Specific bookmark IDs — fetch in BATCH_SIZE chunks
    for (let i = 0; i < bookmarkIds.length; i += BATCH_SIZE) {
      if (shouldAbort?.()) break
      const batchIds = bookmarkIds.slice(i, i + BATCH_SIZE)
      const rows = await prisma.bookmark.findMany({
        where: { id: { in: batchIds } },
        select: BOOKMARK_SELECT,
      })
      const batch = rows.map(mapBookmarkForCategorization)
      try {
        const results = await categorizeBatch(batch, client, categoryDescriptions, allSlugs)
        await writeCategoryResults(results)
      } catch (err) {
        console.error(`Error categorizing batch at index ${i}:`, err)
      }
      done = Math.min(i + BATCH_SIZE, total)
      onProgress?.(done, total)
    }
  } else {
    // Cursor-based pagination — never loads all bookmarks into memory
    let cursor: string | undefined
    const where = force ? {} : { enrichedAt: null }

    while (true) {
      if (shouldAbort?.()) break

      const rows = await prisma.bookmark.findMany({
        where: { ...where, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        select: BOOKMARK_SELECT,
      })

      if (rows.length === 0) break
      cursor = rows[rows.length - 1].id

      const batch = rows.map(mapBookmarkForCategorization)
      try {
        const results = await categorizeBatch(batch, client, categoryDescriptions, allSlugs)
        await writeCategoryResults(results)
      } catch (err) {
        console.error('Error categorizing batch:', err)
      }

      done += rows.length
      onProgress?.(Math.min(done, total), total)

      if (rows.length < BATCH_SIZE) break
    }
  }
}
