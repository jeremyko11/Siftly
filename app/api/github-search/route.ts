import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { decryptSafe } from '@/lib/crypto'

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
  const q = searchParams.get('q') ?? ''

  if (!q.trim()) {
    return NextResponse.json({ repos: [], error: 'Query is empty' }, { status: 200 })
  }

  try {
    const patSetting = await prisma.setting.findUnique({
      where: { key: 'github_personal_access_token' },
    })
    const token = patSetting?.value ? decryptSafe(patSetting.value).trim() : process.env.GITHUB_TOKEN

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Siftly/1.0',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const searchQuery = `${q.trim()} stars:>100`
    const sort = searchParams.get('sort') ?? ''
    const sortParam = sort ? `&sort=${sort}` : ''
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}${sortParam}&per_page=30&type=Repositories`

    const res = await fetch(url, { headers })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[github-search] GitHub API error:', res.status, errorText)
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
      total_count: number
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

    return NextResponse.json({ repos, total: data.total_count })
  } catch (err) {
    console.error('[github-search]', err)
    return NextResponse.json({ repos: [], error: String(err) }, { status: 200 })
  }
}
