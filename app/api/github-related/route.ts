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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('mode') ?? 'similar' // similar | trending | by-language
  const query = searchParams.get('q') ?? ''

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

    let searchQuery = ''
    let sort = 'stars'
    let perPage = 10

    if (mode === 'trending') {
      // Trending: recently active repos sorted by stars
      searchQuery = 'is:public'
      sort = 'stars'
      perPage = 15
    } else if (mode === 'by-language') {
      // By language: top repos for a specific language
      searchQuery = query || 'language:Python'
      sort = 'stars'
      perPage = 15
    } else {
      // Similar: search by topic or repo description keywords
      searchQuery = query || 'stars:>1000'
      sort = 'stars'
      perPage = 15
    }

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
