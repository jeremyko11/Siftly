import { NextRequest, NextResponse } from 'next/server'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { AIClient, resolveAIClient } from '@/lib/ai-client'
import { getActiveModel, getProvider } from '@/lib/settings'
import { getCliAvailability, claudePrompt, modelNameToCliAlias } from '@/lib/claude-cli-auth'
import { getCodexCliAvailability, codexPrompt } from '@/lib/codex-cli'
import { fetchContentForUrl } from '@/lib/agent-reach'
import prisma from '@/lib/db'

// ─── AI summarization (done server-side so API keys stay secure) ───────────────

async function getDbApiKey(): Promise<string> {
  const provider = await getProvider()
  const keyName = provider === 'openai' ? 'openaiApiKey' : 'anthropicApiKey'
  const setting = await prisma.setting.findUnique({ where: { key: keyName } })
  return setting?.value?.trim() ?? ''
}

async function summarizeWithAI(
  query: string,
  results: Array<{ title: string; url: string; description: string; content: string | null }>,
  apiKey: string,
) {
  const model = await getActiveModel()
  const provider = await getProvider()

  const entries = results.map((r, i) => {
    const content = r.content?.slice(0, 2000) ?? r.description ?? ''
    return `[${i + 1}] ${r.title}\nURL: ${r.url}\nContent: ${content.slice(0, 800)}`
  }).join('\n---\n')

  const prompt = `You are a web search analyst. Given a user query and search results, assess how relevant each result is and provide a brief AI-generated summary.

USER QUERY: "${query}"

SEARCH RESULTS:
${entries}

Return ONLY valid JSON — no markdown, no prose outside the JSON object:
{
  "analyses": [
    { "url": "https://...", "aiSummary": "2-3 sentence summary of the most relevant information", "aiRelevance": 0.0-1.0 }
  ]
}

Rules:
- aiRelevance: how well this result answers the user's query (1.0 = perfect match)
- aiSummary: what makes this result useful/relevant in 2-3 sentences
- Only include entries from the list above
- Be generous with relevance scores — if content is tangentially related, score 0.4+`

  let cliSucceeded = false
  let rawText = ''

  if (provider === 'openai' && await getCodexCliAvailability()) {
    try {
      const result = await codexPrompt(prompt, { timeoutMs: 60_000 })
      if (result.success && result.data) { rawText = result.data; cliSucceeded = true }
    } catch { /* fall through */ }
  } else if (provider === 'anthropic' && await getCliAvailability()) {
    try {
      const cliModel = modelNameToCliAlias(model)
      const result = await claudePrompt(prompt, { model: cliModel, timeoutMs: 60_000 })
      if (result.success && result.data) { rawText = result.data; cliSucceeded = true }
    } catch { /* fall through */ }
  }

  if (!cliSucceeded) {
    const client = await resolveAIClient({ dbKey: apiKey }).catch(() => null)
    if (!client) return results.map((r) => ({ url: r.url, aiSummary: r.description ?? '', aiRelevance: 0.5 }))
    try {
      const response = await client.createMessage({ model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
      rawText = response.text ?? ''
    } catch {
      return results.map((r) => ({ url: r.url, aiSummary: r.description ?? '', aiRelevance: 0.5 }))
    }
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return results.map((r) => ({ url: r.url, aiSummary: r.description ?? '', aiRelevance: 0.5 }))

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { analyses?: Array<{ url: string; aiSummary: string; aiRelevance: number }> }
    if (parsed.analyses) return parsed.analyses
  } catch { /* ignore */ }

  return results.map((r) => ({ url: r.url, aiSummary: r.description ?? '', aiRelevance: 0.5 }))
}

// ─── DuckDuckGo HTML search (no API key, bypasses VPN/DNS issues) ─────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
}

function extractRealUrl(href: string): string {
  // DuckDuckGo returns //duckduckgo.com/l/?uddg=https://actual.url&rut=...
  // We need to extract the uddg parameter
  try {
    const fullUrl = href.startsWith('//') ? 'https:' + href : href
    const urlObj = new URL(fullUrl)
    const realUrl = urlObj.searchParams.get('uddg')
    if (realUrl) return decodeHtmlEntities(realUrl)
    return href
  } catch {
    return href
  }
}

const SEARCH_PROXY = process.env.SEARCH_PROXY_URL ?? undefined

// Domain category weights for result ranking
// X/Twitter: 50%, Chinese domestic: 30%, Other foreign: 20%
function getDomainWeight(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase()

    // X / Twitter — highest priority (50%)
    if (hostname === 'twitter.com' || hostname === 'x.com' || hostname === 'nitter.net') {
      return 1.0
    }

    // Chinese domestic platforms (30%)
    const chineseDomains = [
      'baidu.com', 'zhihu.com', 'weibo.com', 'weixin.weibo.com', 'qq.com',
      'taobao.com', 'tmall.com', 'jd.com', 'bilibili.com', 'douyin.com',
      'xiaohongshu.com', 'redbook.com', 'xiaohongshu.cn', 'netEase.com',
      '163.com', 'sina.com.cn', 'sohu.com', 'ifeng.com', 'iFeng.com',
      'csdn.net', 'juejin.cn', 'segmentfault.com', 'aliyun.com', 'tencent.com',
      'huawei.com', 'alibaba.com', 'meituan.com', 'dianping.com', 'boss.com',
      'lagou.com', 'zhipin.com', 'liepin.com', '51job.com', 'github.cn',
      'gitee.com', 'oschina.net', 'cnblogs.com', 'jianshu.com', 'douban.com',
      'book.douban.com', 'movie.douban.com', 'music.douban.com',
    ]
    if (chineseDomains.some(d => hostname.endsWith(d))) {
      return 0.6
    }

    // Other foreign websites (20%)
    return 0.4
  } catch {
    return 0.5
  }
}

// Bing HTML search with pagination — fetches multiple pages for 30+ results
async function searchWithBingHTML(query: string): Promise<Array<{ title: string; url: string; description: string }>> {
  const fetchOptions: RequestInit & { agent?: unknown } = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Siftly/1.0)',
    },
    signal: AbortSignal.timeout(15_000),
  }
  if (SEARCH_PROXY) {
    fetchOptions.agent = new HttpsProxyAgent(SEARCH_PROXY)
  }

  // Fetch 3 pages in parallel (Bing returns ~10 per page)
  const pages = await Promise.all([
    fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&first=0`, fetchOptions).then(r => r.text()).catch(() => ''),
    fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&first=10`, fetchOptions).then(r => r.text()).catch(() => ''),
    fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&first=20`, fetchOptions).then(r => r.text()).catch(() => ''),
  ])

  const allResults: Array<{ title: string; url: string; description: string; weight: number }> = []
  // Use title as dedup key since Bing redirect URLs are all different
  const seenTitles = new Set<string>()

  const liRegex = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi
  const titleRegex = /<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
  const descRegex = /<p[^>]*>([\s\S]*?)<\/p>/i

  for (const html of pages) {
    let match
    while ((match = liRegex.exec(html)) !== null) {
      const block = match[1]
      const titleMatch = titleRegex.exec(block)
      // Reset regex for description search
      const descRegexCopy = /<p[^>]*>([\s\S]*?)<\/p>/i
      const descMatch = descRegexCopy.exec(block)

      if (titleMatch) {
        const title = decodeHtmlEntities(titleMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        const url = titleMatch[1]
        const description = descMatch ? decodeHtmlEntities(descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 200) : ''

        if (title && url && !seenTitles.has(title)) {
          seenTitles.add(title)
          // Extract domain for weight calculation from redirect URL
          const weight = getDomainWeight(url)
          allResults.push({ title, url, description, weight })
        }
      }
    }
  }

  // Sort by domain weight (highest first), then maintain original order within same weight
  allResults.sort((a, b) => b.weight - a.weight)

  return allResults.map(({ title, url, description }) => ({ title, url, description }))
}


// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { query?: string; results?: Array<{ title: string; url: string; description: string; content: string | null }> } = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { query, results } = body
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  let searchResults = results

  // If browser didn't pre-fetch results, do Jina search server-side (bypasses browser VPN/DNS issues)
  if (!searchResults || searchResults.length === 0) {
    const q = query.trim()
    const jinaResults = await searchWithBingHTML(q)
    if (jinaResults.length === 0) {
      return NextResponse.json({ results: [], explanation: `No web results found for "${q}"` })
    }

    // Fetch content for each result server-side using Agent-Reach (YouTube subtitles, Reddit, Jina Reader)
    const withContent = await Promise.all(
      jinaResults.slice(0, 30).map(async (r): Promise<{ title: string; url: string; description: string; content: string }> => ({
        title: r.title,
        url: r.url,
        description: r.description,
        content: (await fetchContentForUrl(r.url))?.slice(0, 3000) ?? '',
      }))
    )
    searchResults = withContent
  }

  const apiKey = await getDbApiKey()
  const analyses = await summarizeWithAI(query.trim(), searchResults, apiKey)
  const analysisMap = new Map(analyses.map((a) => [a.url, a]))

  const final = searchResults.map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    content: r.content ?? null,
    aiSummary: analysisMap.get(r.url)?.aiSummary ?? r.description,
    aiRelevance: analysisMap.get(r.url)?.aiRelevance ?? 0.5,
  })).sort((a, b) => b.aiRelevance - a.aiRelevance)

  return NextResponse.json({ results: final, explanation: `Found ${final.length} web results for "${query.trim()}"` })
}
