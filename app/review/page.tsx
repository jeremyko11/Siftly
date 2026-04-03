'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n-context'
import {
  Brain,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Bookmark,
  Star,
} from 'lucide-react'
import Link from 'next/link'

interface ReviewItem {
  bookmarkId: string
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  categories: { name: string; color: string }[]
  interval: number
  repetitions: number
  nextReviewAt: string
  lastReviewAt: string | null
}

interface ReviewStats {
  dueCount: number
  totalCount: number
  upcomingCount: number
}

type FilterMode = 'due' | 'all' | 'upcoming'

export default function ReviewPage() {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [stats, setStats] = useState<ReviewStats>({ dueCount: 0, totalCount: 0, upcomingCount: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('due')
  const [activeIndex, setActiveIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/review?status=${filter}`)
      const data = await res.json()
      setReviews(data.reviews ?? [])
      setStats(data.stats ?? { dueCount: 0, totalCount: 0, upcomingCount: 0 })
      setActiveIndex(0)
      setShowAnswer(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void fetchReviews()
  }, [fetchReviews])

  async function submitReview(bookmarkId: string, button: 'again' | 'hard' | 'good') {
    setSubmitting(true)
    try {
      await fetch(`/api/review/${bookmarkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ button }),
      })
      // Move to next
      setShowAnswer(false)
      if (activeIndex < reviews.length - 1) {
        setActiveIndex((i) => i + 1)
      } else {
        // Fetch fresh list
        await fetchReviews()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function removeFromQueue(bookmarkId: string) {
    await fetch(`/api/review/${bookmarkId}`, { method: 'DELETE' })
    setReviews((prev) => prev.filter((r) => r.bookmarkId !== bookmarkId))
    if (activeIndex >= reviews.length - 1 && activeIndex > 0) {
      setActiveIndex((i) => i - 1)
    }
  }

  async function addAllUncategorized() {
    await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addAll: true }),
    })
    await fetchReviews()
  }

  const current = reviews[activeIndex]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-indigo-400" />
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-100">{t.reviewTitle}</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">{t.reviewDescription}</p>
          </div>
        </div>
        <button
          onClick={() => void addAllUncategorized()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/15 transition-colors"
        >
          <Plus size={12} />
          {t.addAllUncategorized}
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
        <button
          onClick={() => setFilter('due')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'due'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Clock size={11} />
          {t.dueToday}: {stats.dueCount}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Brain size={11} />
          {t.totalScheduled}: {stats.totalCount}
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'upcoming'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ChevronRight size={11} />
          {t.upcomingReviews}: {stats.upcomingCount}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={28} className="text-indigo-400 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState filter={filter} onAddAll={addAllUncategorized} />
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-8">
            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-6">
              <span>
                {activeIndex + 1} / {reviews.length}
              </span>
              <div className="flex items-center gap-1">
                {reviews.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === activeIndex
                        ? 'bg-indigo-400'
                        : i < activeIndex
                        ? 'bg-emerald-400'
                        : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Card */}
            {current && (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl overflow-hidden">
                {/* Tweet text */}
                <div className="px-6 py-5">
                  <p className="text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {current.text.slice(0, 400)}
                    {current.text.length > 400 && (
                      <span className="text-zinc-500">…</span>
                    )}
                  </p>
                </div>

                {/* Author + categories */}
                <div className="px-6 py-3 border-t border-zinc-700/30 flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-zinc-500">
                    @{current.authorHandle}
                  </span>
                  {current.categories.map((cat) => (
                    <span
                      key={cat.name}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>

                {/* Answer section */}
                {showAnswer ? (
                  <div className="px-6 py-5 border-t border-zinc-700/30 bg-zinc-800/30">
                    <p className="text-[11px] text-zinc-500 mb-4 uppercase tracking-wider font-semibold">
                      How well did you recall this?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => void submitReview(current.bookmarkId, 'again')}
                        disabled={submitting}
                        className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/15 transition-colors disabled:opacity-50"
                      >
                        {t.reviewAgain}
                      </button>
                      <button
                        onClick={() => void submitReview(current.bookmarkId, 'hard')}
                        disabled={submitting}
                        className="flex-1 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/15 transition-colors disabled:opacity-50"
                      >
                        {t.reviewHard}
                      </button>
                      <button
                        onClick={() => void submitReview(current.bookmarkId, 'good')}
                        disabled={submitting}
                        className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
                      >
                        {t.reviewGood}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-4 text-[11px] text-zinc-600">
                      <span>
                        {t.nextReviewIn}: {current.interval === 1 ? '1 day' : `${current.interval} days`}
                      </span>
                      <span>
                        {t.review}: {current.repetitions}×
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-5 border-t border-zinc-700/30">
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="w-full py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
                    >
                      {t.showAnswer}
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-3 border-t border-zinc-700/30 flex items-center gap-3">
                  <a
                    href={`https://x.com/${current.authorHandle}/status/${current.tweetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <Bookmark size={11} />
                    {t.viewOnX}
                  </a>
                  <button
                    onClick={() => void removeFromQueue(current.bookmarkId)}
                    className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />
                    {t.removeFromReview}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  filter,
  onAddAll,
}: {
  filter: FilterMode
  onAddAll: () => Promise<void>
}) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center">
        <CheckCircle size={26} className="text-emerald-400" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-zinc-200">{t.noReviewsDue}</p>
        <p className="text-[13px] text-zinc-500 mt-1 max-w-xs">{t.noReviewsDueDesc}</p>
      </div>
      {filter === 'due' && (
        <button
          onClick={() => void onAddAll()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/15 transition-colors"
        >
          <Plus size={13} />
          {t.addAllUncategorized}
        </button>
      )}
    </div>
  )
}
