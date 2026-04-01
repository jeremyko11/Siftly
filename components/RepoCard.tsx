'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ExternalLink, Star, Sparkles, RotateCw, ChevronDown, ChevronUp, Folder, FileCode, Loader2 } from 'lucide-react'
import type { Repo } from '@/lib/types'
import { useI18n } from '@/lib/i18n-context'

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572a5',
  Rust: '#dea584', Go: '#00add8', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', Swift: '#f05138', Kotlin: '#a97bff',
  Dart: '#00b4ab', PHP: '#4f5d95', Scala: '#c22d40', Shell: '#89e051',
  HTML: '#e34c26', CSS: '#563d7c',
}

function getLangColor(lang: string | null): string {
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

// ── File Tree ────────────────────────────────────────────────────────────────

interface FileNode { name: string; type: 'file' | 'dir'; sha: string }

function FileTree({ owner, repo }: { owner: string; repo: string }) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ab = new AbortController()
    fetch(`/api/github-contents?owner=${owner}&repo=${repo}`, { signal: ab.signal })
      .then((r) => r.json())
      .then((d: { tree?: FileNode[] }) => {
        setTree(d.tree ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
    return () => ab.abort()
  }, [owner, repo])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-zinc-500">
        <div className="w-3 h-3 rounded-full border border-zinc-600 border-t-transparent animate-spin" />
        加载文件树…
      </div>
    )
  }

  if (tree.length === 0) return null

  // Show top 20 entries
  const shown = tree.slice(0, 20)
  const more = tree.length - shown.length

  return (
    <div className="px-3 py-2 bg-zinc-950/50 border-t border-zinc-800/50">
      <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1.5">项目结构</p>
      <div className="space-y-0.5 max-h-28 overflow-y-auto">
        {shown.map((node) => (
          <div key={node.sha} className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
            {node.type === 'dir' ? (
              <Folder size={10} className="text-blue-400 shrink-0" />
            ) : (
              <FileCode size={10} className="text-zinc-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
        ))}
        {more > 0 && (
          <p className="text-[9px] text-zinc-600 italic mt-1">+ 还有 {more} 个文件/文件夹…</p>
        )}
      </div>
    </div>
  )
}

// ── RepoCard ────────────────────────────────────────────────────────────────

interface RepoFeature { title: string; description: string }
interface RepoUseCase { scenario: string; description: string }
interface LocalAnalysis {
  summary: string
  features: RepoFeature[]
  useCases: RepoUseCase[]
  techStack: string[]
}

interface RepoCardProps { repo: Repo }

export default function RepoCard({ repo }: RepoCardProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [localAnalysis, setLocalAnalysis] = useState<LocalAnalysis | null>(null)
  const cache = useRef(new Map<string, string>()).current
  const isAnalyzed = !!(repo.features && repo.features.length > 0)

  let topics: string[] = []
  try { topics = repo.topics ?? [] } catch { topics = [] }

  // Merge: localAnalysis takes precedence; prefer Chinese (Zh) fields when available
  const summaryZh = localAnalysis?.summary ?? repo.summaryZh ?? null
  const summary = localAnalysis?.summary ?? repo.summary ?? null
  const featuresZh = localAnalysis?.features ?? (repo.featuresZh ?? null)
  const features = localAnalysis?.features ?? (repo.features ?? null)
  const useCasesZh = localAnalysis?.useCases ?? (repo.useCasesZh ?? null)
  const useCases = localAnalysis?.useCases ?? (repo.useCases ?? null)
  const techStack = localAnalysis?.techStack ?? (repo.techStack ?? null)
  const hasLocalAnalysis = !!localAnalysis
  const hasAnyAnalysis = isAnalyzed || hasLocalAnalysis

  async function handleReanalyze() {
    if (analyzing) return
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/repos/${repo.id}/reanalyze`, { method: 'POST' })
      const data = await res.json() as { analysis?: LocalAnalysis; error?: string }
      if (data.analysis) {
        setLocalAnalysis(data.analysis)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col h-[560px]">

      {/* Preview header — language gradient */}
      <div className="relative w-full shrink-0" style={{ height: '130px', background: `linear-gradient(135deg, ${getLangColor(repo.language)}22 0%, ${getLangColor(repo.language)}08 100%)` }}>
        {/* Owner + repo name overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 mb-1">
            <img
              src={`https://github.com/${repo.owner}.png?size=32`}
              alt={repo.owner}
              className="w-6 h-6 rounded-full bg-zinc-800"
              loading="lazy"
              decoding="async"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-400 truncate font-bold">{repo.owner}</p>
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-black truncate block hover:text-zinc-700" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                {repo.name}
              </a>
            </div>
          </div>
        </div>
        {/* Top badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {repo.language && (
            <span className="flex items-center gap-1 bg-zinc-950/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-black text-zinc-200">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLangColor(repo.language) }} />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1 bg-zinc-950/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-black text-zinc-200">
            <Star size={9} className="fill-amber-500 text-amber-500" />
            {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
          </span>
        </div>
        {/* External link */}
        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 backdrop-blur-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          <ExternalLink size={12} />
        </a>
      </div>

      {/* File tree */}
      <FileTree owner={repo.owner} repo={repo.name} />

      {/* Content scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

        {/* Description — always show */}
        {repo.description && (
          <p className="text-xs leading-relaxed font-bold text-zinc-400 bg-zinc-800/40 rounded-lg p-2.5 border border-zinc-800">
            <TranslatedText text={repo.description} cache={cache} className="text-zinc-300" />
          </p>
        )}

        {/* Topics */}
        {topics.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {topics.slice(0, 5).map((t) => (
              <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700/50 font-bold">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* README preview — removed since readmeContent no longer returned by API */}

        {/* AI Summary — prefer Chinese */}
        {hasAnyAnalysis && (summaryZh || summary) && (
          <div className="bg-indigo-500/8 rounded-lg p-3 border border-indigo-500/20">
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-black mb-1.5">AI 简介</p>
            <p className="text-xs leading-relaxed text-zinc-200 font-bold">
              {summaryZh || summary}
            </p>
          </div>
        )}

        {/* Features — prefer Chinese */}
        {hasAnyAnalysis && (featuresZh || features) && (featuresZh || features)!.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black mb-2">核心功能</p>
            <ul className="space-y-2">
              {(expanded
                ? (featuresZh || features)!
                : (featuresZh || features)!.slice(0, 5)
              ).map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-zinc-200">{f.title}</span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-bold mt-0.5">{f.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            {!expanded && (featuresZh || features)!.length > 5 && (
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 mt-2 font-bold transition-colors"
              >
                <ChevronDown size={10} />
                查看全部 {(featuresZh || features)!.length} 个功能
              </button>
            )}
          </div>
        )}

        {/* Use cases — prefer Chinese */}
        {hasAnyAnalysis && (useCasesZh || useCases) && (useCasesZh || useCases)!.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black mb-2">使用场景</p>
            <ul className="space-y-2">
              {(useCasesZh || useCases)!.map((uc, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-zinc-200">{uc.scenario}</span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-bold mt-0.5">{uc.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech stack */}
        {hasAnyAnalysis && techStack && techStack.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">技术栈：</span>
            {techStack.map((s) => (
              <span key={s} className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-bold">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-zinc-800/60 flex items-center gap-2 shrink-0">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          {t.viewOnGithub}
        </a>

        {hasAnyAnalysis ? (
          <button
            onClick={handleReanalyze}
            disabled={analyzing}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50 font-bold"
            title={t.reanalyze}
          >
            <RotateCw size={10} className={analyzing ? 'animate-spin' : ''} />
            {analyzing ? t.analyzing : t.reanalyze}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600 ml-auto font-bold">
            <Sparkles size={10} className="text-indigo-400" />
            {t.pendingAiAnalysis}
          </span>
        )}
      </div>
    </div>
  )
}
