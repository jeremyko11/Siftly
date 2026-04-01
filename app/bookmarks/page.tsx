'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  BookmarkX,
  LayoutGrid,
  List,
  X,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  Trash2,
  FolderPlus,
  Check,
  Loader,
} from 'lucide-react'
import * as Select from '@radix-ui/react-select'
import MasonryGrid from '@/components/MasonryGrid'
import type { BookmarkWithMedia, BookmarksResponse, Category } from '@/lib/types'
import { useI18n } from '@/lib/i18n-context'

const PAGE_SIZE = 24

interface Filters {
  q: string
  category: string
  mediaType: string
  source: string
  sort: string
  page: number
  uncategorized: boolean
}

const DEFAULT_FILTERS: Filters = {
  q: '',
  category: '',
  mediaType: '',
  source: '',
  sort: 'newest',
  page: 1,
  uncategorized: false,
}

function buildUrl(filters: Filters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.uncategorized) {
    params.set('uncategorized', 'true')
  } else if (filters.category) {
    params.set('category', filters.category)
  }
  if (filters.mediaType) params.set('mediaType', filters.mediaType)
  if (filters.source) params.set('source', filters.source)
  params.set('sort', filters.sort)
  params.set('page', String(filters.page))
  params.set('limit', String(PAGE_SIZE))
  return `/api/bookmarks?${params.toString()}`
}

function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  placeholder: string
}) {
  return (
    <Select.Root value={value || '_all'} onValueChange={(v) => onChange(v === '_all' ? '' : v)}>
      <Select.Trigger className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all min-w-[120px] shrink-0">
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="ml-auto">
          <ChevronDown size={12} className="text-zinc-600" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          <Select.Viewport className="p-1">
            <Select.Item
              value="_all"
              className="flex items-center px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg cursor-pointer outline-none transition-colors data-[highlighted]:bg-zinc-800 data-[highlighted]:text-zinc-100"
            >
              <Select.ItemText>{placeholder}</Select.ItemText>
            </Select.Item>
            {options.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="flex items-center px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg cursor-pointer outline-none transition-colors data-[highlighted]:bg-zinc-800 data-[highlighted]:text-zinc-100"
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function SkeletonCard() {
  return (
    <div className="masonry-item">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse aspect-[9/16]">
        <div className="h-40 bg-zinc-800" />
        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className="space-y-1.5">
              <div className="w-24 h-3 rounded-lg bg-zinc-800" />
              <div className="w-16 h-2.5 rounded-lg bg-zinc-800" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 rounded-lg bg-zinc-800" />
            <div className="w-5/6 h-3 rounded-lg bg-zinc-800" />
            <div className="w-3/4 h-3 rounded-lg bg-zinc-800" />
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 flex gap-2">
            <div className="w-16 h-5 rounded-full bg-zinc-800" />
            <div className="w-20 h-5 rounded-full bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  )
}

function BookmarksPageInner() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    uncategorized: searchParams.get('uncategorized') === 'true',
    category: searchParams.get('category') ?? '',
    mediaType: searchParams.get('mediaType') ?? '',
    q: searchParams.get('q') ?? '',
  }))
  const [searchInput, setSearchInput] = useState('')
  const [bookmarks, setBookmarks] = useState<BookmarkWithMedia[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // pageRef = source of truth for which page to fetch next
  const pageRef = useRef(1)
  const fetchingRef = useRef(false)

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<'delete' | 'categorize' | null>(null)

  // Load categories for the dropdown
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.categories) setCategories(data.categories)
      })
      .catch(() => {})
  }, [])

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function selectAll() {
    if (selectedIds.length === bookmarks.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(bookmarks.map((b) => b.id))
    }
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return
    setActionLoading('delete')
    try {
      const res = await fetch('/api/bookmarks/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (res.status === 401) {
        // Auth not implemented yet - just clear selection
        clearSelection()
        return
      }
      if (res.ok) {
        // Remove deleted bookmarks from the list
        setBookmarks((prev) => prev.filter((b) => !selectedIds.includes(b.id)))
        setTotal((prev) => Math.max(0, prev - selectedIds.length))
        clearSelection()
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  async function categorizeSelected(categoryId: string) {
    if (selectedIds.length === 0) return
    setActionLoading('categorize')
    setCategoryDropdownOpen(false)
    try {
      const res = await fetch('/api/bookmarks/batch-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, categoryId }),
      })
      if (res.status === 401) {
        clearSelection()
        return
      }
      if (res.ok) {
        // Update local state to reflect new categories
        const cat = categories.find((c) => c.id === categoryId)
        setBookmarks((prev) =>
          prev.map((b) => {
            if (selectedIds.includes(b.id) && cat) {
              const alreadyHas = b.categories.some((c) => c.id === categoryId)
              if (!alreadyHas) {
                return {
                  ...b,
                  categories: [...b.categories, { id: cat.id, name: cat.name, slug: cat.slug, color: cat.color, confidence: 1.0 }],
                }
              }
            }
            return b
          })
        )
        clearSelection()
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  function doFetch(page: number, append: boolean) {
    if (fetchingRef.current) return false
    fetchingRef.current = true
    if (append) setLoadingMore(true)
    else setLoading(true)

    const f: Filters = { ...filters, page }
    fetch(buildUrl(f))
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch'); return r.json() })
      .then((data: BookmarksResponse) => {
        setBookmarks((prev) => append ? [...prev, ...data.bookmarks] : data.bookmarks)
        // Defensive: if API returns 0 total but we got items, use item count as total
        const safeTotal = data.total > 0 ? data.total : data.bookmarks.length
        setTotal(safeTotal)
      })
      .catch((err) => {
        console.error(err)
        if (!append) { setBookmarks([]); setTotal(0) }
      })
      .finally(() => {
        fetchingRef.current = false
        if (append) setLoadingMore(false)
        else setLoading(false)
      })
    return true
  }

  // Initial load + filter changes
  useEffect(() => {
    pageRef.current = 1
    clearSelection()
    doFetch(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.category, filters.mediaType, filters.source, filters.sort, filters.uncategorized])

  function handleLoadMore() {
    if (fetchingRef.current) return
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage
    doFetch(nextPage, true)
  }

  function updateSearch(q: string) {
    setSearchInput(q)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      pageRef.current = 1
      setFilters((prev) => ({ ...prev, q, page: 1 }))
    }, 300)
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    pageRef.current = 1
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  function clearAllFilters() {
    setSearchInput('')
    pageRef.current = 1
    setFilters(DEFAULT_FILTERS)
  }

  const mediaOptions = [
    { label: t.photos, value: 'photo' },
    { label: t.videos, value: 'video' },
  ]

  const sourceOptions = [
    { label: t.bookmarks, value: 'bookmark' },
    { label: t.likes, value: 'like' },
  ]

  const sortOptions = [
    { label: t.newestFirst, value: 'newest' },
    { label: t.oldestFirst, value: 'oldest' },
  ]

  const hasActiveFilters = !!(filters.q || filters.category || filters.mediaType || filters.source || filters.sort !== 'newest' || filters.uncategorized)

  const sortLabel = sortOptions.find((o) => o.value === filters.sort)?.label ?? t.newestFirst
  const isSelectionActive = selectedIds.length > 0

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/60">
        <div className="px-6 md:px-8 py-4">
          <div className="flex items-center gap-3">

            {/* Select all checkbox - shown when items exist */}
            {!loading && bookmarks.length > 0 && (
              <button
                onClick={selectAll}
                className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  selectedIds.length === bookmarks.length && bookmarks.length > 0
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-zinc-700 text-transparent hover:border-zinc-500'
                }`}
                title={selectedIds.length === bookmarks.length ? 'Deselect all' : 'Select all'}
              >
                {selectedIds.length === bookmarks.length && bookmarks.length > 0 && <Check size={11} strokeWidth={3} />}
              </button>
            )}

            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                type="text"
                placeholder={t.searchBookmarksPlaceholder}
                value={searchInput}
                onChange={(e) => updateSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => updateSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filters */}
            <SelectMenu
              value={filters.mediaType}
              onChange={(v) => updateFilter('mediaType', v)}
              options={mediaOptions}
              placeholder={t.allMedia}
            />

            {/* Source */}
            <SelectMenu
              value={filters.source}
              onChange={(v) => updateFilter('source', v)}
              options={sourceOptions}
              placeholder="All sources"
            />

            {/* Sort */}
            <button
              onClick={() => updateFilter('sort', filters.sort === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-all shrink-0"
              title={`Sort: ${sortLabel}`}
            >
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline">{sortLabel}</span>
            </button>

            {/* View toggle — only shown when bookmarks are loaded */}
            {!loading && bookmarks.length > 0 && (
              <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
                <button
                  className="p-1.5 rounded-lg transition-all bg-zinc-700 text-zinc-100"
                  aria-label="Masonry view"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  className="p-1.5 rounded-lg transition-all text-zinc-600 hover:text-zinc-300"
                  aria-label="List view"
                >
                  <List size={14} />
                </button>
              </div>
            )}

          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {filters.uncategorized && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                  {t.uncategorized}
                  <button onClick={() => updateFilter('uncategorized', false)} className="text-amber-400 hover:text-amber-200 transition-colors"><X size={10} /></button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  {filters.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  <button onClick={() => updateFilter('category', '')} className="text-indigo-400 hover:text-indigo-200 transition-colors"><X size={10} /></button>
                </span>
              )}
              {filters.mediaType && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  {mediaOptions.find((o) => o.value === filters.mediaType)?.label}
                  <button onClick={() => updateFilter('mediaType', '')} className="text-indigo-400 hover:text-indigo-200 transition-colors"><X size={10} /></button>
                </span>
              )}
              {filters.source && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  {sourceOptions.find((o) => o.value === filters.source)?.label}
                  <button onClick={() => updateFilter('source', '')} className="text-indigo-400 hover:text-indigo-200 transition-colors"><X size={10} /></button>
                </span>
              )}
              {filters.sort !== 'newest' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  {sortLabel}
                  <button onClick={() => updateFilter('sort', 'newest')} className="text-indigo-400 hover:text-indigo-200 transition-colors"><X size={10} /></button>
                </span>
              )}
              <button onClick={clearAllFilters} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-6 md:px-8 py-6 w-full">

        {/* Results count */}
        {!loading && (
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-zinc-500">
              {total > 0 ? (
                <>
                  <span className="text-zinc-200 font-semibold">{total.toLocaleString()}</span>
                  {' '}bookmark{total !== 1 ? 's' : ''}
                  {filters.q && <span className="text-zinc-600"> for "{filters.q}"</span>}
                </>
              ) : (
                'No bookmarks found'
              )}
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="masonry-grid">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
              <BookmarkX size={26} className="text-zinc-700" />
            </div>
            <h3 className="text-base font-semibold text-zinc-400 mb-2">No bookmarks match your filters</h3>
            <p className="text-zinc-600 text-sm mb-6 max-w-xs">
              Try adjusting your search or removing some filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl transition-colors border border-zinc-800"
              >
                <X size={13} />
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Pure CSS masonry grid — renders all items, IntersectionObserver handles infinite scroll */}
        {!loading && bookmarks.length > 0 && (
          <MasonryGrid
            bookmarks={bookmarks}
            total={total}
            loadingMore={loadingMore}
            hasMore={bookmarks.length < total}
            onLoadMore={handleLoadMore}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}

        {/* All loaded */}
        {!loading && !loadingMore && bookmarks.length > 0 && bookmarks.length >= total && (
          <p className="text-center text-xs text-zinc-700 py-8">
            All {total.toLocaleString()} bookmark{total !== 1 ? 's' : ''} loaded
          </p>
        )}
      </div>

      {/* ── Floating action bar ── */}
      {isSelectionActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50">
          <span className="text-sm text-zinc-200 font-medium">
            {selectedIds.length} selected
          </span>

          <div className="w-px h-5 bg-zinc-700" />

          {/* Delete */}
          <button
            onClick={deleteSelected}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all disabled:opacity-50"
          >
            {actionLoading === 'delete' ? (
              <Loader size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            Delete
          </button>

          {/* Categorize */}
          <div className="relative">
            <button
              onClick={() => setCategoryDropdownOpen((v) => !v)}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all disabled:opacity-50"
            >
              {actionLoading === 'categorize' ? (
                <Loader size={13} className="animate-spin" />
              ) : (
                <FolderPlus size={13} />
              )}
              Add to category
              <ChevronDown size={11} />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl p-1 shadow-2xl shadow-black/50 min-w-[160px]">
                {categories.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">No categories</p>
                ) : (
                  categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => categorizeSelected(cat.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-left"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Cancel / Clear */}
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
          >
            <X size={13} />
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default function BookmarksPage() {
  return (
    <Suspense>
      <BookmarksPageInner />
    </Suspense>
  )
}
