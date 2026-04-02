'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, TrendingUp, FolderOpen, RefreshCw, Loader2, ExternalLink, Star, GitFork, Plus, Check, History, Compass, Search } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SearchRepo {
  fullName: string
  description: string | null
  stars: number
  forks: number
  language: string | null
  topics: string[]
  url: string
}

interface HistoryRepo {
  id: string
  fullName: string
  description: string | null
  stars: number
  forks: number
  language: string | null
  topics: string[]
  url: string
  mode: string
  added: boolean
  savedAt: string
}

// ── Language colors ───────────────────────────────────────────────────────────

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572a5',
  Rust: '#dea584', Go: '#00add8', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', Swift: '#f05138', Kotlin: '#a97bff',
  Dart: '#00b4ab', PHP: '#4f5d95', Scala: '#c22d40', Shell: '#89e051',
  HTML: '#e34c26', CSS: '#563d7c',
}

function langColor(lang: string | null): string {
  if (!lang) return '#71717a'
  return LANGUAGE_COLORS[lang] ?? '#71717a'
}

// ── Translation ────────────────────────────────────────────────────────────────

function TranslatedText({ text, cache, className }: { text: string; cache: Map<string, string>; className?: string }) {
  const [translated, setTranslated] = useState<string | null>(null)
  useEffect(() => {
    const cached = cache.get(text)
    if (cached) { setTranslated(cached); return }
    const ab = new AbortController()
    fetch(`/api/translate?q=${encodeURIComponent(text)}`, { signal: ab.signal })
      .then((r) => r.json())
      .then((d: { translatedText?: string }) => {
        if (d.translatedText) { cache.set(text, d.translatedText); setTranslated(d.translatedText) }
      })
      .catch(() => {})
    return () => ab.abort()
  }, [text, cache])
  return <span className={className}>{translated ?? text}</span>
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'similar', label: '相关推荐', icon: Sparkles },
  { key: 'trending', label: '热门仓库', icon: TrendingUp },
  { key: 'by-language', label: '按语言', icon: FolderOpen },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'history', label: '历史记录', icon: History },
] as const

// ── Discover Card (sideidea-style) ─────────────────────────────────────────────

function DiscoverCard({
  repo,
  onAdd,
  added,
  cache,
  isHistory = false,
  savedAt,
}: {
  repo: SearchRepo | HistoryRepo
  onAdd?: (r: SearchRepo) => void
  added?: boolean
  cache: Map<string, string>
  isHistory?: boolean
  savedAt?: string
}) {
  const [adding, setAdding] = useState(false)
  const [isAdded, setIsAdded] = useState(added ?? false)

  async function handleAdd() {
    if (adding || isAdded || !onAdd) return
    setAdding(true)
    try {
      const [owner, repoName] = repo.fullName.split('/')
      const res = await fetch('/api/github-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo: repoName }),
      })
      if (res.ok) {
        setIsAdded(true)
        onAdd(repo as SearchRepo)
      }
    } finally {
      setAdding(false)
    }
  }

  const savedDate = savedAt
    ? new Date(savedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="group bg-zinc-900/60 border border-zinc-800/40 rounded-2xl p-5 flex flex-col gap-3 hover:border-zinc-700/60 hover:bg-zinc-900/80 transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-zinc-500 truncate font-medium">{repo.fullName.split('/')[0]}</p>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-zinc-200 truncate block hover:text-white transition-colors"
          >
            {repo.fullName.split('/')[1]}
          </a>
        </div>
        {!isHistory && onAdd && (
          <button
            onClick={handleAdd}
            disabled={adding || isAdded}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isAdded
                ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                : adding
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'bg-zinc-800 hover:bg-indigo-500/20 hover:text-indigo-400 text-zinc-400'
            }`}
          >
            {adding ? <Loader2 size={11} className="animate-spin" /> : isAdded ? <Check size={11} /> : <Plus size={11} />}
            {isAdded ? '已收藏' : '添加'}
          </button>
        )}
        {isHistory && savedDate && (
          <span className="shrink-0 flex items-center gap-1 text-[10px] text-zinc-600 font-medium">
            {savedDate}
          </span>
        )}
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-2">
          <TranslatedText text={repo.description} cache={cache} className="text-zinc-400" />
        </p>
      )}

      {/* Stats + language */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-[12px] text-zinc-400 font-medium">
          <Star size={11} className="text-amber-500/70 fill-amber-500/70" />
          {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-zinc-500 font-medium">
          <GitFork size={11} />
          {repo.forks >= 1000 ? `${(repo.forks / 1000).toFixed(1)}k` : repo.forks}
        </span>
        {repo.language && (
          <span className="flex items-center gap-1 text-[12px] text-zinc-400 font-medium">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        {isHistory && (repo as HistoryRepo).mode && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-600 font-medium">
            {(repo as HistoryRepo).mode === 'similar' ? '相关' : (repo as HistoryRepo).mode === 'trending' ? '热门' : '按语言'}
          </span>
        )}
      </div>

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {repo.topics.slice(0, 5).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/70 text-zinc-500 font-medium">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* GitHub link */}
      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors font-medium mt-auto"
      >
        在 GitHub 查看 <ExternalLink size={10} />
      </a>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<typeof TABS[number]['key']>('similar')
  const [repos, setRepos] = useState<SearchRepo[]>([])
  const [historyRepos, setHistoryRepos] = useState<HistoryRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [tabVersion, setTabVersion] = useState<Record<string, number>>({})
  const translateCache = useRef(new Map<string, string>()).current

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchSort, setSearchSort] = useState('stars')
  const searchInputRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch repos when tab or refresh version changes
  useEffect(() => {
    // Immediately clear old data so tab switch feels instant
    if (tab === 'history') {
      setHistoryRepos([])
    } else {
      setRepos([])
    }
    setLoading(true)

    if (tab === 'history') {
      fetch('/api/recommended-history')
        .then((r) => r.json())
        .then((d: { repos?: HistoryRepo[] }) => setHistoryRepos(d.repos ?? []))
        .catch(() => setHistoryRepos([]))
        .finally(() => setLoading(false))
      return
    }

    if (tab === 'search') {
      // Search tab doesn't auto-fetch; wait for user input
      setLoading(false)
      return
    }

    const version = tabVersion[tab] ?? 0
    const params = new URLSearchParams({ mode: tab, refresh: String(version) })
    fetch(`/api/github-related?${params}`)
      .then((r) => r.json())
      .then((d: { repos?: SearchRepo[] }) => setRepos(d.repos ?? []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false))
  }, [tab, tabVersion])

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (searchInputRef.current) clearTimeout(searchInputRef.current)
    if (!q.trim()) { setRepos([]); setSearchTotal(0); return }
    searchInputRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`/api/github-search?q=${encodeURIComponent(q.trim())}&sort=${searchSort}`)
        .then((r) => r.json())
        .then((d: { repos?: SearchRepo[]; total?: number }) => {
          setRepos(d.repos ?? [])
          setSearchTotal(d.total ?? 0)
        })
        .catch(() => setRepos([]))
        .finally(() => setLoading(false))
    }, 400)
  }

  // Re-fetch when sort changes on search tab (immediate, no debounce)
  useEffect(() => {
    if (tab !== 'search' || !searchQuery.trim()) return
    setLoading(true)
    fetch(`/api/github-search?q=${encodeURIComponent(searchQuery.trim())}&sort=${searchSort}`)
      .then((r) => r.json())
      .then((d: { repos?: SearchRepo[]; total?: number }) => {
        setRepos(d.repos ?? [])
        setSearchTotal(d.total ?? 0)
      })
      .catch(() => setRepos([]))
      .finally(() => setLoading(false))
  }, [searchSort, tab])

  function handleAdded(repo: SearchRepo) {
    setAdded((prev) => new Set([...prev, repo.fullName]))
    setRepos((prev) => prev.filter((r) => r.fullName !== repo.fullName))
  }

  const displayedRepos = tab === 'history' ? historyRepos : repos
  const currentMode = tab === 'history' ? 'history' : tab

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/40">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Compass size={16} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100">发现仓库</h1>
              <p className="text-xs text-zinc-500">AI 推荐 · 前沿技术 · 持续更新</p>
            </div>
            {tab === 'search' && (
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="搜索 GitHub 仓库..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-indigo-500/60 transition-all w-56"
                  />
                </div>
                {/* Sort buttons */}
                <div className="flex items-center gap-1 bg-zinc-800 rounded-xl p-1 border border-zinc-700">
                  {[
                    { key: '', label: '最佳匹配' },
                    { key: 'stars', label: '收藏数' },
                    { key: 'updated', label: '更新时间' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSearchSort(key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        searchSort === key
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {searchTotal > 0 && (
                  <span className="text-xs text-zinc-500">{searchTotal.toLocaleString()} 个结果</span>
                )}
              </div>
            )}
            {tab !== 'history' && tab !== 'search' && (
              <button
                onClick={() => setTabVersion((prev) => ({ ...prev, [tab]: (prev[tab] ?? 0) + 1 }))}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700/50 hover:border-zinc-600 transition-all"
              >
                <RefreshCw size={11} />
                刷新
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    tab === t.key
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800/60 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Loading skeletons — show instantly on tab switch */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800/40 rounded-2xl p-5 animate-pulse">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-2.5 w-16 bg-zinc-800 rounded-full mb-2" />
                    <div className="h-3.5 w-32 bg-zinc-800 rounded-full" />
                  </div>
                  <div className="h-7 w-16 bg-zinc-800 rounded-xl shrink-0" />
                </div>
                <div className="space-y-1.5 mb-3">
                  <div className="h-2.5 w-full bg-zinc-800/70 rounded-full" />
                  <div className="h-2.5 w-3/4 bg-zinc-800/70 rounded-full" />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-3 w-10 bg-zinc-800 rounded-full" />
                  <div className="h-3 w-10 bg-zinc-800 rounded-full" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-5 w-14 bg-zinc-800 rounded-full" />
                  <div className="h-5 w-16 bg-zinc-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && displayedRepos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-center mb-4">
              {tab === 'search' ? <Search size={22} className="text-zinc-700" /> : <Compass size={22} className="text-zinc-700" />}
            </div>
            <h3 className="text-base font-semibold text-zinc-500 mb-1.5">
              {tab === 'history' ? '暂无历史记录' : tab === 'search' ? (searchQuery ? '未找到相关仓库' : '输入关键词搜索 GitHub') : '暂无推荐'}
            </h3>
            <p className="text-sm text-zinc-600 max-w-xs">
              {tab === 'history' ? '浏览推荐后会自动保存到这里' : tab === 'search' ? (searchQuery ? '尝试其他关键词' : '例如：React admin dashboard、Python AI agent') : '点击刷新按钮获取新的推荐'}
            </p>
          </div>
        )}

        {/* Cards grid — 2 columns on md+, 3 on xl+ */}
        {!loading && displayedRepos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayedRepos.map((repo) => (
              <DiscoverCard
                key={tab === 'history' ? (repo as HistoryRepo).id : (repo as SearchRepo).fullName}
                repo={repo}
                onAdd={tab !== 'history' ? handleAdded : undefined}
                added={added.has(repo.fullName)}
                cache={translateCache}
                isHistory={tab === 'history'}
                savedAt={tab === 'history' ? (repo as HistoryRepo).savedAt : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
