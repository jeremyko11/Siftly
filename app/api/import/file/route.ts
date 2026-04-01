import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseBookmarksJson } from '@/lib/parser'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

interface CsvRow {
  tweetid: string
  text: string
  authorhandle: string
  authorname: string
  tweetcreatedat?: string
  source?: string
  importedat?: string
  [key: string]: string | undefined
}

function parseCsvToSiftlyFormat(content: string): string {
  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return '[]'

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())

  const items: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })
    items.push(row as CsvRow)
  }

  // Validate required columns
  const required = ['tweetid', 'text', 'authorhandle', 'authorname']
  for (const req of required) {
    if (!headers.includes(req)) {
      throw new Error(`Missing required CSV column: ${req}`)
    }
  }

  // Convert to Siftly export format
  const siftlyItems = items
    .filter((row) => row.tweetid && row.text)
    .map((row) => ({
      tweetId: row.tweetid,
      text: row.text,
      authorHandle: row.authorhandle || 'unknown',
      authorName: row.authorname || 'Unknown',
      tweetCreatedAt: row.tweetcreatedat || null,
      source: row.source || 'bookmark',
    }))

  return JSON.stringify(siftlyItems)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: 'Missing required field: file' },
      { status: 400 }
    )
  }

  const filename = file instanceof File ? file.name : 'export.json'
  const extension = filename.split('.').pop()?.toLowerCase()

  let content: string
  try {
    content = await file.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read file content' }, { status: 400 })
  }

  let jsonString: string

  if (extension === 'csv') {
    try {
      jsonString = parseCsvToSiftlyFormat(content)
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to parse CSV: ${err instanceof Error ? err.message : String(err)}` },
        { status: 422 }
      )
    }
  } else if (extension === 'json') {
    // Validate JSON and check if it's already in the right format
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        // Already in array format, use as-is
        jsonString = content
      } else {
        // Wrap in array for parseBookmarksJson
        jsonString = content
      }
    } catch (err) {
      return NextResponse.json(
        { error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}` },
        { status: 422 }
      )
    }
  } else {
    return NextResponse.json(
      { error: 'Unsupported file format. Use .csv or .json' },
      { status: 400 }
    )
  }

  // Parse using the existing parser
  let parsedBookmarks
  try {
    parsedBookmarks = parseBookmarksJson(jsonString)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse bookmarks: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    )
  }

  if (parsedBookmarks.length === 0) {
    return NextResponse.json(
      { error: 'No valid bookmarks found in file' },
      { status: 422 }
    )
  }

  // Import bookmarks
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const bookmark of parsedBookmarks) {
    try {
      const existing = await prisma.bookmark.findUnique({
        where: { tweetId: bookmark.tweetId },
        select: { id: true },
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.bookmark.create({
        data: {
          tweetId: bookmark.tweetId,
          text: bookmark.text,
          authorHandle: bookmark.authorHandle,
          authorName: bookmark.authorName,
          tweetCreatedAt: bookmark.tweetCreatedAt,
          rawJson: bookmark.rawJson,
          source: 'bookmark',
        },
      })

      imported++
    } catch (err) {
      errors.push(`Failed to import tweet ${bookmark.tweetId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    errors: errors.slice(0, 100),
  })
}
