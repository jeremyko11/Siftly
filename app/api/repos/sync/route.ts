import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { syncReposFromBookmarks } from '@/lib/github-client'
import { resolveAIClient } from '@/lib/ai-client'
import { getProvider } from '@/lib/settings'

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

    const aiClient = client as { createMessage: (params: { model: string; max_tokens: number; messages: { role: string; content: string }[] }) => Promise<{ text: string }> }

    const callAI = async (prompt: string, content: string) => {
      const response = await Promise.race([
        aiClient.createMessage({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: `${prompt}\n\n${content}` }],
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout (60s)')), 60_000)),
      ])
      return JSON.parse(extractJson(response.text.trim()))
    }

    for (const repo of repos) {
      if (!repo.readmeContent) continue
      try {
        const text = repo.readmeContent.slice(0, 8000)

        // Step 1: Generate English analysis
        const parsed = await callAI(ANALYSIS_PROMPT, `README:\n${text}`)
        const analysis = {
          features: Array.isArray(parsed.features) ? parsed.features : [],
          useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
          techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        }

        // Step 2: Translate to Chinese
        const zhParsed = await callAI(TRANSLATION_PROMPT, JSON.stringify({
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
          where: { id: repo.id },
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
        console.log(`[repos/analyze] analyzed + translated repo ${repo.id}`)
      } catch (err) {
        console.warn(`[repos/analyze] failed for ${repo.id}:`, err)
      }
    }
  } catch (err) {
    console.error('[repos/analyze] background analysis error:', err)
  }
}
