'use client'

import React, { useMemo, useRef, useState, useEffect } from 'react'
import BookmarkCard from '@/components/bookmark-card'
import type { BookmarkWithMedia } from '@/lib/types'
import { measureBatchTexts } from '@/lib/text-measure'

// 5-column breakpoints: 2560px+ = 5, 1920px+ = 4, 1440px+ = 3, 1024px+ = 2, else = 1
const COL_BREAKPOINTS = [
  { minWidth: 2560, cols: 6 },
  { minWidth: 1920, cols: 5 },
  { minWidth: 1440, cols: 4 },
  { minWidth: 1024, cols: 3 },
  { minWidth: 0, cols: 1 },
]

const CARD_GAP = 12
const VIEWPORT_BUFFER = 600
const CARD_ESTIMATE = {
  padding: 32,
  authorRow: 44,
  footerRow: 36,
  mediaFirst: 192,
  mediaExtra: 36,
  chipsRow: 32,
  textLine: 20,
}

function getColCount(screenW: number): number {
  for (const bp of COL_BREAKPOINTS) {
    if (screenW >= bp.minWidth) return bp.cols
  }
  return 1
}

function estimateHeight(b: BookmarkWithMedia, colW: number): number {
  const textW = Math.max(200, colW - CARD_ESTIMATE.padding)
  const rawH = measureBatchTexts([{ text: b.text, colWidth: textW }])[0]
  const textH = rawH > 0 ? rawH + 8 : 0
  const mediaH = b.mediaItems.length > 0
    ? CARD_ESTIMATE.mediaFirst + Math.max(0, b.mediaItems.length - 1) * CARD_ESTIMATE.mediaExtra
    : 0
  const hasChips = (b.urls?.length ?? 0) > 0 || (b.hashtags?.length ?? 0) > 0 || b.categories.length > 0
  const chipsH = hasChips ? CARD_ESTIMATE.chipsRow : 0
  return CARD_ESTIMATE.authorRow + CARD_ESTIMATE.footerRow + mediaH + chipsH + textH + CARD_ESTIMATE.padding + CARD_GAP
}

interface Item {
  bookmark: BookmarkWithMedia
  index: number
  height: number
}

/**
 * Distribute items across N columns using the greedy "shortest column" algorithm,
 * then compute each item's cumulative top position within its column.
 * Returns columnTops[colIdx] = cumulative height of column so far.
 */
function computeColumnTops(items: Item[], colCount: number): number[] {
  const colHeights = Array(colCount).fill(0)
  const colTops: number[] = []

  for (const item of items) {
    const col = colHeights.indexOf(Math.min(...colHeights))
    colTops.push(col)
    colHeights[col] += item.height + CARD_GAP
  }

  return colTops
}

export default function VirtualizedMasonryGrid({
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
  const [scrollY, setScrollY] = useState(0)
  const [viewportH, setViewportH] = useState(900)
  const [containerW, setContainerW] = useState(1200)
  const rafRef = useRef<number | null>(null)
  const fetchingRef = useRef(false)
  const prevLenRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Always read the latest hasMore from this ref — avoids stale closure in scroll handler
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore

  // Stable ref for onLoadMore — avoids effect re-subscriptions on every render
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  // Update column count and container width from actual element
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setContainerW(w)
      setColCount(getColCount(w))
    })
    ro.observe(el)
    // Init
    setContainerW(el.clientWidth)
    setColCount(getColCount(el.clientWidth))
    return () => ro.disconnect()
  }, [])

  // Track viewport
  useEffect(() => {
    setViewportH(window.innerHeight)
  }, [])

  // Measure all items upfront
  const colWidth = useMemo(() => {
    // Fill the container: account for gaps between columns
    const totalGap = CARD_GAP * (colCount - 1)
    const avail = containerW - totalGap
    return Math.floor(avail / colCount)
  }, [containerW, colCount])

  const items = useMemo<Item[]>(
    () => bookmarks.map((bookmark, i) => ({ bookmark, index: i, height: estimateHeight(bookmark, colWidth) })),
    [bookmarks, colWidth]
  )

  const colTops = useMemo(() => computeColumnTops(items, colCount), [items, colCount])

  const totalHeight = useMemo(() => {
    let max = 0
    for (let c = 0; c < colCount; c++) {
      let h = 0
      for (let i = 0; i < items.length; i++) {
        if (colTops[i] === c) h += items[i].height + CARD_GAP
      }
      if (h > max) max = h
    }
    return max
  }, [items, colTops, colCount])

  // Scroll handler — reads hasMore from ref, not closure, so it's always fresh
  useEffect(() => {
    function onScroll() {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setScrollY(window.scrollY)

        // Always read latest hasMore / onLoadMore from refs — no stale closure
        const docH = document.documentElement.scrollHeight
        const remaining = docH - window.scrollY - window.innerHeight
        if (remaining < 600 && hasMoreRef.current && !fetchingRef.current) {
          fetchingRef.current = true
          onLoadMoreRef.current()
        }

        // Safety fallback: if we've scrolled to the bottom and still have more,
        // but fetching never triggered (stale closure edge case), force a reset
        if (remaining < 200 && hasMoreRef.current && fetchingRef.current) {
          fetchingRef.current = false
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [])

  // Reset guard when new batch arrives (items appended)
  useEffect(() => {
    if (bookmarks.length !== prevLenRef.current) {
      prevLenRef.current = bookmarks.length
      fetchingRef.current = false
    }
  }, [bookmarks.length])

  // Visible items
  const visibleItems = useMemo(() => {
    const visTop = scrollY - VIEWPORT_BUFFER
    const visBot = scrollY + viewportH + VIEWPORT_BUFFER
    return items.map((item, i) => {
      const col = colTops[i]
      const top = col
      const bot = col + item.height
      return { ...item, visible: bot >= visTop && top <= visBot }
    })
  }, [items, colTops, scrollY, viewportH])

  const colClass = {
    1: 'columns-1',
    2: 'columns-1 sm:columns-2',
    3: 'columns-1 sm:columns-2 lg:columns-3',
    4: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4',
    5: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5',
    6: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 3xl:columns-6',
  }[colCount] ?? 'columns-1 sm:columns-2 lg:columns-3'

  return (
    <div ref={containerRef}>
      {/* CSS masonry — items flow top-to-bottom per column, break-inside prevents card splitting */}
      <div className={`${colClass} gap-3`} style={{ minHeight: totalHeight }}>

        {visibleItems.map(({ bookmark, height, visible }) => {
          // Spacer div: reserves vertical space without mounting the card
          if (!visible) {
            return (
              <div
                key={bookmark.id}
                aria-hidden="true"
                className="break-inside-avoid mb-3"
                style={{ height }}
              />
            )
          }
          return (
            <div key={bookmark.id} className="break-inside-avoid mb-3">
              <BookmarkCard bookmark={bookmark} />
            </div>
          )
        })}

        {/* Loading skeletons appended at bottom */}
        {loadingMore && Array.from({ length: colCount }).map((_, i) => (
          <div key={`skel-${i}`} className="break-inside-avoid mb-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse aspect-[9/16]" />
          </div>
        ))}
      </div>

      {!loadingMore && !hasMore && bookmarks.length > 0 && (
        <p className="text-center text-xs text-zinc-700 py-8">
          All {total.toLocaleString()} bookmark{total !== 1 ? 's' : ''} loaded
        </p>
      )}
    </div>
  )
}
