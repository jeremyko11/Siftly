import { NextRequest, NextResponse } from 'next/server'
import { exportAllBookmarksCsvNew, exportBookmarksJson, exportCategoryAsZip } from '@/lib/exporter'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format')
  const categorySlug = searchParams.get('category')

  // Default to JSON if no format specified
  const effectiveFormat = format ?? 'json'

  if (effectiveFormat === 'csv') {
    try {
      const csv = await exportAllBookmarksCsvNew()
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="bookmarks.csv"',
        },
      })
    } catch (err) {
      console.error('CSV export error:', err)
      return NextResponse.json(
        { error: `Failed to export CSV: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      )
    }
  }

  if (effectiveFormat === 'json') {
    try {
      const json = await exportBookmarksJson()
      return new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="bookmarks.json"',
        },
      })
    } catch (err) {
      console.error('JSON export error:', err)
      return NextResponse.json(
        { error: `Failed to export JSON: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      )
    }
  }

  if (effectiveFormat === 'zip') {
    try {
      let zipBuffer: Buffer

      if (categorySlug) {
        zipBuffer = await exportCategoryAsZip(categorySlug)
        const safeSlug = categorySlug.replace(/[^a-z0-9-_]/gi, '_')
        return new NextResponse(new Uint8Array(zipBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="bookmarks-${safeSlug}.zip"`,
          },
        })
      }

      // ZIP containing both CSV and JSON
      const [csv, json] = await Promise.all([
        exportAllBookmarksCsvNew(),
        exportBookmarksJson(),
      ])

      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      zip.file('bookmarks.csv', csv)
      zip.file('bookmarks.json', json)
      zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="bookmarks.zip"',
        },
      })
    } catch (err) {
      console.error('ZIP export error:', err)
      return NextResponse.json(
        { error: `Failed to export ZIP: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: `Unknown format: ${format}. Use csv, json, or zip.` },
    { status: 400 }
  )
}
