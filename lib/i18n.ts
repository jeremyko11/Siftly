// Siftly Internationalization (i18n)
// 支持语言：English (en), 中文 (zh)

export type Language = 'en' | 'zh'

export interface Translations {
  // Nav
  dashboard: string
  aiSearch: string
  browse: string
  mindmap: string
  import: string
  settings: string
  collections: string
  viewAll: string
  showLess: string
  more: string
  manage: string
  search: string
  searchPlaceholder: string

  // Dashboard
  goodMorning: string
  goodAfternoon: string
  goodEvening: string
  youHave: string
  tweetsSaved: string
  bookmarks: string
  likes: string
  categorized: string
  mediaItems: string
  uncategorized: string
  recentlyAdded: string
  topCategories: string
  browseByTopic: string
  latest: string
  importMore: string
  aiCategorize: string

  // Empty state
  noBookmarksYet: string
  importYourBookmarks: string
  configureSettings: string

  // Stats
  totalBookmarks: string

  // Pipeline
  analyzingImages: string
  extractingEntities: string
  generatingTags: string
  categorizing: string
  processingInParallel: string
  aiPipeline: string

  // Settings
  apiKey: string
  apiKeyPlaceholder: string
  save: string
  saved: string
  testConnection: string
  testing: string
  success: string
  failed: string
  cliStatus: string
  cliConnected: string
  cliNotConnected: string
  theme: string
  language: string

  // Import
  selectFile: string
  dragAndDrop: string
  importing: string
  importComplete: string
  imported: string
  bookmarksImported: string

  // Categories
  categoryName: string
  addCategory: string
  deleteCategory: string
  confirmDelete: string

  // Search
  naturalLanguageSearch: string
  searchHint: string
  noResults: string
  results: string
}

const en: Translations = {
  dashboard: 'Dashboard',
  aiSearch: 'AI Search',
  browse: 'Browse',
  mindmap: 'Mindmap',
  import: 'Import',
  settings: 'Settings',
  collections: 'Collections',
  viewAll: 'View all',
  showLess: 'Show less',
  more: 'more',
  manage: 'Manage',
  search: 'Search',
  searchPlaceholder: 'Search…',
  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  youHave: 'You have',
  tweetsSaved: 'tweets saved and ready to explore.',
  bookmarks: 'bookmarks',
  likes: 'likes',
  categorized: 'Categorized',
  mediaItems: 'Media Items',
  uncategorized: 'Uncategorized',
  recentlyAdded: 'Recently Added',
  topCategories: 'Top Categories',
  browseByTopic: 'Browse by topic',
  latest: 'Latest',
  importMore: 'Import More',
  aiCategorize: 'AI Categorize',
  noBookmarksYet: 'No bookmarks yet',
  importYourBookmarks: 'Import your Twitter bookmarks to get started. Once imported, use AI to automatically categorize and organize them.',
  configureSettings: 'Configure settings',
  totalBookmarks: 'Total Bookmarks',
  analyzingImages: 'Analyzing images',
  extractingEntities: 'Extracting entities',
  generatingTags: 'Generating tags',
  categorizing: 'Categorizing',
  processingInParallel: 'Processing in parallel',
  aiPipeline: 'AI pipeline',
  apiKey: 'API Key',
  apiKeyPlaceholder: 'Enter your Anthropic API key',
  save: 'Save',
  saved: 'Saved',
  testConnection: 'Test Connection',
  testing: 'Testing…',
  success: 'Success',
  failed: 'Failed',
  cliStatus: 'CLI Status',
  cliConnected: 'Claude CLI connected',
  cliNotConnected: 'Claude CLI not found',
  theme: 'Theme',
  language: 'Language',
  selectFile: 'Select File',
  dragAndDrop: 'or drag and drop',
  importing: 'Importing…',
  importComplete: 'Import Complete',
  imported: 'Imported',
  bookmarksImported: 'bookmarks imported',
  categoryName: 'Category Name',
  addCategory: 'Add Category',
  deleteCategory: 'Delete Category',
  confirmDelete: 'Are you sure you want to delete this category?',
  naturalLanguageSearch: 'Natural Language Search',
  searchHint: 'Try: "cryptocurrency memes" or "tech news"',
  noResults: 'No results found',
  results: 'results',
}

const zh: Translations = {
  dashboard: '仪表盘',
  aiSearch: 'AI 搜索',
  browse: '浏览',
  mindmap: '思维导图',
  import: '导入',
  settings: '设置',
  collections: '收藏集',
  viewAll: '查看全部',
  showLess: '收起',
  more: '更多',
  manage: '管理',
  search: '搜索',
  searchPlaceholder: '搜索…',
  goodMorning: '早上好',
  goodAfternoon: '下午好',
  goodEvening: '晚上好',
  youHave: '你有',
  tweetsSaved: '条推文已保存，可以开始探索了。',
  bookmarks: '书签',
  likes: '点赞',
  categorized: '已分类',
  mediaItems: '媒体项目',
  uncategorized: '未分类',
  recentlyAdded: '最近添加',
  topCategories: '热门分类',
  browseByTopic: '按话题浏览',
  latest: '最新',
  importMore: '导入更多',
  aiCategorize: 'AI 分类',
  noBookmarksYet: '暂无书签',
  importYourBookmarks: '导入你的 Twitter 书签开始使用。导入后，可以使用 AI 自动分类整理。',
  configureSettings: '配置设置',
  totalBookmarks: '总书签数',
  analyzingImages: '分析图片中',
  extractingEntities: '提取实体中',
  generatingTags: '生成标签中',
  categorizing: '分类中',
  processingInParallel: '并行处理中',
  aiPipeline: 'AI 处理管线',
  apiKey: 'API 密钥',
  apiKeyPlaceholder: '输入你的 Anthropic API 密钥',
  save: '保存',
  saved: '已保存',
  testConnection: '测试连接',
  testing: '测试中…',
  success: '成功',
  failed: '失败',
  cliStatus: 'CLI 状态',
  cliConnected: 'Claude CLI 已连接',
  cliNotConnected: '未找到 Claude CLI',
  theme: '主题',
  language: '语言',
  selectFile: '选择文件',
  dragAndDrop: '或拖放文件到这里',
  importing: '导入中…',
  importComplete: '导入完成',
  imported: '已导入',
  bookmarksImported: '条书签已导入',
  categoryName: '分类名称',
  addCategory: '添加分类',
  deleteCategory: '删除分类',
  confirmDelete: '确定要删除这个分类吗？',
  naturalLanguageSearch: '自然语言搜索',
  searchHint: '试试：加密货币表情包 或 科技新闻',
  noResults: '未找到结果',
  results: '条结果',
}

export const translations: Record<Language, Translations> = { en, zh }

export function getTranslations(lang: Language): Translations {
  return translations[lang]
}

export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem('siftly-language')
  if (saved === 'zh' || saved === 'en') return saved
  // 检测浏览器语言
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) return 'zh'
  return 'en'
}
