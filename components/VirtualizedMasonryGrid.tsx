'use client'

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import BookmarkCard from '@/components/bookmark-card'
import type { BookmarkWithMedia } from '@/lib/types'
import { measureBatchTexts } from '@/lib/text-measure'

const COLUMN_BREAKPOINTS = [
  { minWidth: 1280, cols: 3 },
  { minWidth: 768, cols: 2 },
  { minWidth: 0, cols: 1 },
]

const CARD_GAP = 12 // gap-3 = 12px
const ESTIMATED_TEXT_HEIGHT = 80 // default text height when no text
const ESTIMATED_LINE_HEIGHT = 20
const VIEWPORT_BUFFER = 800 // px above and below viewport to pre-render

interface VirtualizedMasonryGridProps {
  bookmarks: BookmarkWithMedia[]
  total: number
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}

interface ItemLayout {
  index: number
  column: number
  top: number
  height: number
  bookmark: BookmarkWithMedia
}

/** Estimate card height from bookmark data */
function estimateCardHeight(b: BookmarkWithMedia, colWidth: number): number {
  const padding = 32
  const textWidth = Math.max(200, colWidth - padding)
  const textLines = measureBatchTexts([{ text: b.text, colWidth: textWidth }])[0]
  const authorHeight = 40
  const footerHeight = 36
  const mediaHeight = b.mediaItems.length > 0 ? 192 + Math.max(0, b.mediaItems.length - 1) * 36 : 0
  const chipsHeight = (b.urls?.length ?? 0) > 0 || (b.hashtags?.length ?? 0) > 0 || b.categories.length > 0 ? 32 : 0
  return authorHeight + footerHeight + mediaHeight + chipsHeight + textLines + padding + CARD_GAP
}

function getColumnCount(containerWidth: number): number {
  for (const bp of COLUMN_BREAKPOINTS) {
    if (containerWidth >= bp.minWidth) return bp.cols
  }
  return 1
}

function computeLayouts(bookmarks: BookmarkWithMedia[], colWidth: number): { layouts: ItemLayout[]; totalHeight: number; columnHeights: number[] } {
  const cols = getColumnCount(colWidth * COLUMN_BREAKPOINTS[COLUMN_BREAKPOINTS.length - 1].minWidth)
  const columnHeights = Array(cols).fill(0)
  const layouts: ItemLayout[] = []

  for (let i = 0; i < bookmarks.length; i++) {
    const b = bookmarks[i]
    const height = estimateCardHeight(b, colWidth)
    // Place in shortest column
    const col = columnHeights.indexOf(Math.min(...columnHeights))
    const top = columnHeights[col]
    layouts.push({ index: i, column: col, top, height, bookmark: b })
    columnHeights[col] += height + CARD_GAP
  }

  const totalHeight = Math.max(...columnHeights)
  return { layouts, totalHeight, columnHeights }
}

function SkeletonCard({ colWidth }: { colWidth: number }) {
  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse"
      style={{ height: 220 }}
    />
  )
}

export default function VirtualizedMasonryGrid({
  bookmarks,
  total,
  loadingMore,
  hasMore,
  onLoadMore,
}: VirtualizedMasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [colWidth, setColWidth] = useState(400)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(900)
  const rafRef = useRef<number | null>(null)
  const isFetchingRef = useRef(false)

  // Observe container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setColWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setColWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Update viewport height on resize
  useEffect(() => {
    setViewportHeight(window.innerHeight)
  }, [])

  // Pre-compute masonry layouts from all bookmarks + their heights
  const { layouts, totalHeight } = useMemo(
    () => computeLayouts(bookmarks, colWidth),
    [bookmarks, colWidth]
  )

  const colCount = useMemo(() => getColumnCount(colWidth), [colWidth])

  // Which items are visible (within viewport ± buffer)?
  const visibleIndices = useMemo(() => {
    const visStart = scrollTop - VIEWPORT_BUFFER
    const visEnd = scrollTop + viewportHeight + VIEWPORT_BUFFER
    const indices = new Set<number>()
    for (const layout of layouts) {
      const itemBottom = layout.top + layout.height
      if (itemBottom >= visStart && layout.top <= visEnd) {
        indices.add(layout.index)
      }
    }
    return indices
  }, [layouts, scrollTop, viewportHeight])

  // Throttled scroll handler
  useEffect(() => {
    function onScroll() {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const st = window.scrollY
        setScrollTop(st)

        // Trigger load more when near bottom
        const docH = document.documentElement.scrollHeight
        if (docH - st - viewportHeight < 800 && hasMore && !isFetchingRef.current) {
          isFetchingRef.current = true
          onLoadMore()
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [hasMore, onLoadMore, viewportHeight])

  // After load more completes, reset the guard
  useEffect(() => {
    if (!loadingMore) isFetchingRef.current = false
  }, [loadingMore])

  // Reset scroll tracking when new bookmarks arrive
  useEffect(() => {
    setScrollTop(window.scrollY)
  }, [bookmarks.length])

  const colWidthPx = Math.max(200, colWidth - 8) // small margin

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: totalHeight }}
    >
      {/* Staggered column layout: each column is a virtualized stack */}
      <div className="absolute inset-0 flex gap-3">
        {Array.from({ length: colCount }).map((_, colIdx) => {
          const itemsInCol = layouts
            .filter((l) => l.column === colIdx)
            .sort((a, b) => a.index - b.index)

          return (
            <div
              key={colIdx}
              className="flex-1"
              style={{ width: colWidthPx, maxWidth: colWidthPx }}
            >
              {itemsInCol.map((item) => {
                if (!visibleIndices.has(item.index)) {
                  // Spacer — reserves the height without mounting the component
                  return (
                    <div
                      key={item.index}
                      style={{ height: item.height - CARD_GAP, marginBottom: CARD_GAP }}
                      aria-hidden="true"
                    />
                  )
                }
                return (
                  <div
                    key={item.bookmark.id}
                    style={{ height: item.height - CARD_GAP, marginBottom: CARD_GAP }}
                  >
                    <BookmarkCard bookmark={item.bookmark} />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Loading skeletons at bottom while loading more */}
      {loadingMore && (
        <div className="absolute bottom-0 left-0 right-0 flex gap-3 px-1">
          {Array.from({ length: colCount }).map((_, i) => (
            <div key={i} className="flex-1" style={{ maxWidth: colWidthPx }}>
              <SkeletonCard colWidth={colWidthPx} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
