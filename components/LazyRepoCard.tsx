'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { Repo } from '@/lib/types'
import RepoCard from './RepoCard'

interface LazyRepoCardProps {
  repo: Repo
  index: number
}

const ROOT_MARGIN = '200px' // Pre-load cards 200px before they enter viewport

export default function LazyRepoCard({ repo, index }: LazyRepoCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  // Also defer rendering for cards beyond first few off-screen
  const [rendered, setRendered] = useState(index < 12)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            setRendered(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  if (!rendered) {
    // Placeholder skeleton to reserve space and prevent layout shift
    return (
      <div
        ref={ref}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse"
        style={{ height: '560px' }}
      />
    )
  }

  if (!visible) {
    return (
      <div
        ref={ref}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse"
        style={{ height: '560px' }}
      />
    )
  }

  return (
    <div ref={ref}>
      <RepoCard repo={repo} />
    </div>
  )
}
