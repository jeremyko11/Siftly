import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveAIClient } from '@/lib/ai-client'
import { getProvider } from '@/lib/settings'
import type { Repo, ReposResponse } from '@/lib/types'

const ANALYSIS_PROMPT = `You are a senior software engineer analyzing a GitHub repository README.

Extract the following in strict JSON format:

{
  "features": [
    { "title": "Feature name (max 5 words)", "description": "2-3 sentence description of what it does and how it works" }
  ],
  "useCases": [
    { "scenario": "Use case title", "description": "When and why to use this" }
  ],
  "techStack": ["list of main technologies, frameworks, languages used"],
  "summary": "1-2 sentence summary accessible to a technical but non-expert audience"
}

Rules:
- Extract 3-7 most important features
- Focus on practical use cases, not marketing language
- techStack: 3-8 items max
- Return ONLY valid JSON, no markdown, no explanation`

const TRANSLATION_PROMPT = `You are a professional translator. Translate the following JSON analysis result from English to Chinese (Simplified Chinese, zh-CN).

The JSON has this exact structure:
{
  "features": [{ "title": "string", "description": "string" }],
  "useCases": [{ "scenario": "string", "description": "string" }],
  "summary": "string"
}

Rules:
- Translate ALL field values (titles, descriptions, scenarios, summary text) to Chinese
- Keep the JSON structure identical
- Return ONLY valid JSON, no markdown, no explanation`

function extractJson(text: string): string {
  const standardMatch = text.match(/\{[\s\S]*\}/)
  if (standardMatch) return standardMatch[0]
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last > first) return text.slice(first, last + 1)
  throw new Error('No JSON found')
}

async function callAI(client: { createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }> }, model: string, prompt: string, text: string): Promise<Record<string, unknown>> {
  const response = await Promise.race([
    client.createMessage({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: `${prompt}\n\n${text}` }],
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI timeout (60s)')), 60_000)
    ),
  ])
  return JSON.parse(extractJson(response.text.trim()))
}

async function runRepoAnalysis(repoId: string, readmeContent: string): Promise<void> {
  try {
    const provider = await getProvider()
    const keyName = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey'
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: keyName } })
    const client = await resolveAIClient({ dbKey: apiKeySetting?.value })

    const model = provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514'
    const text = readmeContent.slice(0, 8000)

    const aiClient = client as {
      createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }>
    }

    // Step 1: Generate English analysis
    const parsed = await callAI(aiClient, model, ANALYSIS_PROMPT, `README:\n${text}`)

    const analysis = {
      features: Array.isArray(parsed.features) ? parsed.features : [],
      useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    }

    // Step 2: Translate to Chinese
    const zhParsed = await callAI(aiClient, model, TRANSLATION_PROMPT, JSON.stringify({
      features: analysis.features,
      useCases: analysis.useCases,
      summary: analysis.summary,
    }))

    const zhAnalysis = {
      features: Array.isArray(zhParsed.features) ? zhParsed.features : [],
      useCases: Array.isArray(zhParsed.useCases) ? zhParsed.useCases : [],
      summary: typeof zhParsed.summary === 'string' ? zhParsed.summary : '',
    }

    await prisma.repo.update({
      where: { id: repoId },
      data: {
        features: JSON.stringify(analysis.features),
        useCases: JSON.stringify(analysis.useCases),
        techStack: JSON.stringify(analysis.techStack),
        summary: analysis.summary,
        featuresZh: JSON.stringify(zhAnalysis.features),
        useCasesZh: JSON.stringify(zhAnalysis.useCases),
        summaryZh: zhAnalysis.summary,
        readmeAnalyzedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('[repos] analysis failed for', repoId, ':', err)
  }
}

// Translate existing English analysis to Chinese (no re-analysis needed)
async function translateToChinese(
  aiClient: { createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }> },
  model: string,
  features: string,
  useCases: string,
  summary: string,
): Promise<{ featuresZh: unknown[]; useCasesZh: unknown[]; summaryZh: string }> {
  const parsed = JSON.parse(JSON.stringify({ features, useCases, summary }))
  const zhParsed = await callAI(aiClient, model, TRANSLATION_PROMPT, JSON.stringify({
    features: Array.isArray(parsed.features) ? parsed.features : [],
    useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  }))
  return {
    featuresZh: Array.isArray(zhParsed.features) ? zhParsed.features : [],
    useCasesZh: Array.isArray(zhParsed.useCases) ? zhParsed.useCases : [],
    summaryZh: typeof zhParsed.summary === 'string' ? zhParsed.summary : '',
  }
}

// Translate with retry on rate limit (429)
async function translateWithRetry(
  aiClient: { createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }> },
  model: string,
  features: string,
  useCases: string,
  summary: string,
  retries = 3,
): Promise<{ featuresZh: unknown[]; useCasesZh: unknown[]; summaryZh: string }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await translateToChinese(aiClient, model, features, useCases, summary)
    } catch (err) {
      const isRateLimit = err instanceof Error && (
        err.message.includes('rate_limit') ||
        err.message.includes('429') ||
        err.message.includes('retry') ||
        err.message.includes('稍后重试')
      )
      if (isRateLimit && attempt < retries - 1) {
        const delay = (attempt + 1) * 2000
        console.warn(`[repos] rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}

// Background translation — one repo at a time with delay to avoid rate limits
async function runBackgroundTranslation(
  repos: { id: string; fullName: string; features: string | null; useCases: string | null; summary: string | null }[],
) {
  try {
    const provider = await getProvider()
    const keyName = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey'
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: keyName } })
    const client = await resolveAIClient({ dbKey: apiKeySetting?.value })
    const model = provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514'
    const aiClient = client as { createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }> }

    for (const r of repos) {
      if (!r.features) continue
      // Check if already translated by a previous batch
      const existing = await prisma.repo.findUnique({ where: { id: r.id }, select: { featuresZh: true } })
      if (existing?.featuresZh) continue

      try {
        const zh = await translateWithRetry(aiClient, model, r.features, r.useCases ?? '[]', r.summary ?? '')
        await prisma.repo.update({
          where: { id: r.id },
          data: {
            featuresZh: JSON.stringify(zh.featuresZh),
            useCasesZh: JSON.stringify(zh.useCasesZh),
            summaryZh: zh.summaryZh,
          },
        })
        console.log(`[repos] translated background: ${r.fullName}`)
      } catch (err) {
        console.warn(`[repos] background translation failed for ${r.fullName}:`, err)
      }

      // Delay between repos to avoid rate limit
      await new Promise((r) => setTimeout(r, 1500))
    }
  } catch (err) {
    console.error('[repos] background translation error:', err)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      owner: string
      repo: string
      description?: string | null
      url?: string
      stars?: number
      language?: string | null
      topics?: string[]
      readmeContent?: string | null
      analysis?: {
        summary: string
        features: { title: string; description: string }[]
        useCases: { scenario: string; description: string }[]
        techStack: string[]
      } | null
      analysisZh?: {
        summary: string
        features: { title: string; description: string }[]
        useCases: { scenario: string; description: string }[]
      } | null
    }
    const { owner, repo: repoName, description, url, stars, language, topics, readmeContent, analysis, analysisZh } = body

    if (!owner || !repoName) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
    }

    const existing = await prisma.repo.findUnique({
      where: { fullName: `${owner}/${repoName}` },
    })
    if (existing) {
      return NextResponse.json({ repo: existing, alreadyExists: true })
    }

    const saved = await prisma.repo.create({
      data: {
        owner,
        name: repoName,
        fullName: `${owner}/${repoName}`,
        description: description ?? null,
        url: url ?? `https://github.com/${owner}/${repoName}`,
        stars: stars ?? 0,
        language: language ?? null,
        topics: JSON.stringify(topics ?? []),
        readmeContent: readmeContent ?? null,
        features: analysis?.features ? JSON.stringify(analysis.features) : null,
        useCases: analysis?.useCases ? JSON.stringify(analysis.useCases) : null,
        techStack: analysis?.techStack ? JSON.stringify(analysis.techStack) : null,
        summary: analysis?.summary ?? null,
        featuresZh: analysisZh?.features ? JSON.stringify(analysisZh.features) : null,
        useCasesZh: analysisZh?.useCases ? JSON.stringify(analysisZh.useCases) : null,
        summaryZh: analysisZh?.summary ?? null,
        readmeAnalyzedAt: analysis ? new Date() : null,
      },
    })

    // Auto-analyze if no analysis provided and has readme content
    if (!analysis && readmeContent && readmeContent.trim().length > 100) {
      void runRepoAnalysis(saved.id, readmeContent)
    }

    return NextResponse.json({ repo: saved, alreadyExists: false })
  } catch (err) {
    console.error('POST /api/repos error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add repo' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim() ?? ''
    const language = searchParams.get('language')?.trim() ?? ''
    const sort = searchParams.get('sort') ?? 'stars'

    const where: Record<string, unknown> = {}
    if (language) where.language = language
    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { description: { contains: q } },
        { name: { contains: q } },
      ]
    }

    const orderBy =
      sort === 'stars' ? { stars: 'desc' as const }
      : sort === 'updated' ? { importedAt: 'desc' as const }
      : { fullName: 'asc' as const }

    const [repos, total, analyzedCount] = await Promise.all([
      prisma.repo.findMany({
        select: {
          id: true, owner: true, name: true, fullName: true,
          description: true, url: true, stars: true, language: true,
          topics: true,
          features: true, useCases: true, techStack: true, summary: true,
          featuresZh: true, useCasesZh: true, summaryZh: true,
          readmeAnalyzedAt: true, importedAt: true,
        },
        where,
        orderBy,
        take: 200,
      }),
      prisma.repo.count({ where }),
      prisma.repo.count({ where: { features: { not: null } } }),
    ])

    // Auto-analyze unanalyzed repos with readme content (fire-and-forget)
    const unanalyzed = repos.filter((r) => !r.features)
    if (unanalyzed.length > 0) {
      void Promise.all(unanalyzed.map((r) => runRepoAnalysis(r.id, '')))
    }

    // Translate existing English analysis to Chinese — do synchronously for a batch so
    // the current page load gets Chinese data; remaining repos are fire-and-forget
    const needsZh = repos.filter((r) => r.features && !r.featuresZh)
    if (needsZh.length > 0) {
      // Only do 1 repo synchronously per request to avoid rate limits; rest are background
      const syncBatch = needsZh.slice(0, 1)
      const asyncBatch = needsZh.slice(1)

      // Kick off background translation for remaining repos (one at a time with delay)
      if (asyncBatch.length > 0) {
        void runBackgroundTranslation(asyncBatch)
      }

      // Translate 1 repo synchronously so response includes Chinese data this page load
      try {
        const provider = await getProvider()
        const keyName = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey'
        const apiKeySetting = await prisma.setting.findUnique({ where: { key: keyName } })
        const client = await resolveAIClient({ dbKey: apiKeySetting?.value })
        const model = provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514'
        const aiClient = client as { createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }> }

        const r = syncBatch[0]!
        const zh = await translateWithRetry(aiClient, model, r.features!, r.useCases ?? '[]', r.summary ?? '')
        await prisma.repo.update({
          where: { id: r.id },
          data: {
            featuresZh: JSON.stringify(zh.featuresZh),
            useCasesZh: JSON.stringify(zh.useCasesZh),
            summaryZh: zh.summaryZh,
          },
        })
        // Patch into the raw repo object so formatted response gets Chinese
        ;(r as Record<string, unknown>).featuresZh = JSON.stringify(zh.featuresZh)
        ;(r as Record<string, unknown>).useCasesZh = JSON.stringify(zh.useCasesZh)
        ;(r as Record<string, unknown>).summaryZh = zh.summaryZh
      } catch (err) {
        console.warn('[repos GET] sync translation failed for', syncBatch[0]?.fullName, ':', err)
      }
    }

    const formatted: Repo[] = repos.map((r): Repo => {
      let features = null
      let useCases = null
      let techStack: string[] | null = null
      let summary: string | null = null
      let featuresZh = null
      let useCasesZh = null
      let summaryZh: string | null = null

      try { features = r.features ? JSON.parse(r.features) : null } catch { features = null }
      try { useCases = r.useCases ? JSON.parse(r.useCases) : null } catch { useCases = null }
      try { techStack = r.techStack ? JSON.parse(r.techStack) : null } catch { techStack = null }
      try { summary = r.summary ?? null } catch { summary = null }
      try { featuresZh = r.featuresZh ? JSON.parse(r.featuresZh) : null } catch { featuresZh = null }
      try { useCasesZh = r.useCasesZh ? JSON.parse(r.useCasesZh) : null } catch { useCasesZh = null }
      try { summaryZh = r.summaryZh ?? null } catch { summaryZh = null }

      let topics: string[] = []
      try { topics = r.topics ? JSON.parse(r.topics) : [] } catch { topics = [] }

      return {
        id: r.id,
        owner: r.owner,
        name: r.name,
        fullName: r.fullName,
        description: r.description,
        url: r.url,
        stars: r.stars,
        language: r.language,
        topics,
        features,
        useCases,
        techStack,
        summary,
        featuresZh,
        useCasesZh,
        summaryZh,
        readmeAnalyzedAt: r.readmeAnalyzedAt?.toISOString() ?? null,
        importedAt: r.importedAt.toISOString(),
      }
    })

    const response: ReposResponse = {
      repos: formatted,
      total,
      analyzedCount,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('GET /api/repos error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch repos' },
      { status: 500 },
    )
  }
}
