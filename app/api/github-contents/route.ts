import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const owner = searchParams.get('owner') ?? ''
  const repo = searchParams.get('repo') ?? ''

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
  }

  try {
    // Use stored GitHub PAT for higher rate limit (5000/hr vs 60/hr unauthenticated)
    const patSetting = await prisma.setting.findUnique({
      where: { key: 'github_personal_access_token' },
    })
    const token = patSetting?.value?.trim() || process.env.GITHUB_TOKEN

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Siftly/1.0',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
      headers,
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ tree: [], isError: true, status: res.status })
    }

    const data = (await res.json()) as Array<{
      name: string
      type: 'file' | 'dir'
      sha: string
    }>

    // Sort: directories first, then files, both alphabetically
    const sorted = [...data].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ tree: sorted, isError: false })
  } catch {
    return NextResponse.json({ tree: [], isError: true })
  }
}
