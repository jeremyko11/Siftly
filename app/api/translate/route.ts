import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache to avoid repeated translations
const cache = new Map<string, string>()

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json({ translatedText: '' })

  const cached = cache.get(q)
  if (cached) return NextResponse.json({ translatedText: cached })

  try {
    // Use MyMemory free translation API (no key required)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|zh`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) throw new Error('Translation API error')
    const data = (await res.json()) as {
      responseStatus: number
      responseData: { translatedText: string }
    }
    if (data.responseStatus !== 200) throw new Error('Translation failed')
    const translated = data.responseData.translatedText
    if (translated && translated !== q) {
      if (cache.size > 5000) cache.clear()
      cache.set(q, translated)
    }
    return NextResponse.json({ translatedText: translated || q })
  } catch {
    return NextResponse.json({ translatedText: q })
  }
}
