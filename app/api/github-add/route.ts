import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { fetchRepoMetadata, fetchReadme, parseGitHubUrl } from '@/lib/github-client'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { owner: string; repo: string }
    const { owner, repo: repoName } = body

    if (!owner || !repoName) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
    }

    const patSetting = await prisma.setting.findUnique({
      where: { key: 'github_personal_access_token' },
    })
    const token = patSetting?.value?.trim()
    if (!token) {
      return NextResponse.json({ error: 'GitHub PAT not configured' }, { status: 401 })
    }

    // Check if already saved
    const existing = await prisma.repo.findUnique({
      where: { fullName: `${owner}/${repoName}` },
    })
    if (existing) {
      return NextResponse.json({ repo: existing, alreadyExists: true })
    }

    // Fetch metadata and README
    const [meta, readme] = await Promise.all([
      fetchRepoMetadata(owner, repoName, token),
      fetchReadme(owner, repoName, token),
    ])

    const saved = await prisma.repo.create({
      data: {
        owner: meta.owner,
        name: meta.name,
        fullName: meta.fullName,
        description: meta.description,
        url: meta.url,
        stars: meta.stars,
        language: meta.language,
        topics: JSON.stringify(meta.topics),
        readmeContent: readme,
      },
    })

    return NextResponse.json({ repo: saved, alreadyExists: false })
  } catch (err) {
    console.error('[github-add]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to add repo' }, { status: 500 })
  }
}
