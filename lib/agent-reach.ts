/**
 * Agent-Reach tools — Node.js reimplementation.
 * Fetches content from URLs using Jina Reader, yt-dlp, and direct API calls.
 * Zero Python dependency — all tools invoked via child_process or native fetch.
 */

import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import { HttpsProxyAgent } from 'https-proxy-agent'

const SEARCH_PROXY = process.env.SEARCH_PROXY_URL ?? undefined

const execAsync = promisify(exec)

const JINA_READER_BASE = 'https://r.jina.ai'
const MAX_CONTENT_LEN = 5000
const YTDL_TIMEOUT_MS = 60_000
const JINA_TIMEOUT_MS = 15_000
const REDDIT_TIMEOUT_MS = 15_000

// ── Platform detection ─────────────────────────────────────────────────────────

function detectPlatform(url: string): 'youtube' | 'reddit' | 'generic' {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube'
    if (host === 'reddit.com' || host === 'old.reddit.com') return 'reddit'
    return 'generic'
  } catch {
    return 'generic'
  }
}

// ── Jina Reader — web page → markdown ─────────────────────────────────────────

export async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS)
    const encoded = encodeURIComponent(url)
    const fetchOptions: RequestInit & { agent?: unknown } = {
      signal: controller.signal,
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'markdown',
      },
    }
    if (SEARCH_PROXY) {
      fetchOptions.agent = new HttpsProxyAgent(SEARCH_PROXY)
    }
    const res = await fetch(`${JINA_READER_BASE}/${encoded}`, fetchOptions)
    clearTimeout(timeout)
    if (!res.ok) return null
    const text = await res.text()
    if (!text.trim()) return null
    return text.slice(0, MAX_CONTENT_LEN)
  } catch {
    return null
  }
}

// ── YouTube — yt-dlp subtitle extraction ──────────────────────────────────────

export async function fetchYouTubeSubtitles(url: string): Promise<string | null> {
  // Check if yt-dlp is available
  if (!isCommandAvailable('yt-dlp')) return null

  // yt-dlp --write-sub downloads subs to current dir — use /tmp
  const tmpDir = process.env.TEMP ?? '/tmp'
  const outputTemplate = `${tmpDir}/siftly_ytdl_%(id)s`

  try {
    // Try English subtitles first, then any language
    const cmd = `yt-dlp --write-sub --skip-download --sub-lang en --convert-subs vtt -o "${outputTemplate}" "${url}"`
    let { stdout, stderr } = await execAsync(cmd, { timeout: YTDL_TIMEOUT_MS })

    // Find the generated subtitle file
    const stderrStr = stderr ?? ''
    const stdoutStr = stdout ?? ''

    // yt-dlp outputs filename to stderr or stdout in "Destination:" line
    const destMatch = [...stderrStr, ...stdoutStr].join('\n').match(/\[Download\] Destination:\s+(.+)/)
    if (!destMatch) {
      // Try globbing in /tmp
      const fs = await import('fs')
      const path = await import('path')
      const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('siftly_ytdl_'))
      if (files.length === 0) return null
      const subFile = path.join(tmpDir, files[files.length - 1])
      return extractSubtitleText(subFile)
    }

    const subFile = destMatch[1].trim()
    const text = await extractSubtitleText(subFile)

    // Cleanup
    cleanupFile(subFile).catch(() => {})

    return text
  } catch {
    return null
  }
}

async function extractSubtitleText(subFile: string): Promise<string | null> {
  try {
    const fs = await import('fs')
    if (!fs.existsSync(subFile)) return null
    const content = fs.readFileSync(subFile, 'utf-8')
    return parseVttOrSrt(content).slice(0, MAX_CONTENT_LEN)
  } catch {
    return null
  }
}

function parseVttOrSrt(content: string): string {
  // VTT format: lines after timestamp block until blank line
  // SRT format: index + timestamp + text
  const lines = content.split('\n')
  const textLines: string[] = []

  if (content.includes('WEBVTT')) {
    // VTT: skip header, collect text after timestamp lines
    let i = 0
    while (i < lines.length && !lines[i].includes('-->')) i++
    for (; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.includes('-->')) continue
      if (!line) break
      textLines.push(line)
    }
  } else {
    // SRT: collect lines that don't start with digits (index) or timestamp
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || /^\d+$/.test(trimmed) || /\d{2}:\d{2}/.test(trimmed)) continue
      textLines.push(trimmed)
    }
  }

  return textLines.join(' ').replace(/<[^>]+>/g, '').trim()
}

function cleanupFile(filePath: string): Promise<void> {
  return execAsync(`rm -f "${filePath}"`).then(() => {}, () => {})
}

// ── Reddit — JSON API ──────────────────────────────────────────────────────────

interface RedditPost {
  title?: string
  selftext?: string
  body?: string
  link_flair_text?: string
  subreddit_name_prefixed?: string
}

export async function fetchRedditPost(url: string): Promise<string | null> {
  try {
    // Convert human Reddit URL to JSON API URL
    // e.g. https://www.reddit.com/r/xxx/comments/abc/def/ -> .../abc.json
    const jsonUrl = url
      .replace(/^(https?:\/\/)(www\.|old\.)?reddit\.com/, 'https://www.reddit.com')
      .replace(/\/comments\/([a-zA-Z0-9]+)\/([a-zA-Z0-9_]+)\/.*$/, '/comments/$1.json')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REDDIT_TIMEOUT_MS)
    const fetchOptions: RequestInit & { agent?: unknown } = { signal: controller.signal }
    if (SEARCH_PROXY) {
      fetchOptions.agent = new HttpsProxyAgent(SEARCH_PROXY)
    }
    const res = await fetch(jsonUrl, fetchOptions)
    clearTimeout(timeout)

    if (!res.ok) return null

    const data = (await res.json()) as Array<{ data?: { children?: Array<{ data?: RedditPost }> } }>
    const post = data?.[0]?.data?.children?.[0]?.data
    if (!post) return null

    const parts: string[] = []
    if (post.title) parts.push(post.title)
    if (post.selftext) parts.push(post.selftext)
    if (post.body && post.body !== post.selftext) parts.push(post.body)
    if (post.link_flair_text) parts.push(post.link_flair_text)

    const result = parts.join('\n\n').slice(0, MAX_CONTENT_LEN)
    return result || null
  } catch {
    return null
  }
}

// ── Platform router ───────────────────────────────────────────────────────────

/**
 * Fetch content from a URL based on its platform.
 * Returns markdown/plain text, or null if fetch failed.
 */
export async function fetchContentForUrl(url: string): Promise<string | null> {
  const platform = detectPlatform(url)

  if (platform === 'youtube') {
    return fetchYouTubeSubtitles(url)
  }
  if (platform === 'reddit') {
    return fetchRedditPost(url)
  }
  // Generic: Jina Reader
  return fetchUrlContent(url)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCommandAvailable(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// ── Health check — mirrors agent-reach doctor ──────────────────────────────────

export interface ToolStatus {
  tool: string
  status: 'ok' | 'warn' | 'off'
  message: string
}

export function checkTools(): ToolStatus[] {
  const results: ToolStatus[] = []

  // Jina Reader (always available if network works)
  results.push({
    tool: 'jina-reader',
    status: 'ok',
    message: 'Jina Reader — 无需安装，直接 HTTP 调用',
  })

  // yt-dlp
  if (isCommandAvailable('yt-dlp')) {
    // Check JS runtime for YouTube
    const hasDeno = isCommandAvailable('deno')
    const hasNode = isCommandAvailable('node')
    if (hasDeno || hasNode) {
      results.push({ tool: 'yt-dlp', status: 'ok', message: 'yt-dlp + JS runtime 可用' })
    } else {
      results.push({
        tool: 'yt-dlp',
        status: 'warn',
        message: 'yt-dlp 已安装但缺少 JS runtime（YouTube 必须）。安装 Node.js 或 deno。',
      })
    }
  } else {
    results.push({
      tool: 'yt-dlp',
      status: 'off',
      message: 'yt-dlp 未安装。macOS/Linux: brew install yt-dlp 或 pip install yt-dlp',
    })
  }

  return results
}
