import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params

    const repo = await prisma.repo.findUnique({ where: { id } })
    if (!repo) {
      return NextResponse.json({ error: 'Repo not found' }, { status: 404 })
    }

    if (!repo.readmeContent) {
      return NextResponse.json({ error: 'No README content to analyze' }, { status: 400 })
    }

    const provider = await getProvider()
    const keyName = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey'
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: keyName } })
    const client = await resolveAIClient({ dbKey: apiKeySetting?.value })

    const model = provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514'
    const text = repo.readmeContent.slice(0, 8000)

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

    const parsed = await callAI(ANALYSIS_PROMPT, `README:\n${text}`)
    const analysis = {
      features: Array.isArray(parsed.features) ? parsed.features : [],
      useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    }

    const zhParsed = await callAI(TRANSLATION_PROMPT, JSON.stringify(analysis))
    const analysisZh = {
      features: Array.isArray(zhParsed.features) ? zhParsed.features : [],
      useCases: Array.isArray(zhParsed.useCases) ? zhParsed.useCases : [],
      summary: typeof zhParsed.summary === 'string' ? zhParsed.summary : '',
    }

    await prisma.repo.update({
      where: { id },
      data: {
        features: JSON.stringify(analysis.features),
        useCases: JSON.stringify(analysis.useCases),
        techStack: JSON.stringify(analysis.techStack),
        summary: analysis.summary,
        featuresZh: JSON.stringify(analysisZh.features),
        useCasesZh: JSON.stringify(analysisZh.useCases),
        summaryZh: analysisZh.summary,
        readmeAnalyzedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, analysis, analysisZh })
  } catch (err) {
    console.error(' reanalyze error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 },
    )
  }
}
