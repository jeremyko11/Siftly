import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { syncReposFromBookmarks } from '@/lib/github-client'
import { resolveAIClient } from '@/lib/ai-client'
import { getProvider } from '@/lib/settings'

export async function POST(request: NextRequest): Promise<NextResponse> {
  let bookmarkIds: string[] | undefined

  try {
    const body = await request.text().catch(() => '')
    if (body.trim()) {
      const parsed = JSON.parse(body) as { bookmarkIds?: string[] }
      bookmarkIds = parsed.bookmarkIds
    }
  } catch { /* ignore */ }

  // Fire-and-forget background sync
  void runSync(bookmarkIds)

  return NextResponse.json({ status: 'started' })
}

async function runSync(bookmarkIds?: string[]) {
  try {
    const result = await syncReposFromBookmarks(bookmarkIds)
    console.log('[repos/sync] sync complete:', result)

    // Kick off AI analysis for repos that have README but no features
    void analyzeReposInBackground()
  } catch (err) {
    console.error('[repos/sync] sync failed:', err)
  }
}

async function analyzeReposInBackground() {
  try {
    const repos = await prisma.repo.findMany({
      where: {
        readmeContent: { not: null },
        features: null,
      },
      select: { id: true, readmeContent: true },
    })

    if (repos.length === 0) return

    const provider = await getProvider()
    const keyName = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey'
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: keyName } })
    let client = null
    try {
      client = await resolveAIClient({ dbKey: apiKeySetting?.value })
    } catch {
      console.warn('[repos/analyze] no AI client available, skipping analysis')
      return
    }

    const model = provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514'

    for (const repo of repos) {
      if (!repo.readmeContent) continue
      try {
        const analysis = await analyzeReadme(repo.readmeContent, client, model)
        await prisma.repo.update({
          where: { id: repo.id },
          data: {
            features: JSON.stringify(analysis.features),
            useCases: JSON.stringify(analysis.useCases),
            techStack: JSON.stringify(analysis.techStack),
            summary: analysis.summary,
            readmeAnalyzedAt: new Date(),
          },
        })
        console.log(`[repos/analyze] analyzed repo ${repo.id}`)
      } catch (err) {
        console.warn(`[repos/analyze] failed for ${repo.id}:`, err)
      }
    }
  } catch (err) {
    console.error('[repos/analyze] background analysis error:', err)
  }
}

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
- techStack: 3-8 items max, the main tools/frameworks/languages
- Return ONLY valid JSON, no markdown, no explanation
- If README is too short or unclear, still return valid JSON with what you can determine`

async function analyzeReadme(
  readmeContent: string,
  client: unknown,
  model: string,
): Promise<{ features: { title: string; description: string }[]; useCases: { scenario: string; description: string }[]; techStack: string[]; summary: string }> {
  const text = readmeContent.slice(0, 8000) // first 8k chars is enough

  const aiClient = client as { createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }> }

  const response = await Promise.race([
    aiClient.createMessage({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: `${ANALYSIS_PROMPT}\n\nREADME:\n${text}` }],
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout (60s)')), 60_000)),
  ])

  const text2 = response.text.trim()
  let jsonText: string | null = null

  // Try multiple extraction strategies
  const standardMatch = text2.match(/\[[\s\S]*\]/)
  if (standardMatch) jsonText = standardMatch[0]

  if (!jsonText) {
    const codeBlockMatch = text2.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) jsonText = codeBlockMatch[1]
  }

  if (!jsonText) {
    const first = text2.indexOf('{')
    const last = text2.lastIndexOf('}')
    if (first !== -1 && last > first) jsonText = text2.slice(first, last + 1)
  }

  if (!jsonText) throw new Error('No JSON found in AI response')

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }

  const p = parsed as Record<string, unknown>
  return {
    features: Array.isArray(p.features) ? p.features as { title: string; description: string }[] : [],
    useCases: Array.isArray(p.useCases) ? p.useCases as { scenario: string; description: string }[] : [],
    techStack: Array.isArray(p.techStack) ? p.techStack as string[] : [],
    summary: typeof p.summary === 'string' ? p.summary : '',
  }
}
