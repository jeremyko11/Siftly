export interface MediaItem {
  id: string
  type: string
  url: string
  thumbnailUrl: string | null
  imageTags?: string | null
}

export interface BookmarkCategory {
  id: string
  name: string
  slug: string
  color: string
  confidence: number | null
}

export interface BookmarkWithMedia {
  id: string
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  tweetCreatedAt: string | null
  importedAt?: string
  mediaItems: MediaItem[]
  categories: BookmarkCategory[]
  rawJson?: string
  urls?: string[]
  hashtags?: string[]
}

export interface Category {
  id: string
  name: string
  slug: string
  color: string
  description: string | null
  isAiGenerated: boolean
  createdAt: string
  bookmarkCount: number
}

export interface StatsResponse {
  totalBookmarks: number
  totalCategories: number
  totalMedia: number
  recentBookmarks: BookmarkWithMedia[]
  topCategories: { name: string; slug: string; color: string; count: number }[]
}

export interface BookmarksResponse {
  bookmarks: BookmarkWithMedia[]
  total: number
  page: number
  limit: number
}

// ── GitHub Repos ──────────────────────────────────────────────────────────────

export interface Repo {
  id: string
  owner: string
  name: string
  fullName: string
  description: string | null
  url: string
  stars: number
  language: string | null
  topics: string[]
  readmeContent: string | null
  features: RepoFeature[] | null
  useCases: RepoUseCase[] | null
  techStack: string[] | null
  summary: string | null
  readmeAnalyzedAt: string | null
  importedAt: string
}

export interface RepoFeature {
  title: string
  description: string
}

export interface RepoUseCase {
  scenario: string
  description: string
}

export interface ReposResponse {
  repos: Repo[]
  total: number
  analyzedCount: number
}
