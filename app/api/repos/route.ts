import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import type { Repo, ReposResponse } from '@/lib/types'

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
        where,
        orderBy,
        take: 200,
      }),
      prisma.repo.count({ where }),
      prisma.repo.count({ where: { features: { not: null } } }),
    ])

    const formatted: Repo[] = repos.map((r): Repo => {
      let features = null
      let useCases = null
      let techStack: string[] | null = null
      let summary: string | null = null

      try { features = r.features ? JSON.parse(r.features) : null } catch { features = null }
      try { useCases = r.useCases ? JSON.parse(r.useCases) : null } catch { useCases = null }
      try { techStack = r.techStack ? JSON.parse(r.techStack) : null } catch { techStack = null }
      try { summary = r.summary ?? null } catch { summary = null }

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
        readmeContent: r.readmeContent,
        features,
        useCases,
        techStack,
        summary,
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
