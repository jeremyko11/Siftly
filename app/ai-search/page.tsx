'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Search, Loader2, BookMarked, AlertCircle, ImageIcon, Globe, ExternalLink, GlobeIcon } from 'lucide-react'
import BookmarkCard from '@/components/bookmark-card'
import type { BookmarkWithMedia } from '@/lib/types'
import { useI18n } from '@/lib/i18n-context'

// Extends BookmarkWithMedia with AI-specific fields returned by the search API
interface AIBookmark extends BookmarkWithMedia {
  aiScore: number
  aiReason: string
  highlight: string | null
}

// Internet search result from /api/search/internet
interface InternetResult {
  title: string
  url: string
  description: string
  content: string | null
  aiSummary: string | null
  aiRelevance: number
}

const EXAMPLES = [
  'funny meme about AI replacing developers',
  'Solana DeFi tools I should try',
  'something about productivity and focus',
  'crypto market crash meme',
  'cool developer tools for building faster',
]

interface ImageStats {
  total: number
  tagged: number
  remaining: number
}

export default function AISearchPage() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AIBookmark[]>([])
  const [internetResults, setInternetResults] = useState<InternetResult[]>([])
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [imageStats, setImageStats] = useState<ImageStats | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [internetSearch, setInternetSearch] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    // Load image analysis progress
    fetch('/api/analyze/images')
      .then((r) => r.json())
      .then((data: ImageStats) => setImageStats(data))
      .catch(() => {})
    // Hide standalone image analysis when the main pipeline is already handling it
    fetch('/api/categorize')
      .then((r) => r.json())
      .then((d: { status: string }) => {
        if (d.status === 'running' || d.status === 'stopping') setPipelineRunning(true)
      })
      .catch(() => {})
  }, [])

  async function handleAnalyzeImages() {
    if (analyzing) return
    setAnalyzing(true)
    try {
      // Run batches until ALL images are processed (no cap)
      while (true) {
        const res = await fetch('/api/analyze/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 50 }),
        })
        const data = (await res.json()) as { analyzed: number; remaining: number }
        setImageStats((prev) =>
          prev ? { ...prev, tagged: prev.total - data.remaining, remaining: data.remaining } : null,
        )
        if (data.remaining === 0) break
      }
    } catch {
      // silent — refresh stats on error
      const statsRes = await fetch('/api/analyze/images')
      const stats = (await statsRes.json()) as ImageStats
      setImageStats(stats)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSearch() {
    if (!query.trim() || loading) return
    setLoading(true)
    setError('')
    setResults([])
    setInternetResults([])
    setExplanation('')
    setSearched(true)
    try {
      if (internetSearch) {
        // ── Internet search: server proxies Jina (bypasses browser VPN/DNS issues) ──
        const aiRes = await fetch('/api/search/internet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
        })
        const aiData = (await aiRes.json()) as {
          results?: InternetResult[]
          explanation?: string
          error?: string
        }
        if (!aiRes.ok) throw new Error(aiData.error ?? 'Internet search failed')
        setInternetResults(aiData.results ?? [])
        setExplanation(aiData.explanation ?? '')
      } else {
        const res = await fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
        })
        const data = (await res.json()) as {
          bookmarks?: AIBookmark[]
          explanation?: string
          error?: string
        }
        if (!res.ok) throw new Error(data.error ?? 'Search failed')
        setResults(data.bookmarks ?? [])
        setExplanation(data.explanation ?? '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      void handleSearch()
    }
  }

  function handleExampleClick(example: string) {
    setQuery(example)
    // Use a short timeout so the state update propagates before the search fires
    setTimeout(() => {
      void handleSearch()
    }, 100)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
          <Sparkles size={12} /> {t.aiPoweredSearch}
        </div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">
          {t.findAnything}
        </h1>
        <p className="text-zinc-500 text-sm">
          {t.aiSearchSubtitle}
        </p>
      </div>

      {/* Search box */}
      <div className="relative mb-3">
        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`e.g. "that funny meme about devs crying over AI" or "Solana tools for tracking wallets"`}
          rows={3}
          className="w-full px-4 py-4 pr-36 rounded-2xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
        />
        <button
          onClick={() => void handleSearch()}
          disabled={loading || !query.trim()}
          className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {loading ? (internetSearch ? t.searchingInternet : 'Searching\u2026') : 'Search'}
        </button>
        {/* Internet search toggle */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInternetSearch((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              internetSearch
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title={t.internetSearchTooltip}
          >
            <GlobeIcon size={12} />
            {t.internetSearch}
          </button>
        </div>
      </div>
      <p className="text-xs text-zinc-600 mb-8 text-right">⌘+Enter to search</p>

      {/* Image analysis status — hidden while main pipeline is running (it handles vision internally) */}
      {imageStats !== null && !pipelineRunning && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 mb-6 text-xs">
          <ImageIcon size={13} className="text-zinc-500 shrink-0" />
          <div className="flex-1 min-w-0">
            {imageStats.remaining === 0 ? (
              <span className="text-zinc-400">
                <span className="text-emerald-400 font-medium">{imageStats.tagged}</span> images analyzed for visual search
              </span>
            ) : (
              <span className="text-zinc-400">
                <span className="text-indigo-400 font-medium">{imageStats.tagged}</span> of{' '}
                <span className="font-medium">{imageStats.total}</span> images analyzed —{' '}
                <span className="text-zinc-500">{imageStats.remaining} remaining</span>
              </span>
            )}
          </div>
          {imageStats.remaining > 0 && (
            <button
              onClick={() => void handleAnalyzeImages()}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors shrink-0"
            >
              {analyzing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {analyzing ? 'Analyzing…' : 'Analyze images'}
            </button>
          )}
        </div>
      )}

      {/* Example queries — shown only before first search */}
      {!searched && (
        <div className="mb-8">
          <p className="text-xs text-zinc-600 mb-3 uppercase tracking-wider">Try these</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => handleExampleClick(ex)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && results.length === 0 && internetResults.length === 0 && !error && (
        <div className="text-center py-16 text-zinc-600">
          <BookMarked size={36} className="mx-auto mb-3 opacity-30" />
          <p>{internetSearch ? 'No web results found.' : t.noBookmarksMatchedDescription}</p>
        </div>
      )}

      {/* Results — Internet search */}
      {internetResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-400">{explanation}</p>
            <span className="text-xs text-zinc-600">
              {internetResults.length} web result{internetResults.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {internetResults.map((r, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800/40 rounded-2xl p-5 hover:border-zinc-700/60 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-zinc-200 truncate block hover:text-white transition-colors"
                    >
                      {r.title}
                    </a>
                    <p className="text-[11px] text-emerald-500/70 font-medium mt-0.5 truncate">{new URL(r.url).hostname}</p>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-indigo-500/20 hover:text-indigo-400 text-zinc-400 text-xs font-medium transition-all"
                  >
                    <ExternalLink size={10} />
                    Open
                  </a>
                </div>
                {r.description && (
                  <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-2 mb-2">{r.description}</p>
                )}
                {r.aiSummary && (
                  <div className="flex items-start gap-1.5 mb-2 px-3 py-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                    <Sparkles size={10} className="text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-indigo-300/80 leading-relaxed">{r.aiSummary}</span>
                  </div>
                )}
                {/* Relevance bar */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-600 font-medium">Relevance</span>
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(r.aiRelevance * 100)}%`,
                        backgroundColor: r.aiRelevance > 0.7 ? '#22c55e' : r.aiRelevance > 0.4 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-600 tabular-nums font-medium">{Math.round(r.aiRelevance * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results — Local bookmarks */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-400">{explanation}</p>
            <span className="text-xs text-zinc-600">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-col gap-6">
            {results.map((b) => (
              <div key={b.id}>
                {b.highlight && (
                  <div
                    className="mb-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/40 text-xs text-zinc-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: b.highlight }}
                  />
                )}
                {b.aiReason && (
                  <div className="flex items-start gap-1.5 mb-2 px-1">
                    <Sparkles size={10} className="text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-indigo-400/80 leading-relaxed">{b.aiReason}</span>
                  </div>
                )}
                {/* Cast to BookmarkWithMedia since BookmarkCard does not use the AI-specific fields */}
                <BookmarkCard bookmark={b as BookmarkWithMedia} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unused import guard — Search icon used as aria hint */}
      <span className="sr-only">
        <Search size={0} />
      </span>
    </div>
  )
}
