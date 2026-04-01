import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface HistoryRepo {
  id: string
  fullName: string
  description: string | null
  stars: number
  forks: number
  language: string | null
  topics: string[]
  url: string
  mode: string
  added: boolean
  savedAt: string
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('mode') ?? 'history' // history | similar | trending | by-language

  try {
    const repos = await prisma.recommendedRepo.findMany({
      where: mode !== 'history' ? { mode } : undefined,
      orderBy: { savedAt: 'desc' },
      take: 100,
    })

    const result: HistoryRepo[] = repos.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      description: r.description,
      stars: r.stars,
      forks: r.forks,
      language: r.language,
      topics: JSON.parse(r.topics) as string[],
      url: r.url,
      mode: r.mode,
      added: r.added,
      savedAt: r.savedAt.toISOString(),
    }))

    return NextResponse.json({ repos: result, mode })
  } catch (err) {
    console.error('[recommended-history]', err)
    return NextResponse.json({ repos: [], error: String(err) }, { status: 200 })
  }
}
