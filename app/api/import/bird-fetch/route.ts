import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseBookmarksJson } from '@/lib/parser'
import { spawn } from 'child_process'

interface BirdBookmark {
  id: string
  text: string
  createdAt: string
  authorId?: string
  author?: { username: string; name: string }
  media?: { type: string; url: string; previewUrl?: string }[]
}

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

// Parse "Mon Mar 30 04:53:59 +0000 2026" -> ISO
function parseTwitterDate(dateStr: string): string | null {
  const parts = dateStr.match(/^\w+ (\w+) (\d+) (\d+):(\d+):(\d+) \+\d+ (\d+)$/)
  if (!parts) return null
  const [, month, day, hour, min, sec, year] = parts
  return `${year}-${MONTH_MAP[month]}-${day.padStart(2, '0')}T${hour}:${min}:${sec}.000Z`
}

function convertBirdToTwitterFormat(bookmarks: BirdBookmark[]) {
  // Extract all non-t.co URLs from text
  const URL_REGEX = /https?:\/\/[^\s]+/g
  return bookmarks.map((b) => {
    const mediaEntities = (b.media ?? []).map((m) => {
      const type = m.type === 'video' ? 'video' : m.type === 'animated_gif' ? 'animated_gif' : 'photo'
      if (type === 'video' || type === 'animated_gif') {
        return {
          type,
          media_url_https: m.previewUrl ?? m.url,
          video_info: { variants: [{ content_type: 'video/mp4', url: m.url }] },
        }
      }
      return { type, media_url_https: m.url }
    })

    // Extract hashtags from text: #tag
    const hashtagMatches = b.text.match(/#[\w\u4e00-\u9fff]+/g) ?? []
    const hashtags = hashtagMatches.map((tag) => ({ text: tag.replace(/^#/, '') }))

    // Extract URLs from text (exclude t.co shortlinks — bird already fetched the real ones)
    const tcoSet = new Set((b.media ?? []).map((m) => m.url).filter(Boolean))
    const urlMatches = b.text.match(URL_REGEX) ?? []
    const urls = urlMatches
      .filter((u) => !u.includes('t.co/') && !tcoSet.has(u))
      .map((url) => ({ expanded_url: url, url }))

    const createdAtIso = parseTwitterDate(b.createdAt)

    return {
      id_str: b.id,
      full_text: b.text,
      created_at: createdAtIso,
      user: {
        screen_name: b.author?.username ?? '',
        name: b.author?.name ?? '',
      },
      entities: {
        hashtags,
        urls,
        media: mediaEntities.length > 0 ? mediaEntities : undefined,
      },
      extended_entities: mediaEntities.length > 0 ? { media: mediaEntities } : undefined,
    }
  })
}

async function getBirdCredentials(): Promise<{ authToken: string | null; ct0: string | null }> {
  const [authToken, ct0] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'x_bird_auth_token' } }),
    prisma.setting.findUnique({ where: { key: 'x_bird_ct0' } }),
  ])
  return { authToken: authToken?.value ?? null, ct0: ct0?.value ?? null }
}

function runBird(authToken: string, ct0: string, maxPages: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use full path to bird.cmd on Windows
    const isWin = process.platform === 'win32'
    const npmBin = 'C:\\Users\\jeremyko11\\AppData\\Roaming\\npm'
    const birdCmd = isWin ? `${npmBin}\\bird.cmd` : `${npmBin}/bird`
    const args = [
      'bookmarks',
      '--all',
      '--max-pages', String(maxPages),
      '--json',
      '--no-color',
      '--auth-token', authToken,
      '--ct0', ct0,
    ]

    const proc = isWin
      ? spawn('cmd.exe', ['/c', birdCmd, ...args], { stdio: ['ignore', 'pipe', 'pipe'], shell: false })
      : spawn(birdCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })

    proc.on('close', (code) => {
      if (code !== 0 && !stdout.includes('[')) {
        reject(new Error(stderr || `bird exited with code ${code}`))
        return
      }
      resolve(stdout)
    })
    proc.on('error', (err) => reject(err))
  })
}

export async function POST(req: NextRequest) {
  const { authToken, ct0 } = await getBirdCredentials()

  if (!authToken || !ct0) {
    return NextResponse.json(
      { error: 'Bird credentials not configured. Add auth_token and ct0 in Settings.' },
      { status: 401 },
    )
  }

  const body = await req.json().catch(() => ({})) as { maxPages?: number }
  const maxPages = Math.min(body.maxPages ?? 10, 50)

  let birdOutput: string
  try {
    birdOutput = await runBird(authToken, ct0, maxPages)
  } catch (err) {
    console.error('Bird CLI error:', err)
    return NextResponse.json(
      { error: `Failed to run bird CLI: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }

  // Extract JSON array from output (bird outputs colored text + JSON)
  const start = birdOutput.indexOf('[')
  const end = birdOutput.lastIndexOf(']')
  if (start < 0 || end < 0) {
    return NextResponse.json({ error: 'Invalid output from bird CLI' }, { status: 502 })
  }

  let birdBookmarks: BirdBookmark[]
  try {
    birdBookmarks = JSON.parse(birdOutput.slice(start, end + 1))
  } catch {
    return NextResponse.json({ error: 'Failed to parse bird output as JSON' }, { status: 502 })
  }

  const tweets = convertBirdToTwitterFormat(birdBookmarks)
  const jsonString = JSON.stringify(tweets)

  let parsedBookmarks
  try {
    parsedBookmarks = parseBookmarksJson(jsonString)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse bookmarks: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 },
    )
  }

  const source = 'bookmark'
  let imported = 0
  let skipped = 0

  for (const bookmark of parsedBookmarks) {
    const existing = await prisma.bookmark.findUnique({
      where: { tweetId: bookmark.tweetId },
      select: { id: true },
    })
    if (existing) { skipped++; continue }

    const created = await prisma.bookmark.create({
      data: {
        tweetId: bookmark.tweetId,
        text: bookmark.text,
        authorHandle: bookmark.authorHandle,
        authorName: bookmark.authorName,
        tweetCreatedAt: bookmark.tweetCreatedAt,
        rawJson: bookmark.rawJson,
        source,
      },
    })

    if (bookmark.media.length > 0) {
      await prisma.mediaItem.createMany({
        data: bookmark.media.map((m) => ({
          bookmarkId: created.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl ?? null,
        })),
      })
    }
    imported++
  }

  return NextResponse.json({ imported, skipped, total: birdBookmarks.length })
}
