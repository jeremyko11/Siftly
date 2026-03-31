'use client'

import React, { useState } from 'react'
import { ExternalLink, Star, GitFork, Sparkles, RotateCw, ChevronDown, ChevronUp } from 'lucide-react'
import type { Repo } from '@/lib/types'

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  PHP: '#4f5d95',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
}

function getLangColor(lang: string | null): string {
  if (!lang) return '#71717a'
  return LANGUAGE_COLORS[lang] ?? '#71717a'
}

interface RepoCardProps {
  repo: Repo
}

export default function RepoCard({ repo }: RepoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  let topics: string[] = []
  try { topics = repo.topics ?? [] } catch { topics = [] }

  async function handleReanalyze() {
    if (analyzing) return
    setAnalyzing(true)
    try {
      await fetch(`/api/repos/${repo.id}/reanalyze`, { method: 'POST' })
      // Parent will refresh via re-fetch; for now just show loading
    } finally {
      setAnalyzing(false)
    }
  }

  const isAnalyzed = !!repo.features && repo.features.length > 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Owner avatar */}
            <img
              src={`https://github.com/${repo.owner}.png?size=40`}
              alt={repo.owner}
              className="w-7 h-7 rounded-full shrink-0 bg-zinc-800"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 truncate">{repo.owner}</p>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-zinc-100 hover:text-white truncate block"
              >
                {repo.name}
              </a>
            </div>
          </div>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
          >
            <ExternalLink size={13} />
          </a>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-xs text-zinc-400 leading-relaxed mb-3 line-clamp-2">
            {repo.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {repo.stars > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Star size={11} className="fill-amber-500 text-amber-500" />
              {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
            </span>
          )}
          {repo.language && (
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getLangColor(repo.language) }}
              />
              {repo.language}
            </span>
          )}
          {topics.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700/50"
            >
              {t}
            </span>
          ))}
        </div>

        {/* AI Summary (if analyzed) */}
        {isAnalyzed && repo.summary && (
          <p className="text-xs text-zinc-300 leading-relaxed mb-3 bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-800">
            <span className="text-indigo-400 font-medium">Summary: </span>
            {repo.summary}
          </p>
        )}

        {/* Features (if analyzed) */}
        {isAnalyzed && repo.features && repo.features.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-1.5">Features</p>
            <ul className="space-y-1">
              {repo.features.slice(0, expanded ? undefined : 3).map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span className="text-xs text-zinc-300 leading-relaxed">
                    <span className="font-medium text-zinc-200">{f.title}: </span>
                    {f.description}
                  </span>
                </li>
              ))}
            </ul>
            {repo.features.length > 3 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 mt-1.5 transition-colors"
              >
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {expanded ? 'Show less' : `+${repo.features.length - 3} more`}
              </button>
            )}
          </div>
        )}

        {/* Use cases (if analyzed) */}
        {isAnalyzed && repo.useCases && repo.useCases.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-1.5">Use Cases</p>
            <ul className="space-y-1">
              {repo.useCases.map((uc, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-xs text-zinc-300 leading-relaxed">
                    <span className="font-medium text-zinc-200">{uc.scenario}: </span>
                    {uc.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech stack (if analyzed) */}
        {isAnalyzed && repo.techStack && repo.techStack.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className="text-[10px] text-zinc-600">Stack:</span>
            {repo.techStack.map((t) => (
              <span key={t} className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-zinc-800/60 flex items-center gap-2">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          View on GitHub
        </a>

        {isAnalyzed && (
          <button
            onClick={handleReanalyze}
            disabled={analyzing}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Re-analyze with AI"
          >
            <RotateCw size={10} className={analyzing ? 'animate-spin' : ''} />
            {analyzing ? 'Analyzing…' : 'Re-analyze'}
          </button>
        )}

        {!isAnalyzed && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600 ml-auto">
            <Sparkles size={10} className="text-indigo-400" />
            Pending AI analysis
          </span>
        )}
      </div>
    </div>
  )
}
