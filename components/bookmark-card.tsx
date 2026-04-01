'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Download, Play, Pencil, X, Check, ImageOff, Bookmark, Globe, Maximize2, ChevronRight } from 'lucide-react'
import type { BookmarkWithMedia, Category } from '@/lib/types'
import { useI18n } from '@/lib/i18n-context'

// ── URL helpers ────────────────────────────────────────────────────────────────

export function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export function isGitHub(url: string): boolean {
  return url.includes('github.com')
}

export type LinkType = 'github' | 'cloud' | 'video' | 'news' | 'general'

export function getLinkType(url: string): LinkType {
  if (isGitHub(url)) return 'github'
  const domain = getDomain(url)
  if (domain.includes('baidu.com') || domain.includes('pan.baidu')) return 'cloud'
  if (domain.includes('189.cn') || domain.includes('aliyunpan') || domain.includes('quark.cn') || domain.includes('xunlei') || domain.includes('wenshushu')) return 'cloud'
  if (domain.includes('youtube.com') || domain.includes('youtu.be') || domain.includes('bilibili.com') || domain.includes('b23.tv')) return 'video'
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'general'
  return 'general'
}

export function getLinkColor(type: LinkType): { border: string; bg: string; text: string; hover: string } {
  switch (type) {
    case 'github': return { border: 'border-orange-500/20', bg: 'bg-orange-500/5', text: 'text-orange-300', hover: 'hover:border-orange-500/40 hover:bg-orange-500/10' }
    case 'cloud': return { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-300', hover: 'hover:border-blue-500/40 hover:bg-blue-500/10' }
    case 'video': return { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-300', hover: 'hover:border-red-500/40 hover:bg-red-500/10' }
    default: return { border: 'border-zinc-800', bg: 'bg-zinc-800/40', text: 'text-zinc-300', hover: 'hover:border-zinc-700 hover:bg-zinc-800/70' }
  }
}

// Twitter always shortens links to t.co — strip these from display text
const TCO_REGEX = /https?:\/\/t\.co\/[^\s]+/g

/** Always strip t.co shortlinks — Twitter appends them to every tweet with a link or media */
function stripTcoUrls(text: string): string {
  return text.replace(TCO_REGEX, '').trim()
}

// ── Inline Link Card (GitHub, repos, etc.) ─────────────────────────────────────

function InlineLinkCard({ url }: { url: string }) {
  const lt = getLinkType(url)
  const c = getLinkColor(lt)
  const domain = getDomain(url)
  const pathname = (() => { try { return new URL(url).pathname } catch { return '' } })()

  const iconClass = lt === 'github' ? 'text-orange-400' : lt === 'cloud' ? 'text-blue-400' : lt === 'video' ? 'text-red-400' : 'text-zinc-400'
  const headingClass = lt === 'github' ? 'text-orange-200' : lt === 'cloud' ? 'text-blue-200' : lt === 'video' ? 'text-red-200' : 'text-zinc-200'
  const subColor = lt === 'github' ? 'text-orange-400/60' : lt === 'cloud' ? 'text-blue-400/60' : lt === 'video' ? 'text-red-400/60' : 'text-zinc-600'

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all group/link ${c.border} ${c.bg} ${c.hover}`}
    >
      {lt === 'github' ? (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(251,146,60,0.1)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        </div>
      ) : lt === 'cloud' ? (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="currentColor">
            <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
          </svg>
        </div>
      ) : lt === 'video' ? (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <Play size={20} className="text-red-400 fill-current" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(161,161,170,0.1)' }}>
          <Globe size={20} className="text-zinc-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold group-hover/link:transition-colors truncate ${headingClass}`}
           title={url}>
          {url}
        </p>
      </div>
      <ExternalLink size={14} className="text-zinc-600 group-hover/link:text-zinc-400 transition-colors shrink-0" />
    </a>
  )
}

// ── Link preview ───────────────────────────────────────────────────────────────

interface LinkPreviewData {
  title: string
  description: string
  image: string
  siteName: string
  domain: string
  url: string
}

// Module-level cache: url → preview data (or null on error)
const previewCache = new Map<string, LinkPreviewData | null>()

function LinkPreview({ url, tweetUrl, tweetId, prominent = false, t }: { url: string; tweetUrl: string; tweetId?: string; prominent?: boolean; t: ReturnType<typeof useI18n>['t'] }) {
  const [data, setData] = useState<LinkPreviewData | null | 'loading'>('loading')

  useEffect(() => {
    const cacheKey = tweetId ? `${url}:${tweetId}` : url
    if (previewCache.has(cacheKey)) {
      setData(previewCache.get(cacheKey) ?? null)
      return
    }
    let cancelled = false
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}${tweetId ? `&tweetId=${tweetId}` : ''}`)
      .then((r) => r.json())
      .then((d: LinkPreviewData & { error?: string }) => {
        if (cancelled) return
        const result = d.error || !d.title ? null : d
        previewCache.set(cacheKey, result)
        setData(result)
      })
      .catch(() => {
        if (!cancelled) { previewCache.set(cacheKey, null); setData(null) }
      })
    return () => { cancelled = true }
  }, [url, tweetId])

  if (data === 'loading') {
    return (
      <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-800/40 h-16 animate-pulse" />
    )
  }

  // Fallback: OG fetch failed or returned no title — show a minimal link chip
  if (!data) {
    return (
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${prominent ? 'mt-1' : 'mt-2'} inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800/70 transition-all text-xs text-zinc-400 hover:text-zinc-200 max-w-full overflow-hidden`}
      >
        <Globe size={11} className="shrink-0 text-zinc-600" />
        <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
        <ExternalLink size={10} className="shrink-0 text-zinc-600 ml-auto" />
      </a>
    )
  }

  // X article pages return useless OG data — show a styled "View article" card instead
  const isGenericXArticle = (data.domain === 'x.com' || data.domain === 'twitter.com') && !data.image && !data.description

  const href = data.url || url

  // X article / generic X link with no useful OG data — show a clean "View on X" card
  if (isGenericXArticle) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${prominent ? 'mt-1' : 'mt-2'} flex items-center gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800/70 transition-all group/link px-4 py-3`}
      >
        <div className="w-10 h-10 rounded-lg bg-zinc-700/60 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-400" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-200 group-hover/link:text-white transition-colors">
            {data.title?.includes('Article') ? t.viewArticleOnX : data.title || t.viewOnX}
          </p>
          <p className="text-xs text-zinc-500 truncate">{data.domain}{data.url ? new URL(data.url).pathname : ''}</p>
        </div>
        <ExternalLink size={14} className="text-zinc-600 group-hover/link:text-zinc-400 transition-colors shrink-0" />
      </a>
    )
  }

  // Prominent mode: vertical layout with large image — used for link-only bookmarks
  if (prominent) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-1 flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800/70 transition-all group/link"
      >
        {data.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.image}
            alt=""
            className="w-full h-40 object-cover border-b border-zinc-800"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="flex flex-col px-3 py-2.5 min-w-0 gap-1">
          <p className="text-sm font-semibold text-zinc-200 line-clamp-2 group-hover/link:text-white transition-colors leading-snug">
            {data.title}
          </p>
          {data.description && (
            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
              {data.description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <Globe size={10} className="text-zinc-600 shrink-0" />
            <span className="text-[10px] text-zinc-600 truncate">
              {data.siteName || data.domain}
            </span>
          </div>
        </div>
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800/70 transition-all group/link"
    >
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          className="w-24 h-full object-cover shrink-0 border-r border-zinc-800"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="flex flex-col justify-center px-3 py-2.5 min-w-0 gap-0.5">
        <p className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover/link:text-white transition-colors">
          {data.title}
        </p>
        {data.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 leading-snug">
            {data.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Globe size={10} className="text-zinc-600 shrink-0" />
          <span className="text-[10px] text-zinc-600 truncate">
            {data.siteName || data.domain}
          </span>
        </div>
      </div>
    </a>
  )
}

// Module-level cache so all cards share the same fetched list
let cachedCategories: Category[] | null = null
let cacheFetchPromise: Promise<Category[]> | null = null

async function fetchAllCategories(): Promise<Category[]> {
  if (cachedCategories !== null) return cachedCategories
  if (cacheFetchPromise !== null) return cacheFetchPromise

  cacheFetchPromise = fetch('/api/categories')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
      return res.json()
    })
    .then((data: { categories: Category[] }) => {
      cachedCategories = data.categories
      cacheFetchPromise = null
      return data.categories
    })
    .catch((err) => {
      cacheFetchPromise = null
      throw err
    })

  return cacheFetchPromise
}

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Author Avatar ──────────────────────────────────────────────────────────────

function AuthorAvatar({ name, handle, avatarUrl }: { name: string; handle: string; avatarUrl?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false)
  const bg = stringToColor(handle)
  const initials = getInitials(name)

  // Prefer stored avatar URL, fall back to unavatar.io for any Twitter handle
  const cleanHandle = handle.replace(/^@/, '')
  const src = avatarUrl ?? (cleanHandle && cleanHandle !== 'unknown' ? `https://unavatar.io/twitter/${cleanHandle}` : null)

  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="flex-shrink-0 w-8 h-8 rounded-full object-cover select-none"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold select-none"
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

// ── Top media slot (no margins — rendered full-bleed at top of card) ────────

function proxyUrl(url: string): string {
  return `/api/media?url=${encodeURIComponent(url)}`
}

/** Returns true if the URL points to an actual video file (not a thumbnail JPEG) */
function isVideoUrl(url: string): boolean {
  return url.includes('video.twimg.com') || url.includes('.mp4')
}

/** Derive a thumbnail URL from a Twitter video URL */
function deriveVideoThumb(url: string): string | null {
  // amplify_video/{id}/vid/... → pbs.twimg.com/amplify_video_thumb/{id}/img/default.jpg
  const amplify = url.match(/video\.twimg\.com\/amplify_video\/(\d+)/)
  if (amplify) return `https://pbs.twimg.com/amplify_video_thumb/${amplify[1]}/img/default.jpg`
  // ext_tw_video/{id}/pu/vid/... → pbs.twimg.com/ext_tw_video_thumb/{id}/pu/img/default.jpg
  const ext = url.match(/video\.twimg\.com\/ext_tw_video\/(\d+)/)
  if (ext) return `https://pbs.twimg.com/ext_tw_video_thumb/${ext[1]}/pu/img/default.jpg`
  // tweet_video/{id}.mp4 → pbs.twimg.com/tweet_video_thumb/{id}.jpg
  const tweet = url.match(/video\.twimg\.com\/tweet_video\/([^.]+)\.mp4/)
  if (tweet) return `https://pbs.twimg.com/tweet_video_thumb/${tweet[1]}.jpg`
  return null
}

interface TopMediaSlotProps {
  item: BookmarkWithMedia['mediaItems'][number]
  tweetUrl: string
  t: ReturnType<typeof useI18n>['t']
}

/** Consistent overlay shown on top of a thumbnail — used for both video and X-link cases */
function MediaOverlay({ label, icon, t }: { label?: string; icon?: React.ReactNode; t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors">
      {icon ?? (
        <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur-sm">
          {label ?? t.watchOnX}
        </span>
      )}
    </div>
  )
}

/** Placeholder shown when no thumbnail is available — styled as a proper video preview */
function MediaPlaceholder({ onClick, label, isVideo }: { onClick?: (e: React.MouseEvent) => void; label: string; isVideo?: boolean }) {
  if (isVideo) {
    return (
      <div
        className="h-48 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-zinc-750 hover:to-zinc-850 transition-colors cursor-pointer select-none"
        onClick={onClick}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center border border-white/10">
          <Play size={22} className="text-white fill-white ml-1" />
        </div>
        <span className="text-xs text-zinc-400 font-medium">{label}</span>
      </div>
    )
  }
  return (
    <div
      className="h-48 flex items-center justify-center bg-zinc-800/70 hover:bg-zinc-800 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <span className="px-3 py-1.5 rounded-full bg-zinc-700 text-zinc-300 text-xs font-semibold">
        {label}
      </span>
    </div>
  )
}

function TopMediaSlot({ item, tweetUrl, t }: TopMediaSlotProps) {
  const [imgError, setImgError] = useState(false)

  // ── Photo: show inline ─────────────────────────────────────────────────────
  if (item.type === 'photo') {
    if (imgError) {
      return (
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          <div className="h-48 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-800/70 transition-colors">
            <ImageOff size={18} className="text-zinc-600" />
            <span className="px-3 py-1.5 rounded-full bg-zinc-700 text-zinc-400 text-xs font-semibold">
              {t.watchOnX}
            </span>
          </div>
        </a>
      )
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxyUrl(item.url)}
        alt="Bookmark media"
        className="w-full h-48 object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    )
  }

  // ── Video/GIF: clicking opens the tweet where the native player works ───
  return (
    <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="relative block" onClick={(e) => e.stopPropagation()}>
      {item.thumbnailUrl && !isVideoUrl(item.thumbnailUrl) ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxyUrl(item.thumbnailUrl)}
            alt=""
            className="w-full h-48 object-cover"
            loading="lazy"
            onError={() => {}}
          />
          <MediaOverlay t={t} />
        </div>
      ) : (
        <MediaPlaceholder label={t.watchOnX} isVideo={item.type === 'video'} />
      )}
    </a>
  )
}

// ── Category chip ──────────────────────────────────────────────────────────────

function CategoryChip({
  category,
  onRemove,
}: {
  category: BookmarkWithMedia['categories'][number]
  onRemove?: (id: string) => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: `${category.color}18`,
        color: category.color,
        border: `1px solid ${category.color}30`,
      }}
      title={`${category.name} — click to filter`}
    >
      <Bookmark
        size={9}
        className="flex-shrink-0"
        style={{ color: category.color, fill: category.color }}
      />
      <Link
        href={`/bookmarks?category=${category.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="hover:underline"
      >
        {category.name}
      </Link>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(category.id)
          }}
          className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
          aria-label={`Remove ${category.name}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

// ── Inline category editor ─────────────────────────────────────────────────────

interface CategoryEditorProps {
  bookmarkId: string
  currentCategoryIds: Set<string>
  onSave: (newIds: string[]) => void
  onClose: () => void
  t: ReturnType<typeof useI18n>['t']
}

function CategoryEditor({ bookmarkId, currentCategoryIds, onSave, onClose, t }: CategoryEditorProps) {
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(currentCategoryIds))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchAllCategories()
      .then((cats) => {
        if (!cancelled) { setAllCategories(cats); setLoading(false) }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t.error)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const ids = Array.from(selected)
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: ids }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      onSave(ids)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={editorRef}
      className="absolute left-0 right-0 bottom-full mb-2 z-50 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl shadow-black/50"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wide">{t.editCategories}</p>

      {loading && <p className="text-xs text-zinc-600 py-2">{t.loadingCategories}</p>}

      {!loading && allCategories.length === 0 && (
        <p className="text-xs text-zinc-600 py-2">{t.noCategoriesFound}</p>
      )}

      {!loading && allCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {allCategories.map((cat) => {
            const isSelected = selected.has(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all"
                style={
                  isSelected
                    ? { backgroundColor: `${cat.color}33`, color: cat.color, border: `1px solid ${cat.color}88` }
                    : { backgroundColor: 'transparent', color: '#71717a', border: '1px solid #3f3f46' }
                }
              >
                {isSelected
                  ? <Check size={10} className="flex-shrink-0" />
                  : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-40" style={{ backgroundColor: cat.color }} />
                }
                {cat.name}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-zinc-800">
        <button onClick={onClose} className="px-2.5 py-1 text-xs rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          {t.cancel}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </div>
  )
}

// ── Main card ──────────────────────────────────────────────────────────────────

interface BookmarkCardProps {
  bookmark: BookmarkWithMedia
}

export default function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const { t } = useI18n()
  const [categories, setCategories] = useState(bookmark.categories)
  const [expanded, setExpanded] = useState(false)
  const [editingCategories, setEditingCategories] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const tweetUrl = (bookmark.authorHandle && bookmark.authorHandle !== 'unknown')
    ? `https://twitter.com/${bookmark.authorHandle}/status/${bookmark.tweetId}`
    : `https://twitter.com/i/web/status/${bookmark.tweetId}`
  const firstMedia = bookmark.mediaItems[0] ?? null
  const hasMedia = bookmark.mediaItems.length > 0
  const dateStr = formatDate(bookmark.tweetCreatedAt ?? bookmark.importedAt ?? null)
  const isKnownAuthor = bookmark.authorHandle !== 'unknown'

  // Always strip t.co shortlinks from display text — Twitter appends them to every tweet
  const cleanText = stripTcoUrls(bookmark.text)
  // All expanded URLs from raw tweet entities (includes GitHub, etc.)
  const urls = bookmark.urls ?? []
  const hashtags = bookmark.hashtags ?? []
  // Primary link to show inline — prefer urls from entities (already expanded, not t.co)
  const primaryUrl = urls[0] ?? null
  // Whether this card is essentially a link-share (no text, no media)
  const isLinkShare = !hasMedia && primaryUrl !== null && cleanText.trim().length === 0

  const TEXT_LIMIT = 280
  const isLong = cleanText.length > TEXT_LIMIT
  const displayText = expanded || !isLong ? cleanText : cleanText.slice(0, TEXT_LIMIT)

  const currentCategoryIds = new Set(categories.map((c) => c.id))

  function handleRemoveCategory(categoryId: string) {
    const newIds = categories.filter((c) => c.id !== categoryId).map((c) => c.id)
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
    fetch(`/api/bookmarks/${bookmark.id}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: newIds }),
    }).catch(() => { setCategories(bookmark.categories) })
  }

  function handleSaveCategories(newIds: string[]) {
    const allCats = cachedCategories ?? []
    const newCategories = newIds
      .map((id) => {
        const found = allCats.find((c) => c.id === id)
        if (!found) return null
        return { id: found.id, name: found.name, slug: found.slug, color: found.color, confidence: 1.0 }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
    setCategories(newCategories)
    setEditingCategories(false)
  }

  function handleDownload() {
    if (!firstMedia) return
    const a = document.createElement('a')
    a.href = `/api/media?url=${encodeURIComponent(firstMedia.url)}&download=1`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Only show download if media is a photo or a real video (not a thumbnail JPEG stored as video)
  const isDownloadable = firstMedia !== null &&
    (firstMedia.type === 'photo' || isVideoUrl(firstMedia.url))

  return (
    <div
      className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 flex flex-col flex-1 aspect-[9/16] min-h-[280px]"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') setShowPreview(true) }}
    >

      {/* Top media — full bleed, no padding */}
      {firstMedia && (
        <div className="border-b border-zinc-800/60 rounded-t-2xl overflow-hidden shrink-0">
          <TopMediaSlot item={firstMedia} tweetUrl={tweetUrl} t={t} />
        </div>
      )}

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">

        {/* Author row + hover actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isKnownAuthor && (
              <AuthorAvatar name={bookmark.authorName} handle={bookmark.authorHandle} />
            )}
            <div className="min-w-0">
              {isKnownAuthor && (
                <p className="text-sm font-semibold text-zinc-100 truncate leading-tight">
                  {bookmark.authorName}
                </p>
              )}
              <p className="text-xs text-zinc-500 truncate">
                {isKnownAuthor ? `@${bookmark.authorHandle}` : dateStr}
              </p>
            </div>
          </div>

          {/* Actions — visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
            <button
              onClick={() => setShowPreview(true)}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Preview"
            >
              <Maximize2 size={13} />
            </button>
            {isDownloadable && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title={t.downloadMedia}
              >
                <Download size={13} />
              </button>
            )}
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title={t.openOnX}
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Tweet text — clickable to open full preview */}
        <div
          className={`flex-1 ${!primaryUrl && !displayText ? '' : 'min-h-[4.5rem]'} cursor-pointer group/text`}
          onClick={() => setShowPreview(true)}
          title="Click to view full content"
        >
          {/* Link-share card: no text, no media — show prominent GitHub/repo card */}
          {isLinkShare && primaryUrl && (
            <div className={`${!displayText ? 'mt-1' : ''}`}>
              <InlineLinkCard url={primaryUrl} />
            </div>
          )}

          {displayText.length > 0 && (
            <p className="text-sm text-zinc-200 leading-relaxed">
              {displayText}
              {isLong && !expanded && (
                <span>
                  {'… '}
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {t.more}
                  </button>
                </span>
              )}
              {isLong && expanded && (
                <span>
                  {' '}
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
                    className="text-zinc-500 hover:text-zinc-400 transition-colors text-xs"
                  >
                    {t.less}
                  </button>
                </span>
              )}
              {/* Hover hint */}
              <span className="ml-1.5 text-zinc-600 opacity-0 group-hover/text:opacity-100 transition-opacity text-[10px] align-middle">· click to expand</span>
            </p>
          )}
          {!displayText && !firstMedia && !primaryUrl && (
            <p className="text-xs text-zinc-700 italic">{t.noTextContent}</p>
          )}
          {/* Show remaining links if there are multiple (after the primary one shown above) */}
          {urls.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {urls.slice(1, 4).map((url, i) => {
                const lt = getLinkType(url)
                const c = getLinkColor(lt)
                // GitHub links navigate directly; all others open preview
                if (lt === 'github') {
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors ${c.border} ${c.bg} ${c.text} ${c.hover}`}
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                      <span className="truncate max-w-[120px]" title={url}>{url}</span>
                    </a>
                  )
                }
                return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setShowPreview(true) }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors ${c.border} ${c.bg} ${c.text} ${c.hover}`}
                >
                  {lt === 'cloud' ? (
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                  ) : lt === 'video' ? (
                    <Play size={9} className="fill-current" />
                  ) : (
                    <Globe size={9} />
                  )}
                  <span className="truncate max-w-[120px]" title={url}>{url}</span>
                </button>
              )})
              }
              {urls.length > 4 && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 px-1 py-0.5 transition-colors"
                >
                  +{urls.length - 4} more
                </button>
              )}
            </div>
          )}
          {/* Inline link preview for non-link-share cards */}
          {!isLinkShare && primaryUrl && (
            <div className="mt-2">
              <LinkPreview url={primaryUrl} tweetUrl={tweetUrl} tweetId={bookmark.tweetId} prominent={!displayText} t={t} />
            </div>
          )}
        </div>

        {/* Footer: categories + meta — fixed two-row structure keeps all cards aligned */}
        <div className="relative mt-auto pt-3 border-t border-zinc-800/50">
          {/* Row 1: chips + hashtags + links + date — consistent height across all cards */}
          <div className="flex items-center gap-1.5 flex-wrap min-h-[1.5rem]">
            {categories.map((cat) => (
              <CategoryChip key={cat.id} category={cat} onRemove={handleRemoveCategory} />
            ))}
            {categories.length === 0 && (
              <Link
                href="/bookmarks?uncategorized=true"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-zinc-600 italic hover:text-zinc-400 hover:underline transition-colors"
                title={t.uncategorized}
              >
                {t.uncategorized}
              </Link>
            )}
            {/* Link count indicator — always visible when links exist */}
            {urls.length > 0 && (
              <button
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50 transition-colors"
                title={urls.join(', ')}
              >
                <Globe size={9} />
                {urls.length === 1 ? (
                  <span className="truncate max-w-[120px]">{urls[0]}</span>
                ) : (
                  <span>{urls.length} links</span>
                )}
              </button>
            )}
            {hashtags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                onClick={(e) => { e.stopPropagation(); setShowPreview(true) }}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              >
                #{tag}
              </button>
            ))}
            {hashtags.length > 3 && (
              <button
                onClick={() => setShowPreview(true)}
                className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
              >
                +{hashtags.length - 3}
              </button>
            )}
            {isKnownAuthor && dateStr && (
              <span className="ml-auto text-xs text-zinc-600 flex-shrink-0">
                {dateStr}
              </span>
            )}
          </div>

          {/* Row 2: edit button — always in DOM to reserve space; invisible until hover */}
          <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditingCategories((v) => !v)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-zinc-700 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all"
              title={t.editCategories}
            >
              <Pencil size={10} />
              {t.editCategories}
            </button>
          </div>

          {editingCategories && (
            <CategoryEditor
              bookmarkId={bookmark.id}
              currentCategoryIds={currentCategoryIds}
              onSave={handleSaveCategories}
              onClose={() => setEditingCategories(false)}
              t={t}
            />
          )}
        </div>

      </div>

      {showPreview && (
        <PreviewModal
          bookmark={bookmark}
          tweetUrl={tweetUrl}
          cleanText={cleanText}
          firstMedia={firstMedia}
          isKnownAuthor={isKnownAuthor}
          dateStr={dateStr}
          onClose={() => setShowPreview(false)}
          t={t}
        />
      )}
    </div>
  )
}

// ── Preview Modal ──────────────────────────────────────────────────────────────

interface PreviewModalProps {
  bookmark: BookmarkWithMedia
  tweetUrl: string
  cleanText: string
  firstMedia: BookmarkWithMedia['mediaItems'][number] | null
  isKnownAuthor: boolean
  dateStr: string
  onClose: () => void
  t: ReturnType<typeof useI18n>['t']
}

function PreviewModal({ bookmark, tweetUrl, cleanText, firstMedia, isKnownAuthor, dateStr, onClose, t }: PreviewModalProps) {
  const allMedia = bookmark.mediaItems
  const urls = bookmark.urls ?? []
  const hashtags = bookmark.hashtags ?? []

  // Parse rawJson for extra info
  let rawData: Record<string, unknown> | null = null
  if (bookmark.rawJson) {
    try { rawData = JSON.parse(bookmark.rawJson) } catch {}
  }

  // Media lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const lightboxMedia = lightboxIndex !== null ? allMedia[lightboxIndex] : null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          setLightboxIndex(null)
        } else {
          onClose()
        }
      }
      if (lightboxIndex !== null) {
        if (e.key === 'ArrowRight' && lightboxIndex < allMedia.length - 1) {
          setLightboxIndex(lightboxIndex + 1)
        }
        if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
          setLightboxIndex(lightboxIndex - 1)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, lightboxIndex, allMedia.length])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            {isKnownAuthor && (
              <AuthorAvatar name={bookmark.authorName} handle={bookmark.authorHandle} />
            )}
            <div>
              {isKnownAuthor && (
                <p className="text-sm font-semibold text-zinc-100 leading-tight">{bookmark.authorName}</p>
              )}
              <p className="text-xs text-zinc-500">
                {isKnownAuthor ? `@${bookmark.authorHandle}` : ''} · {dateStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title={t.openOnX}
            >
              <ExternalLink size={15} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {/* Media gallery */}
          {allMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-0.5 cursor-pointer">
              {allMedia.slice(0, 4).map((media, i) => (
                <button
                  key={media.id}
                  onClick={() => setLightboxIndex(i)}
                  className={`relative overflow-hidden bg-zinc-800 hover:brightness-110 transition-all ${
                    allMedia.length === 1 ? 'col-span-2' : ''
                  } ${allMedia.length === 3 && i === 0 ? 'col-span-2' : ''}`}
                  style={{ aspectRatio: '16/9' }}
                >
                  {media.type === 'video' || media.type === 'animated_gif' ? (
                    <img src={proxyUrl(media.thumbnailUrl ?? media.url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <img src={proxyUrl(media.url)} alt="" className="w-full h-full object-cover" />
                  )}
                  {/* Play icon for video */}
                  {(media.type === 'video' || media.type === 'animated_gif') && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                        <Play size={20} className="text-white fill-white" />
                      </div>
                    </div>
                  )}
                  {i === 3 && allMedia.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">+{allMedia.length - 4}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Tweet text — full, untruncated */}
          <div className="px-5 py-4">
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
              {cleanText}
            </p>
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <Link
                  key={tag}
                  href={`/bookmarks?q=%23${encodeURIComponent(tag)}`}
                  onClick={(e) => { onClose() }}
                  className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* All links */}
          {urls.length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">
                {urls.length} {urls.length === 1 ? 'Link' : 'Links'}
              </p>
              <div className="flex flex-col gap-1.5">
                {urls.map((url, i) => {
                  const lt = getLinkType(url)
                  const c = getLinkColor(lt)
                  return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all group/link ${c.border} ${c.bg} ${c.hover}`}
                  >
                    {lt === 'github' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-orange-400" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                    ) : lt === 'cloud' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-blue-400" fill="currentColor">
                        <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                      </svg>
                    ) : lt === 'video' ? (
                      <Play size={14} className="text-red-400 fill-current shrink-0" />
                    ) : (
                      <Globe size={14} className="text-zinc-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${
                        lt === 'github' ? 'text-orange-300 group-hover/link:text-orange-200' :
                        lt === 'cloud' ? 'text-blue-300 group-hover/link:text-blue-200' :
                        lt === 'video' ? 'text-red-300 group-hover/link:text-red-200' :
                        'text-zinc-300 group-hover/link:text-white'
                      }`}
                        title={url}>
                        {url}
                      </p>
                    </div>
                    <ExternalLink size={11} className="text-zinc-600 shrink-0" />
                  </a>
                )})}
              </div>
            </div>
          )}

          {/* Extra metadata from rawJson */}
          {rawData && (
            <div className="px-5 pb-4">
              <div className="text-xs text-zinc-600 space-y-1">
                {rawData.retweet_count !== undefined && (
                  <p>🔁 <span className="font-medium text-zinc-400">{String(rawData.retweet_count)}</span> Retweets</p>
                )}
                {rawData.reply_count !== undefined && (
                  <p>💬 <span className="font-medium text-zinc-400">{String(rawData.reply_count)}</span> Replies</p>
                )}
                {rawData.like_count !== undefined && (
                  <p>❤️ <span className="font-medium text-zinc-400">{String(rawData.like_count)}</span> Likes</p>
                )}
                {rawData.view_count !== undefined && (
                  <p>👁 <span className="font-medium text-zinc-400">{String(rawData.view_count)}</span> Views</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 shrink-0">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            View on X
          </a>
        </div>
      </div>

      {/* Media lightbox */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={20} />
          </button>
          {lightboxIndex !== null && allMedia.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)) }}
                disabled={lightboxIndex === 0}
              >
                <ChevronRight size={24} className="rotate-180" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.min(allMedia.length - 1, lightboxIndex + 1)) }}
                disabled={lightboxIndex === allMedia.length - 1}
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-500">
                {lightboxIndex + 1} / {allMedia.length}
              </div>
            </>
          )}
          {lightboxMedia.type === 'video' || lightboxMedia.type === 'animated_gif' ? (
            <video
              src={proxyUrl(lightboxMedia.url)}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={proxyUrl(lightboxMedia.url)}
              alt=""
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}
