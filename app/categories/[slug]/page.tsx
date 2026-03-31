'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Download, ArrowLeft } from 'lucide-react'
import MasonryGrid from '@/components/MasonryGrid'
import type { BookmarkWithMedia, Category } from '@/lib/types'

const PAGE_SIZE = 24

interface CategoryPageData {
  category: Category
  bookmarks: BookmarkWithMedia[]
  total: number
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [data, setData] = useState<CategoryPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookmarks, setBookmarks] = useState<BookmarkWithMedia[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const fetchingRef = useRef(false)

  // Load category metadata once
  useEffect(() => {
    fetch(`/api/categories/${slug}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((catData: { category: Category }) => {
        setData((prev) => prev ? { ...prev, category: catData.category } : { category: catData.category, bookmarks: [], total: 0 })
      })
      .catch(() => { router.push('/categories') })
  }, [slug, router])

  // Initial bookmark load + filter changes
  useEffect(() => {
    setLoading(true)
    setBookmarks([])
    setPage(1)
    setTotal(0)
    fetchingRef.current = false

    fetch(`/api/bookmarks?category=${slug}&page=1&limit=${PAGE_SIZE}`)
      .then(async (r) => { if (!r.ok) throw new Error('Failed to fetch'); return await r.json() as { bookmarks: BookmarkWithMedia[]; total: number } })
      .then((bmData) => {
        setBookmarks(bmData.bookmarks)
        setTotal(bmData.total)
      })
      .catch(() => { setBookmarks([]); setTotal(0) })
      .finally(() => { setLoading(false); fetchingRef.current = false })
  }, [slug])

  function handleLoadMore() {
    if (fetchingRef.current) return
    fetchingRef.current = true
    const nextPage = page + 1

    fetch(`/api/bookmarks?category=${slug}&page=${nextPage}&limit=${PAGE_SIZE}`)
      .then(async (r) => { if (!r.ok) throw new Error('Failed to fetch'); return await r.json() as { bookmarks: BookmarkWithMedia[]; total: number } })
      .then((bmData) => {
        setBookmarks((prev) => [...prev, ...bmData.bookmarks])
        setTotal(bmData.total)
        setPage(nextPage)
      })
      .catch(() => { /* keep existing items on error */ })
      .finally(() => { fetchingRef.current = false })
  }

  function handleExport() {
    window.location.href = `/api/export?type=zip&category=${slug}`
  }

  const category = data?.category

  if (loading && !category) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="masonry-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse aspect-[9/16]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-8 py-6 border-b border-zinc-800/60">
        <button
          onClick={() => router.push('/categories')}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          All Categories
        </button>

        {category && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">{category.name}</h1>
                {category.description && (
                  <p className="text-zinc-400 text-sm mt-0.5">{category.description}</p>
                )}
                <p className="text-zinc-500 text-sm mt-1">{total.toLocaleString()} bookmark{total !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors shrink-0"
            >
              <Download size={15} />
              Export ZIP
            </button>
          </div>
        )}
      </div>

      {/* Masonry grid with infinite scroll */}
      <div className="flex-1 px-6 md:px-8 py-6">
        {loading ? (
          <div className="masonry-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse aspect-[9/16]" />
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xl font-semibold text-zinc-400">No bookmarks in this category</p>
          </div>
        ) : (
          <MasonryGrid
            bookmarks={bookmarks}
            total={total}
            loadingMore={false}
            hasMore={bookmarks.length < total}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  )
}
