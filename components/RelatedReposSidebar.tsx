'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ExternalLink, Star, GitFork, Plus, Check, Loader2, ChevronRight, Sparkles, TrendingUp, FolderOpen, X, RefreshCw, History, Clock, Search, ChevronDown, ChevronUp, Loader } from 'lucide-react'

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

interface RepoPreview {
  fullName: string
  description: string | null
  url: string
  stars: number
  language: string | null
  topics: string[]
  readmePreview: string | null
  analysis: {
    summary: string
    features: { title: string; description: string }[]
    useCases: { scenario: string; description: string }[]
    techStack: string[]
  } | null
  analysisZh: {
    summary: string
    features: { title: string; description: string }[]
    useCases: { scenario: string; description: string }[]
  } | null
}

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

const TABS = [
  { key: 'similar', label: '相关推荐', icon: Sparkles },
  { key: 'trending', label: '热门仓库', icon: TrendingUp },
  { key: 'by-language', label: '按语言', icon: FolderOpen },
  { key: 'history', label: '历史记录', icon: History },
] as const

// ── SearchCard ────────────────────────────────────────────────────────────────

function SearchCard({ repo, onAdd, added, cache }: { repo: SearchRepo; onAdd: (r: SearchRepo) => void; added: boolean; cache: Map<string, string> }) {
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (adding || added) return
    setAdding(true)
    try {
      const [owner, repoName] = repo.fullName.split('/')
      const res = await fetch('/api/github-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo: repoName }),
      })
      if (res.ok) onAdd(repo)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500 truncate font-bold">{repo.fullName.split('/')[0]}</p>
          <p className="text-xs font-black text-gray-800 truncate">{repo.fullName.split('/')[1]}</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || added}
          className={`shrink-0 p-1.5 rounded-lg text-xs transition-all ${
            added
              ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
              : adding
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'bg-zinc-800 hover:bg-indigo-500/20 hover:text-indigo-400 text-zinc-500'
          }`}
          title={added ? '已收藏' : '添加到收藏'}
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : added ? <Check size={12} /> : <Plus size={12} />}
        </button>
      </div>

      {repo.description && (
        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 font-bold">
          <TranslatedText text={repo.description} cache={cache} className="text-zinc-400" />
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-bold">
          <Star size={10} className="fill-amber-500 text-amber-500" />
          {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-bold">
          <GitFork size={10} className="text-zinc-500" />
          {repo.forks >= 1000 ? `${(repo.forks / 1000).toFixed(1)}k` : repo.forks}
        </span>
        {repo.language && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor(repo.language) }} />
            {repo.language}
          </span>
        )}
      </div>

      {repo.topics.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {repo.topics.slice(0, 4).map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-bold">
              {t}
            </span>
          ))}
        </div>
      )}

      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors font-bold mt-auto"
      >
        在 GitHub 查看 <ExternalLink size={9} />
      </a>
    </div>
  )
}

// ── HistoryCard ────────────────────────────────────────────────────────────────

function HistoryCard({ repo, cache }: { repo: HistoryRepo; cache: Map<string, string> }) {
  const savedDate = new Date(repo.savedAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500 truncate font-bold">{repo.fullName.split('/')[0]}</p>
          <p className="text-xs font-black text-gray-800 truncate">{repo.fullName.split('/')[1]}</p>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-[9px] text-zinc-600 font-bold">
          <Clock size={9} />
          {savedDate}
        </span>
      </div>

      {repo.description && (
        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 font-bold">
          <TranslatedText text={repo.description} cache={cache} className="text-zinc-400" />
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-bold">
          <Star size={10} className="fill-amber-500 text-amber-500" />
          {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-bold">
          <GitFork size={10} className="text-zinc-500" />
          {repo.forks >= 1000 ? `${(repo.forks / 1000).toFixed(1)}k` : repo.forks}
        </span>
        {repo.language && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        {repo.mode && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600 font-bold">
            {repo.mode === 'similar' ? '相关' : repo.mode === 'trending' ? '热门' : '按语言'}
          </span>
        )}
      </div>

      {repo.topics.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {repo.topics.slice(0, 4).map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-bold">
              {t}
            </span>
          ))}
        </div>
      )}

      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors font-bold mt-auto"
      >
        在 GitHub 查看 <ExternalLink size={9} />
      </a>
    </div>
  )
}

// ── PreviewCard ───────────────────────────────────────────────────────────────

function PreviewCard({
  preview,
  onAdd,
  onCancel,
  loading,
  added,
  cache,
}: {
  preview: RepoPreview
  onAdd: () => void
  onCancel: () => void
  loading: boolean
  added: boolean
  cache: Map<string, string>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-zinc-900 border border-indigo-500/30 rounded-xl overflow-hidden flex flex-col gap-0">
      {/* Header */}
      <div
        className="w-full p-3 flex flex-col gap-2"
        style={{ background: `linear-gradient(135deg, ${langColor(preview.language)}22 0%, ${langColor(preview.language)}08 100%)` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-zinc-400 truncate font-bold">{preview.fullName.split('/')[0]}</p>
            <p className="text-sm font-black text-zinc-900 truncate">{preview.fullName.split('/')[1]}</p>
          </div>
          <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-bold shrink-0">
            <Star size={10} className="fill-amber-500 text-amber-500" />
            {preview.stars >= 1000 ? `${(preview.stars / 1000).toFixed(1)}k` : preview.stars}
          </span>
        </div>

        {preview.language && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold w-fit">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor(preview.language) }} />
            {preview.language}
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 max-h-96">

        {/* AI Summary — prefer Chinese */}
        {(preview.analysisZh?.summary || preview.analysis?.summary) && (
          <div className="bg-indigo-500/10 rounded-lg p-2.5 border border-indigo-500/20">
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-black mb-1">AI 简介</p>
            <p className="text-xs leading-relaxed text-zinc-200 font-bold">
              <TranslatedText text={preview.analysisZh?.summary ?? preview.analysis!.summary} cache={cache} className="text-zinc-200" />
            </p>
          </div>
        )}

        {/* README Preview (if no AI summary) */}
        {!preview.analysisZh?.summary && !preview.analysis?.summary && preview.readmePreview && (
          <div className="bg-zinc-800/30 rounded-lg p-2.5 border border-zinc-800">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1">README 预览</p>
            <p className="text-[11px] leading-relaxed text-zinc-500 italic line-clamp-3 font-bold">
              {preview.readmePreview}
            </p>
          </div>
        )}

        {/* Features — prefer Chinese */}
        {(preview.analysisZh || preview.analysis) && ((preview.analysisZh || preview.analysis)!.features.length > 0) && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black mb-2">核心功能</p>
            <ul className="space-y-2">
              {(expanded
                ? (preview.analysisZh || preview.analysis)!.features
                : (preview.analysisZh || preview.analysis)!.features.slice(0, 4)
              ).map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-zinc-200">
                      <TranslatedText text={f.title} cache={cache} className="text-zinc-200 font-black" />
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-bold mt-0.5">
                      <TranslatedText text={f.description} cache={cache} className="text-zinc-400" />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {(preview.analysisZh || preview.analysis)!.features.length > 4 && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 mt-2 font-bold transition-colors"
              >
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {expanded ? '收起' : `查看全部 ${(preview.analysisZh || preview.analysis)!.features.length} 个功能`}
              </button>
            )}
          </div>
        )}

        {/* Use Cases — prefer Chinese */}
        {(preview.analysisZh || preview.analysis) && ((preview.analysisZh || preview.analysis)!.useCases.length > 0) && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black mb-2">使用场景</p>
            <ul className="space-y-2">
              {(preview.analysisZh || preview.analysis)!.useCases.map((uc, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-zinc-200">
                      <TranslatedText text={uc.scenario} cache={cache} className="text-zinc-200 font-black" />
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-bold mt-0.5">
                      <TranslatedText text={uc.description} cache={cache} className="text-zinc-400" />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech Stack */}
        {preview.analysis && preview.analysis.techStack.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">技术栈：</span>
            {preview.analysis.techStack.map((s) => (
              <span key={s} className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-bold">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Topics */}
        {preview.topics.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {preview.topics.slice(0, 6).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-bold">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-zinc-800/60 flex items-center gap-2">
        <button
          onClick={onAdd}
          disabled={loading || added}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            added
              ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
              : loading
              ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : added ? <Check size={12} /> : <Plus size={12} />}
          {added ? '已收藏' : loading ? '分析中…' : '添加到收藏'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
        >
          取消
        </button>
      </div>
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export default function RelatedReposSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<typeof TABS[number]['key']>('similar')
  const [repos, setRepos] = useState<SearchRepo[]>([])
  const [historyRepos, setHistoryRepos] = useState<HistoryRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [tabVersion, setTabVersion] = useState<Record<string, number>>({})
  const fetchedVersionRef = useRef<Record<string, number>>({})
  const translateCache = useRef(new Map<string, string>()).current

  // Manual search state
  const [searchInput, setSearchInput] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<RepoPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [addingPreview, setAddingPreview] = useState(false)
  const [previewAdded, setPreviewAdded] = useState(false)

  // Fetch repos when tab or version changes
  useEffect(() => {
    if (collapsed) return

    const key = tab
    const currentVersion = tabVersion[tab] ?? 0

    // Skip if we already fetched this exact (tab, version) combination
    if (fetchedVersionRef.current[key] === currentVersion) return
    fetchedVersionRef.current[key] = currentVersion

    if (tab === 'history') {
      setLoading(true)
      fetch('/api/recommended-history')
        .then((r) => r.json())
        .then((d: { repos?: HistoryRepo[] }) => {
          setHistoryRepos(d.repos ?? [])
        })
        .catch(() => setHistoryRepos([]))
        .finally(() => setLoading(false))
      return
    }

    setLoading(true)
    const params = new URLSearchParams({ mode: tab })
    // Pass version so API rotates through different queries on each refresh
    params.set('refresh', String(currentVersion))
    fetch(`/api/github-related?${params}`)
      .then((r) => r.json())
      .then((d: { repos?: SearchRepo[] }) => {
        setRepos(d.repos ?? [])
      })
      .catch(() => setRepos([]))
      .finally(() => setLoading(false))
  }, [tab, collapsed, tabVersion])

  function handleAdded(repo: SearchRepo) {
    setAdded((prev) => new Set([...prev, repo.fullName]))
    setRepos((prev) => prev.filter((r) => r.fullName !== repo.fullName))
  }

  function handleTabChange(key: typeof TABS[number]['key']) {
    setTab(key)
  }

  function handleSearch() {
    const input = searchInput.trim()
    if (!input || previewing) return

    // Support both "owner/repo" and bare "reponame"
    let owner = ''
    let repo = ''
    if (input.includes('/')) {
      const parts = input.split('/')
      owner = parts[0]?.trim() ?? ''
      repo = parts.slice(1).join('/').trim() ?? ''
    } else {
      // Assume the user just typed a repo name, use 'search' as owner placeholder
      owner = input.split(' ')[0] ?? ''
      repo = ''
    }

    if (!owner || !repo) {
      setPreviewError('请输入正确的仓库格式，例如：facebook/react')
      return
    }

    setPreviewing(true)
    setPreviewError(null)
    setPreview(null)
    setPreviewAdded(false)

    fetch('/api/repos/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo }),
    })
      .then((r) => r.json())
      .then((d: { error?: string; alreadyExists?: boolean; fullName?: string }) => {
        if (d.error) {
          setPreviewError(d.error)
          return
        }
        if (d.alreadyExists) {
          setPreviewError(`"${d.fullName}" 已在收藏中`)
          return
        }
        setPreview(d as RepoPreview)
      })
      .catch(() => setPreviewError('分析失败，请重试'))
      .finally(() => setPreviewing(false))
  }

  function handlePreviewCancel() {
    setPreview(null)
    setPreviewing(false)
    setPreviewError(null)
    setSearchInput('')
    setPreviewAdded(false)
  }

  function handlePreviewAdd() {
    if (!preview || addingPreview || previewAdded) return
    const [owner, repo] = preview.fullName.split('/')
    setAddingPreview(true)
    fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner,
        repo,
        description: preview.description,
        url: preview.url,
        stars: preview.stars,
        language: preview.language,
        topics: preview.topics,
        readmeContent: preview.readmePreview,
        analysis: preview.analysis,
        analysisZh: preview.analysisZh,
      }),
    })
      .then((r) => r.json())
      .then((d: { alreadyExists?: boolean }) => {
        if (d.alreadyExists) {
          setPreviewError('该仓库已在收藏中')
        } else {
          setPreviewAdded(true)
          setAdded((prev) => new Set([...prev, preview.fullName]))
        }
      })
      .catch(() => setPreviewError('添加失败，请重试'))
      .finally(() => setAddingPreview(false))
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-zinc-800 border border-zinc-700 border-r-0 rounded-l-xl px-2 py-4 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
        title="展开推荐面板"
      >
        <ChevronRight size={16} className="rotate-180" />
      </button>
    )
  }

  return (
    <div className="w-80 shrink-0 flex flex-col bg-zinc-950 border-l border-zinc-800/60 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-sm font-black text-zinc-200">推荐仓库</span>
        </div>
        <div className="flex items-center gap-1">
          {tab !== 'history' && (
            <button
              onClick={() => setTabVersion((prev) => ({ ...prev, [tab]: (prev[tab] ?? 0) + 1 }))}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="刷新推荐"
            >
              <RefreshCw size={13} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="收起面板"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="px-3 py-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPreviewError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索仓库，如：facebook/react"
              className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-[11px] focus:outline-none focus:border-indigo-500/60 transition-all font-bold"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={previewing || !searchInput.trim()}
            className="shrink-0 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold text-white transition-all flex items-center gap-1"
          >
            {previewing ? <Loader size={10} className="animate-spin" /> : <Sparkles size={10} />}
            分析
          </button>
        </div>
        {previewError && (
          <p className="text-[10px] text-red-400 mt-1 font-bold">{previewError}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/60">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-bold transition-all ${
                tab === t.key
                  ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              <Icon size={10} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Preview card */}
        {preview && (
          <PreviewCard
            preview={preview}
            onAdd={handlePreviewAdd}
            onCancel={handlePreviewCancel}
            loading={addingPreview}
            added={previewAdded}
            cache={translateCache}
          />
        )}

        {/* Loading state */}
        {loading && !preview && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-indigo-400 animate-spin" />
          </div>
        )}

        {/* History tab */}
        {!preview && !loading && tab === 'history' && (
          historyRepos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History size={24} className="text-zinc-700 mb-2" />
              <p className="text-zinc-600 text-xs font-bold">暂无历史记录</p>
              <p className="text-zinc-700 text-[10px] mt-1 font-bold">浏览推荐后会自动保存</p>
            </div>
          ) : (
            historyRepos.map((repo) => (
              <HistoryCard key={repo.id} repo={repo} cache={translateCache} />
            ))
          )
        )}

        {/* Empty state for repos tabs */}
        {!preview && !loading && tab !== 'history' && repos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-zinc-600 text-xs font-bold">暂无推荐</p>
            <p className="text-zinc-700 text-[10px] mt-1 font-bold">试试其他标签或手动搜索</p>
          </div>
        )}

        {/* Repo cards */}
        {!preview && !loading && tab !== 'history' && repos.length > 0 && (
          repos.map((repo) => (
            <SearchCard
              key={repo.fullName}
              repo={repo}
              onAdd={handleAdded}
              added={added.has(repo.fullName)}
              cache={translateCache}
            />
          ))
        )}
      </div>
    </div>
  )
}
