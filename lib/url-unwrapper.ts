/**
 * Unwraps t.co shortlinks to their final destination URL by following HTTP redirects.
 * Returns the original URL if it's not a t.co shortlink or if resolution fails.
 */

// In-memory cache: shortUrl → resolvedUrl
const resolveCache = new Map<string, Promise<string>>()

function isTcoUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 't.co' || u.hostname === 'u.ts.co'
  } catch {
    return false
  }
}

async function resolveOne(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    return res.url
  } catch {
    return url
  }
}

async function resolveWithLock(url: string): Promise<string> {
  const existing = resolveCache.get(url)
  if (existing) return existing
  const prom = resolveOne(url)
  resolveCache.set(url, prom)
  return prom
}

const CONCURRENCY = 8

async function unwrapBatch(urls: string[]): Promise<string[]> {
  const results: string[] = new Array(urls.length)
  const tcoIndices: { idx: number; url: string }[] = []

  // Collect t.co URLs with their indices
  for (let i = 0; i < urls.length; i++) {
    if (isTcoUrl(urls[i])) {
      tcoIndices.push({ idx: i, url: urls[i] })
    } else {
      results[i] = urls[i]
    }
  }

  // Resolve t.co URLs with bounded concurrency
  for (let i = 0; i < tcoIndices.length; i += CONCURRENCY) {
    const batch = tcoIndices.slice(i, i + CONCURRENCY)
    const resolved = await Promise.all(batch.map((b) => resolveWithLock(b.url)))
    resolved.forEach((r, j) => {
      results[batch[j].idx] = r
    })
  }

  return results
}

export async function unwrapTcoUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return urls
  // Fast path: no t.co URLs at all
  if (!urls.some((u) => isTcoUrl(u))) return urls
  return unwrapBatch(urls)
}
