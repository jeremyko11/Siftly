import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface SearchRepo {
  fullName: string
  description: string | null
  stars: number
  forks: number
  language: string | null
  topics: string[]
  url: string
}

// Frontier AI/developer tool topics — used to power "similar" recommendations
const FRONTIER_QUERIES = [
  'ai-agent stars:>500 pushed:>2025-01-01',
  'browser-use OR browser-use-web-automation stars:>500',
  'claude-code OR everything-claude-code stars:>100',
  'mcp-server OR model-context-protocol stars:>500',
  'open-source-ai-agent stars:>1000',
  'bolt.new OR v0-dev stars:>500',
  'devin-ai OR swe-agent stars:>500',
  'rag stars:>2000 pushed:>2025-01-01',
  'cursor IDE OR cursorai stars:>1000',
  'warp terminal OR warp-dev stars:>500',
]

// Popular languages to cycle through for by-language tab
const LANGUAGES = ['Python', 'TypeScript', 'Rust', 'Go', 'JavaScript', 'C++', 'Swift', 'Kotlin']

function buildQuery(mode: string, query: string, refreshCount: number): string {
  if (mode === 'by-language') {
    // Cycle through popular languages on each refresh; custom query takes priority
    if (query) return query
    const lang = LANGUAGES[refreshCount % LANGUAGES.length]
    return `language:${lang} stars:>3000 pushed:>2025-01-01`
  }
  if (mode === 'trending') {
    // Truly trending = high stars + very recent push
    return `stars:>3000 pushed:>2025-03-01`
  }
  // Similar: rotate through frontier AI/agent queries
  return FRONTIER_QUERIES[refreshCount % FRONTIER_QUERIES.length]
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('mode') ?? 'similar'
  const query = searchParams.get('q') ?? ''
  // Refresh count lets us rotate through different frontier queries on each refresh
  const refreshCount = parseInt(searchParams.get('refresh') ?? '0', 10)

  try {
    const patSetting = await prisma.setting.findUnique({
      where: { key: 'github_personal_access_token' },
    })
    const token = patSetting?.value?.trim() || process.env.GITHUB_TOKEN

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Siftly/1.0',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const searchQuery = buildQuery(mode, query, refreshCount)
    const sort = mode === 'trending' ? 'stars' : 'stars'
    const perPage = 50

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${sort}&per_page=${perPage}&type=Repositories`

    const res = await fetch(url, { headers })

    if (!res.ok) {
      return NextResponse.json({ repos: [], error: 'GitHub API error' }, { status: 200 })
    }

    const data = (await res.json()) as {
      items: Array<{
        full_name: string
        description: string | null
        stargazers_count: number
        forks_count: number
        language: string | null
        topics: string[]
        html_url: string
      }>
    }

    const repos: SearchRepo[] = (data.items ?? []).map((item) => ({
      fullName: item.full_name,
      description: item.description,
      stars: item.stargazers_count,
      forks: item.forks_count,
      language: item.language,
      topics: item.topics ?? [],
      url: item.html_url,
    }))

    // Filter out repos already in user's collection
    const userRepoNames = new Set(
      (await prisma.repo.findMany({ select: { fullName: true } })).map((r) => r.fullName.toLowerCase())
    )
    const filtered = repos.filter((r) => !userRepoNames.has(r.fullName.toLowerCase()))

    // Save to recommendation history (fire-and-forget, don't block response)
    void saveRecommendationsToHistory(filtered, mode)

    return NextResponse.json({ repos: filtered, mode })
  } catch (err) {
    console.error('[github-related]', err)
    return NextResponse.json({ repos: [], error: String(err) }, { status: 200 })
  }
}

async function saveRecommendationsToHistory(repos: SearchRepo[], mode: string): Promise<void> {
  if (repos.length === 0) return
  try {
    const ops = repos.map((r) =>
      prisma.recommendedRepo.upsert({
        where: { fullName_mode: { fullName: r.fullName, mode } },
        update: {
          description: r.description,
          stars: r.stars,
          forks: r.forks,
          language: r.language,
          topics: JSON.stringify(r.topics),
          url: r.url,
          savedAt: new Date(),
        },
        create: {
          fullName: r.fullName,
          description: r.description,
          stars: r.stars,
          forks: r.forks,
          language: r.language,
          topics: JSON.stringify(r.topics),
          url: r.url,
          mode,
        },
      }),
    )
    await prisma.$transaction(ops)
  } catch (err) {
    console.error('[github-related] failed to save history:', err)
  }
}
