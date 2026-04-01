'use client'

import { useState, useEffect, useRef } from 'react'
import { Github, RefreshCw, Search, ArrowUpDown, AlertCircle } from 'lucide-react'
import LazyRepoCard from '@/components/LazyRepoCard'
import RelatedReposSidebar from '@/components/RelatedReposSidebar'
import type { Repo, ReposResponse } from '@/lib/types'
import { useI18n } from '@/lib/i18n-context'

const REPO_GRID_CLASS = 'grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'

export default function ReposPage() {
  const { t } = useI18n()
  const [repos, setRepos] = useState<Repo[]>([])
  const [total, setTotal] = useState(0)
  const [analyzedCount, setAnalyzedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('stars')
  const [hasToken, setHasToken] = useState(true)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchRepos() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (sort) params.set('sort', sort)
      const res = await fetch(`/api/repos?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: ReposResponse = await res.json()
      setRepos(data.repos)
      setTotal(data.total)
      setAnalyzedCount(data.analyzedCount)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function checkToken() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setHasToken(!!data.hasGithubToken)
    } catch {
      setHasToken(false)
    }
  }

  useEffect(() => {
    checkToken()
    fetchRepos()
  }, [])

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/repos/sync', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Sync failed')
      }
      await new Promise((r) => setTimeout(r, 1500))
      await fetchRepos()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  function handleSearch(q: string) {
    setSearch(q)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => { fetchRepos() }, 300)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/60">
        <div className="px-6 md:px-8 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Github size={18} className="text-zinc-300" />
              <h1 className="text-lg font-semibold text-zinc-100">{t.githubRepos}</h1>
              {total > 0 && (
                <span className="text-xs text-zinc-600">
                  {total.toLocaleString()} {t.reposSynced}
                  {analyzedCount > 0 && <span className="text-indigo-400 ml-1">· {analyzedCount} {t.reposAnalyzed}</span>}
                </span>
              )}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || !hasToken}
              className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? t.syncing : t.syncRepos}
            </button>
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                type="text"
                placeholder={t.searchReposPlaceholder}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-indigo-500/60 transition-all"
              />
            </div>
            <button
              onClick={() => { setSort((s) => s === 'stars' ? 'name' : s === 'name' ? 'updated' : 'stars'); void fetchRepos() }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:border-zinc-700 hover:text-zinc-200 transition-all"
            >
              <ArrowUpDown size={11} />
              {sort === 'stars' ? t.sortByStars : sort === 'name' ? t.sortByName : t.sortByRecent}
            </button>
          </div>
        </div>
      </div>

      {/* Content — flex row: repo grid + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main repo grid area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {/* No token banner */}
          {!hasToken && !loading && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">{t.githubTokenNotConfigured}</p>
                <p className="text-xs text-amber-500/80 mt-0.5">
                  {t.githubTokenNotConfiguredDesc}
                </p>
              </div>
            </div>
          )}

          {/* Sync error */}
          {syncError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4 text-xs text-red-400">
              <AlertCircle size={12} />
              {syncError}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className={REPO_GRID_CLASS}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse h-[560px]" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && repos.length === 0 && hasToken && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <Github size={26} className="text-zinc-700" />
              </div>
              <h3 className="text-base font-semibold text-zinc-400 mb-2">{t.noReposSyncedYet}</h3>
              <p className="text-zinc-600 text-sm mb-6 max-w-xs">
                {t.clickSyncReposEmpty}
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? t.syncing : t.syncRepos}
              </button>
            </div>
          )}

          {/* Repos grid — CSS Grid for uniform row alignment */}
          {!loading && repos.length > 0 && (
            <div className={REPO_GRID_CLASS}>
              {repos.map((repo, index) => (
                <LazyRepoCard key={repo.id} repo={repo} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Related repos sidebar */}
        <RelatedReposSidebar />
      </div>
    </div>
  )
}
