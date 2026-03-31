'use client'

import React, { useEffect, useRef, useState } from 'react'
import BookmarkCard from '@/components/bookmark-card'
import type { BookmarkWithMedia } from '@/lib/types'

const COL_BREAKPOINTS = [
  { minWidth: 2560, cols: 6 },
  { minWidth: 1920, cols: 5 },
  { minWidth: 1440, cols: 4 },
  { minWidth: 1024, cols: 3 },
  { minWidth: 640, cols: 2 },
  { minWidth: 0, cols: 1 },
]

function getColCount(screenW: number): number {
  for (const bp of COL_BREAKPOINTS) {
    if (screenW >= bp.minWidth) return bp.cols
  }
  return 1
}

export default function MasonryGrid({
  bookmarks,
  total,
  loadingMore,
  hasMore,
  onLoadMore,
}: {
  bookmarks: BookmarkWithMedia[]
  total: number
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}) {
  const [colCount, setColCount] = useState(3)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fetchingRef = useRef(false)

  // Track viewport width for responsive column count
  useEffect(() => {
    function update() {
      setColCount(getColCount(window.innerWidth))
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    fetchingRef.current = false
    if (!hasMore || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !fetchingRef.current) {
          fetchingRef.current = true
          onLoadMore()
        }
      },
      { rootMargin: '800px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  const colClass = {
    1: 'columns-1',
    2: 'columns-1 sm:columns-2',
    3: 'columns-1 sm:columns-2 lg:columns-3',
    4: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4',
    5: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5',
    6: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 3xl:columns-6',
  }[colCount] ?? 'columns-1 sm:columns-2 lg:columns-3'

  return (
    <div>
      <div className={`${colClass} gap-3`}>
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="break-inside-avoid mb-3">
            <BookmarkCard bookmark={bookmark} />
          </div>
        ))}
        {loadingMore && Array.from({ length: colCount }).map((_, i) => (
          <div key={`skel-${i}`} className="break-inside-avoid mb-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse aspect-[9/16]" />
          </div>
        ))}
      </div>

      {/* Invisible sentinel — Intersection Observer triggers load more when this enters viewport */}
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />

      {!loadingMore && !hasMore && bookmarks.length > 0 && (
        <p className="text-center text-xs text-zinc-700 py-8">
          All {total.toLocaleString()} bookmark{total !== 1 ? 's' : ''} loaded
        </p>
      )}
    </div>
  )
}
