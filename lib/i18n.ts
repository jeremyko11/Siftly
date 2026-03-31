// Siftly Internationalization (i18n)
// 支持语言：English (en), 中文 (zh)

export type Language = 'en' | 'zh'

export interface Translations {
  // Nav
  dashboard: string
  githubRepos: string
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
  dmOnX: string
  runAiAutoCategorize: string

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

  // Settings Page
  settingsTitle: string
  settingsDescription: string
  configuration: string

  // Language & Theme
  appearance: string
  language: string
  languageDescription: string
  theme: string
  themeDescription: string
  lightMode: string
  darkMode: string

  // AI Provider
  aiProvider: string
  aiProviderDescription: string
  chooseAiProvider: string
  anthropicClaude: string
  openaiGpt: string
  apiKey: string
  apiKeyPlaceholder: string
  save: string
  saved: string
  remove: string
  removing: string
  test: string
  testing: string
  working: string
  failed: string
  saved2: string
  enterNewKeyToReplace: string
  getKey: string
  loadingSettings: string
  testConnection: string
  usedForAiCategorization: string
  cliDetected: string
  cliNotNeeded: string
  signedInAs: string
  willUseSubscriptionAutomatically: string
  apiKeyWillTakePriority: string
  cliSessionExpired: string
  runCluadeRefresh: string
  noCliDetected: string
  installClaudeCode: string
  keysStoredPlaintext: string
  doNotExposeDatabase: string
  model: string
  appliesToAllAiOps: string
  opusSlowWarning: string
  considerSonnetOrHaiku: string

  // X OAuth
  xOAuth: string
  xOAuthDescription: string
  connectXAccount: string
  clientId: string
  clientSecret: string
  clientSecretOptional: string
  credentialsSaved: string
  credentialsRemoved: string
  getCredentialsFrom: string
  xDeveloperPortal: string
  callbackUrl: string
  saveOAuthCredentials: string

  // GitHub PAT
  githubPat: string
  githubPatDescription: string
  githubPatHint: string

  // Bird CLI
  birdCli: string
  birdCliDescription: string
  birdAuthToken: string
  birdCt0: string
  birdAuthTokenHint: string
  birdCt0Hint: string
  birdCredentialsSaved: string
  birdFetchNow: string
  birdFetching: string
  birdImportComplete: string
  birdNotConfigured: string
  birdAddCredentialsFirst: string
  savedBirdCredentials: string
  removeBirdCredentials: string
  removeBirdCredentialsConfirm: string

  // Data Management
  dataManagement: string
  dataManagementDescription: string
  exportAllBookmarks: string
  exportAsCsv: string
  exportAsJson: string
  spreadsheetCompatible: string
  fullDataWithFields: string
  permanentlyDeleteAll: string
  clearAll: string
  areYouSure: string
  cancel: string
  yesDeleteAll: string
  deleting: string
  allBookmarksDeleted: string

  // Danger Zone
  dangerZone: string
  dangerZoneDescription: string
  irreversibleActions: string
  clearAllBookmarks: string
  permanentlyDeleteBookmarks: string

  // About
  about: string
  aboutDescription: string
  siftlyDescription: string
  siftlyAboutDetail: string
  builtBy: string
  supportDevelopment: string
  ifSiftlySavesYouTime: string
  addressCopied: string

  // General
  success: string
  error: string
  description: string
  copy: string
  copied: string
  disconnect: string
  retry: string
  cleared: string
  saving: string
  hideKey: string
  showKey: string
  connectionError: string
  failedToSaveModel: string
  failedToSaveProvider: string
  switchedTo: string
  failedToRemoveKey: string
  failedToSaveApiKey: string
  failedToSaveOAuth: string
  failedToRemoveOAuth: string

  // Import Page
  importBookmarks: string
  importDescription: string
  step1: string
  step2: string
  step3: string
  importingBookmarks: string
  thisMayTakeAMoment: string
  importComplete: string
  imported: string
  skipped: string
  asDuplicates: string
  startingAiCategorization: string
  liveImport: string
  liveImportRecommended: string
  bookmarklet: string
  console: string
  dropJsonHere: string
  orClickToBrowse: string
  uploadDownloadedFile: string
  dragToBookmarkBar: string
  manualWorksInAllBrowsers: string
  addBookmarkBar: string
  addBookmark: string
  copyUrlBelow: string
  goToBookmarksPage: string
  clickExportInBookmarkBar: string
  exportButtonAppears: string
  clickAutoScrollCapture: string
  autoScrollAppears: string
  clickPurpleExport: string
  downloadedAutomatically: string
  goToDevTools: string
  pressF12: string
  pasteAndRunScript: string
  pressEnterScroll: string
  purpleButtonAppears: string
  xOAuthRecommended: string
  connectYourXAccount: string
  officialOAuthMethod: string
  requiresOAuthClientId: string
  requiresBasicTier: string
  xOAuthNotConfigured: string
  addOAuthInSettings: string
  connectedToX: string
  tokenExpired: string
  autoRefreshTry: string
  fetchingBookmarks: string
  fetchBookmarksFromX: string
  stopPipeline: string
  stopping: string
  categorizationComplete: string
  imagesAnalyzedLabel: string
  entitiesExtracted: string
  bookmarksEnrichedLabel: string
  categorizedLabel: string
  remaining: string
  viewYourBookmarks: string
  reprocessAll: string
  alreadyUpToDate: string
  allBookmarksAlreadyImported: string
  retryCategorization: string
  lostConnectionServer: string
  pipelineMayStillBeRunning: string
  bookmarksNotYetProcessed: string
  process: string
  reAnalyzeAll: string
  fromScratch: string
  dragToBookmarkBarTip: string
  openDevTools: string
  liveImportDescription: string
  redirectingToX: string

  // Categorize Page (same as pipeline keys above)

  // Bookmarks Page
  browseBookmarks: string
  allBookmarks: string
  allTypes: string
  allCategories: string
  filterByType: string
  filterByCategory: string
  sortBy: string
  newest: string
  oldest: string
  noBookmarksFound: string
  noBookmarksMatchFilters: string
  searchBookmarksPlaceholder: string
  clearFilters: string
  photos: string
  videos: string
  allMedia: string
  newestFirst: string
  oldestFirst: string

  // Category Name Translations (for sidebar display)
  catAiResources: string
  catFinanceCrypto: string
  catDesign: string
  catDevTools: string
  catFinanceInvesting: string
  catFunnyMemes: string
  catGeneral: string
  catHealthWellness: string
  catNews: string
  catProductivity: string
  catScienceResearch: string
  catSecurityPrivacy: string
  catStartupsBusiness: string

  // Bookmark Card
  less: string
  noTextContent: string
  editCategories: string
  saveFailed: string
  loadingCategories: string
  noCategoriesFound: string
  downloadMedia: string
  openOnX: string
  watchOnX: string
  viewOnX: string
  viewArticleOnX: string

  // Mindmap Page
  mindmapTitle: string
  viewAsGraph: string

  // AI Search Page
  aiSearchTitle: string
  aiSearchDescription: string
  askQuestion: string
  searching: string
  noResultsFound: string
  aiSearchSubtitle: string
  aiPoweredSearch: string
  noBookmarksMatchedDescription: string

  // Categories
  categories: string
  manageCategories: string
  categoryName: string
  addCategory: string
  deleteCategory: string
  confirmDelete: string
  noBookmarksInCategory: string
  bookmarksAcrossXCategories: string
  organizeByTopic: string
  createFirstCategory: string
  createFirstCategoryBtn: string
  autoAssignBookmarks: string
  viewBookmarks: string
  loadingYourCategories: string
  noCategoriesYet: string
  tipUse: string
  newCategory: string
  color: string

  // Categorize / Pipeline
  bookmarksOfTotal: string

  // Mindmap
  mindmapRunAiFirst: string
  mindmapStartAiCategorization: string
  mindmapCategorizationComplete: string
  mindmapReloading: string
  mindmapAiInProgress: string
  mindmapWillAutoPopulate: string

  // GitHub Repos
  syncRepos: string
  syncing: string
  sortByStars: string
  sortByName: string
  sortByRecent: string
  clickSyncReposEmpty: string
  searchReposPlaceholder: string
  githubTokenNotConfigured: string
  githubTokenNotConfiguredDesc: string
  reposSynced: string
  reposAnalyzed: string
  noReposSyncedYet: string
  viewOnGithub: string
  reanalyze: string
  analyzing: string
  pendingAiAnalysis: string
  features: string
  useCases: string
  techStack: string
  moreFeatures: string

  // Mindmap
  bookmarksImported: string
  bookmarksNotYetCategorized: string
  importAndCategorizeFirst: string

  // AI Search
  findAnything: string
}

const en: Translations = {
  dashboard: 'Dashboard',
  githubRepos: 'GitHub Repos',
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
  dmOnX: 'DM @viperr on X',
  runAiAutoCategorize: 'Run AI to auto-categorize →',
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

  // Settings Page
  settingsTitle: 'Settings',
  settingsDescription: 'Configure your Siftly instance',
  configuration: 'Configuration',
  appearance: 'Appearance',
  language: 'Language',
  languageDescription: 'Choose your preferred interface language',
  theme: 'Theme',
  themeDescription: 'Toggle between light and dark mode',
  lightMode: 'Light',
  darkMode: 'Dark',
  aiProvider: 'AI Provider',
  aiProviderDescription: 'Choose your AI provider and configure keys. CLI auth means no key needed.',
  chooseAiProvider: 'Choose AI provider',
  anthropicClaude: 'Anthropic (Claude)',
  openaiGpt: 'OpenAI (GPT)',
  apiKey: 'API Key',
  apiKeyPlaceholder: 'sk-ant-api03-...',
  save: 'Save',
  saved: 'Saved',
  remove: 'Remove',
  removing: 'Removing…',
  test: 'Test',
  testing: 'Testing…',
  working: 'Working',
  failed: 'Failed',
  saved2: 'Saved:',
  enterNewKeyToReplace: 'Enter new key to replace…',
  getKey: 'Get key',
  loadingSettings: 'Loading settings…',
  testConnection: 'Test Connection',
  usedForAiCategorization: 'Used for AI categorization, search, and image analysis.',
  cliDetected: 'Claude CLI detected — no API key needed',
  cliNotNeeded: 'Signed in as',
  signedInAs: 'Signed in as',
  willUseSubscriptionAutomatically: 'Siftly will use your subscription automatically. An API key below will take priority if set.',
  apiKeyWillTakePriority: '',
  cliSessionExpired: 'Claude CLI session expired',
  runCluadeRefresh: 'Run claude in your terminal to refresh the session, then reload this page.',
  noCliDetected: 'No Claude CLI detected',
  installClaudeCode: 'Install Claude Code and sign in to skip the API key entirely, or paste your API key below.',
  keysStoredPlaintext: 'Keys are stored in plaintext in your local SQLite database',
  doNotExposeDatabase: 'Do not expose the database file.',
  model: 'Model:',
  appliesToAllAiOps: 'Applies to all AI operations — API key and Claude CLI',
  opusSlowWarning: 'Opus is slow with 20 parallel workers — consider Sonnet or Haiku for faster bulk categorization.',
  considerSonnetOrHaiku: '',

  // X OAuth
  xOAuth: 'X (Twitter) OAuth 2.0',
  xOAuthDescription: 'Connect your X account to import bookmarks using the official API.',
  connectXAccount: 'Connect your X account',
  clientId: 'Client ID',
  clientSecret: 'Client Secret',
  clientSecretOptional: 'Client Secret (optional for public clients)',
  credentialsSaved: 'X OAuth credentials saved',
  credentialsRemoved: 'X OAuth credentials removed',
  getCredentialsFrom: 'Get credentials from the',
  xDeveloperPortal: 'X Developer Portal',
  callbackUrl: 'Callback URL:',
  saveOAuthCredentials: 'Save X OAuth Credentials',

  // GitHub PAT
  githubPat: 'GitHub Personal Access Token',
  githubPatDescription: 'Sync GitHub repos from your bookmarks.',
  githubPatHint: 'Required to fetch repo metadata and README content. Requires repo scope.',

  // Bird CLI
  birdCli: 'X Bookmark CLI Import',
  birdCliDescription: 'Use the bird CLI to fetch bookmarks directly. No X Premium needed.',
  birdAuthToken: 'auth_token',
  birdCt0: 'ct0',
  birdAuthTokenHint: 'Found in browser cookies (x.com → DevTools → Application → Cookies)',
  birdCt0Hint: 'Found in browser cookies (x.com → DevTools → Application → Cookies)',
  birdCredentialsSaved: 'Bird credentials saved',
  birdFetchNow: 'Fetch Bookmarks Now',
  birdFetching: 'Fetching bookmarks…',
  birdImportComplete: 'Bird import complete',
  birdNotConfigured: 'Bird CLI not configured',
  birdAddCredentialsFirst: 'Add auth_token and ct0 first',
  savedBirdCredentials: 'Bird credentials configured',
  removeBirdCredentials: 'Remove Bird credentials',
  removeBirdCredentialsConfirm: 'Are you sure you want to remove Bird credentials?',

  // Data Management
  dataManagement: 'Data Management',
  dataManagementDescription: 'Export all your bookmarks and category data for backup or migration.',
  exportAllBookmarks: 'Export all your bookmarks',
  exportAsCsv: 'Export as CSV',
  exportAsJson: 'Export as JSON',
  spreadsheetCompatible: 'Spreadsheet-compatible format',
  fullDataWithFields: 'Full data with all fields',
  permanentlyDeleteAll: 'Permanently delete all imported bookmarks',
  clearAll: 'Clear all',
  areYouSure: 'Are you sure?',
  cancel: 'Cancel',
  yesDeleteAll: 'Yes, delete all',
  deleting: 'Deleting…',
  allBookmarksDeleted: 'All bookmarks deleted successfully',

  // Danger Zone
  dangerZone: 'Danger Zone',
  dangerZoneDescription: 'Irreversible actions that affect all your data.',
  irreversibleActions: 'Irreversible actions',
  clearAllBookmarks: 'Clear all bookmarks',
  permanentlyDeleteBookmarks: 'Permanently delete all imported bookmarks',

  // About
  about: 'About Siftly',
  aboutDescription: 'Self-hosted Twitter bookmark manager',
  siftlyDescription: 'is a self-hosted app for organizing your Twitter/X bookmarks.',
  siftlyAboutDetail: 'Use the built-in bookmarklet or console script to import, then run the 4-stage AI pipeline to analyze images, extract entities, generate semantic tags, and auto-categorize.',
  builtBy: 'Built & open-sourced by',
  supportDevelopment: 'Support development',
  ifSiftlySavesYouTime: 'If Siftly saves you time, consider leaving a tip',
  addressCopied: 'Address copied!',

  // General
  success: 'Success',
  error: 'Error',
  description: 'Description',
  copy: 'Copy',
  copied: 'Copied!',
  disconnect: 'Disconnect',
  retry: 'Retry',
  cleared: 'Cleared',
  saving: 'Saving…',
  hideKey: 'Hide key',
  showKey: 'Show key',
  connectionError: 'Connection error',
  failedToSaveModel: 'Failed to save model preference',
  failedToSaveProvider: 'Failed to save provider preference',
  switchedTo: 'Switched to',
  failedToRemoveKey: 'Failed to remove key',
  failedToSaveApiKey: 'Failed to save API key',
  failedToSaveOAuth: 'Failed to save',
  failedToRemoveOAuth: 'Failed to remove',

  // Import Page
  importBookmarks: 'Import Bookmarks',
  importDescription: 'Export your X/Twitter bookmarks as JSON, then upload below.',
  step1: 'Upload',
  step2: 'Importing',
  step3: 'Categorize',
  importingBookmarks: 'Importing bookmarks…',
  thisMayTakeAMoment: 'This may take a moment',
  importComplete: 'Import Complete',
  imported: 'imported',
  skipped: 'skipped',
  asDuplicates: 'as duplicates',
  startingAiCategorization: 'Starting AI categorization…',
  liveImport: 'Live Import',
  liveImportRecommended: 'Recommended',
  bookmarklet: 'Bookmarklet',
  console: 'Console',
  dropJsonHere: 'Drop your JSON file here',
  orClickToBrowse: 'or click to browse',
  uploadDownloadedFile: 'Upload the downloaded file',
  dragToBookmarkBar: 'Drag to bookmark bar',
  manualWorksInAllBrowsers: 'Manual (works in all browsers)',
  addBookmarkBar: 'Add bookmark / New bookmark',
  addBookmark: 'Add bookmark',
  copyUrlBelow: 'Copy the URL below',
  goToBookmarksPage: 'Go to x.com/i/bookmarks while logged in',
  clickExportInBookmarkBar: 'Click "Export X Bookmarks" in your bookmark bar',
  exportButtonAppears: 'A purple Export button will appear on the page',
  clickAutoScrollCapture: 'Click "Auto-scroll" to capture all bookmarks automatically',
  autoScrollAppears: 'A second button appears below the export button',
  clickPurpleExport: 'Click the purple "Export N bookmarks" button',
  downloadedAutomatically: 'A bookmarks.json file will download automatically',
  goToDevTools: 'Open browser DevTools and go to the Console tab',
  pressF12: 'Press F12 on Windows/Linux or Cmd+Option+J on Mac',
  pasteAndRunScript: 'Paste and run the script below',
  pressEnterScroll: 'Press Enter, then scroll through all your bookmarks',
  purpleButtonAppears: 'A purple button will appear. Scroll slowly to capture all bookmarks.',
  xOAuthRecommended: 'X OAuth 2.0 (Recommended)',
  connectYourXAccount: 'Connect your X account',
  officialOAuthMethod: 'official OAuth 2.0 flow. No cookies or session tokens needed.',
  requiresOAuthClientId: 'Requires X OAuth Client ID in Settings. Scopes: bookmark.read, tweet.read, users.read',
  requiresBasicTier: 'Note: X API requires a paid Basic tier ($200/mo) or higher for bookmark.read scope.',
  xOAuthNotConfigured: 'X OAuth not configured',
  addOAuthInSettings: 'Add your X OAuth Client ID in Settings',
  connectedToX: 'Connected to X',
  tokenExpired: 'Token expired. Siftly will try to auto-refresh, or you can reconnect.',
  autoRefreshTry: 'Token expired. Siftly will try to auto-refresh.',
  fetchingBookmarks: 'Fetching bookmarks…',
  fetchBookmarksFromX: 'Fetch Bookmarks from X',
  stopPipeline: 'Stop pipeline',
  stopping: 'Stopping…',
  categorizationComplete: 'Categorization Complete!',
  imagesAnalyzedLabel: 'images analyzed',
  entitiesExtracted: 'entities extracted',
  bookmarksEnrichedLabel: 'bookmarks enriched',
  categorizedLabel: 'categorized',
  remaining: 'remaining',
  viewYourBookmarks: 'View your bookmarks',
  reprocessAll: 'Reprocess all',
  alreadyUpToDate: 'Already up to date',
  allBookmarksAlreadyImported: 'All bookmarks in this file were already imported',
  retryCategorization: 'Retry Categorization',
  lostConnectionServer: 'Lost connection to the server. The pipeline may still be running.',
  pipelineMayStillBeRunning: 'Refresh to check.',
  bookmarksNotYetProcessed: 'bookmarks not yet processed',
  process: 'Process',
  reAnalyzeAll: 'Re-analyze all',
  fromScratch: 'from scratch',
  dragToBookmarkBarTip: 'Drag this to your bookmarks bar — do not click',
  openDevTools: 'DevTools Console',
  liveImportDescription: 'Connect your X account to import bookmarks using the official API.',
  redirectingToX: 'Redirecting to X…',

  // Bookmarks Page
  browseBookmarks: 'Browse Bookmarks',
  allBookmarks: 'All Bookmarks',
  allTypes: 'All Types',
  allCategories: 'All Categories',
  filterByType: 'Filter by type',
  filterByCategory: 'Filter by category',
  sortBy: 'Sort by',
  newest: 'Newest',
  oldest: 'Oldest',
  noBookmarksFound: 'No bookmarks found',
  noBookmarksMatchFilters: 'No bookmarks match your filters',
  searchBookmarksPlaceholder: 'Search bookmarks…',
  clearFilters: 'Clear filters',
  photos: 'Photos',
  videos: 'Videos',
  allMedia: 'All media',
  newestFirst: 'Newest first',
  oldestFirst: 'Oldest first',

  // Category Translations
  catAiResources: 'AI & Machine Learning',
  catFinanceCrypto: 'Crypto & Web3',
  catDesign: 'Design & Product',
  catDevTools: 'Dev Tools & Engineering',
  catFinanceInvesting: 'Finance & Investing',
  catFunnyMemes: 'Funny & Memes',
  catGeneral: 'General',
  catHealthWellness: 'Health & Wellness',
  catNews: 'News & Politics',
  catProductivity: 'Productivity',
  catScienceResearch: 'Science & Research',
  catSecurityPrivacy: 'Security & Privacy',
  catStartupsBusiness: 'Startups & Business',

  // Bookmark Card
  less: 'less',
  noTextContent: 'No text content',
  editCategories: 'Edit categories',
  saveFailed: 'Save failed',
  loadingCategories: 'Loading…',
  noCategoriesFound: 'No categories found',
  downloadMedia: 'Download media',
  openOnX: 'Open on X',
  watchOnX: 'Watch on X ↗',
  viewOnX: 'View on X',
  viewArticleOnX: 'View Article on X',

  // Mindmap Page
  mindmapTitle: 'Knowledge Graph',
  viewAsGraph: 'View as graph',

  // AI Search Page
  aiSearchTitle: 'AI Search',
  aiSearchDescription: 'Search your bookmarks using natural language',
  askQuestion: 'Ask a question…',
  searching: 'Searching…',
  noResultsFound: 'No results found',
  aiSearchSubtitle: "Describe what you're looking for below.",
  aiPoweredSearch: 'AI-Powered Search',
  noBookmarksMatchedDescription: 'No bookmarks matched that description. Try different words.',

  // Categories
  categories: 'Categories',
  manageCategories: 'Manage categories',
  categoryName: 'Category name',
  addCategory: 'Add category',
  deleteCategory: 'Delete category',
  confirmDelete: 'Are you sure you want to delete this category?',
  noBookmarksInCategory: 'No bookmarks in this category',
  bookmarksAcrossXCategories: 'bookmarks across',
  organizeByTopic: 'Organize your bookmarks by topic',
  createFirstCategory: 'Create your first category to start organizing your bookmarks by topic.',
  createFirstCategoryBtn: 'Create first category',
  autoAssignBookmarks: 'to automatically assign bookmarks to your categories.',
  viewBookmarks: 'View bookmarks',
  loadingYourCategories: 'Loading your categories...',
  noCategoriesYet: 'No categories yet',
  tipUse: 'Tip: Use ',
  newCategory: 'New Category',
  color: 'Color',

  // GitHub Repos
  syncRepos: 'Sync Repos',
  syncing: 'Syncing…',
  sortByStars: 'Stars',
  sortByName: 'Name',
  sortByRecent: 'Recent',
  clickSyncReposEmpty: 'Click "Sync Repos" to extract all GitHub links from your bookmarks and fetch metadata.',
  searchReposPlaceholder: 'Search repos by name or description…',
  githubTokenNotConfigured: 'GitHub token not configured',
  githubTokenNotConfiguredDesc: 'Add a GitHub Personal Access Token in Settings to enable repo syncing. Requires repo scope.',
  reposSynced: 'synced',
  reposAnalyzed: 'analyzed',
  noReposSyncedYet: 'No repos synced yet',
  viewOnGithub: 'View on GitHub',
  reanalyze: 'Re-analyze',
  analyzing: 'Analyzing…',
  pendingAiAnalysis: 'Pending AI analysis',
  features: 'Features',
  useCases: 'Use Cases',
  techStack: 'Stack:',
  moreFeatures: 'more',

  // Mindmap
  bookmarksImported: 'You have',
  bookmarksNotYetCategorized: 'Bookmarks Not Categorized Yet',
  importAndCategorizeFirst: 'Import and categorize bookmarks first.',
  bookmarksOfTotal: 'bookmarks',
  mindmapRunAiFirst: 'Run AI categorization to populate the mindmap.',
  mindmapStartAiCategorization: 'Start AI Categorization',
  mindmapCategorizationComplete: 'Categorization complete!',
  mindmapReloading: 'Reloading your mindmap…',
  mindmapAiInProgress: 'AI Categorization in Progress',
  mindmapWillAutoPopulate: 'The mindmap will populate automatically when done.',

  // AI Search
  findAnything: 'Find anything in your bookmarks',
}

const zh: Translations = {
  dashboard: '仪表盘',
  githubRepos: 'GitHub 仓库',
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
  dmOnX: '在 X 上私信 @viperr',
  runAiAutoCategorize: '运行 AI 自动分类 →',
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

  // Settings Page
  settingsTitle: '设置',
  settingsDescription: '配置你的 Siftly 实例',
  configuration: '配置',
  appearance: '外观',
  language: '语言',
  languageDescription: '选择你喜欢的界面语言',
  theme: '主题',
  themeDescription: '切换浅色和深色模式',
  lightMode: '浅色',
  darkMode: '深色',
  aiProvider: 'AI 提供商',
  aiProviderDescription: '选择你的 AI 提供商并配置密钥。CLI 认证意味着无需密钥。',
  chooseAiProvider: '选择 AI 提供商',
  anthropicClaude: 'Anthropic (Claude)',
  openaiGpt: 'OpenAI (GPT)',
  apiKey: 'API 密钥',
  apiKeyPlaceholder: 'sk-ant-api03-...',
  save: '保存',
  saved: '已保存',
  remove: '移除',
  removing: '移除中…',
  test: '测试',
  testing: '测试中…',
  working: '正常',
  failed: '失败',
  saved2: '已保存：',
  enterNewKeyToReplace: '输入新密钥替换…',
  getKey: '获取密钥',
  loadingSettings: '加载设置中…',
  testConnection: '测试连接',
  usedForAiCategorization: '用于 AI 分类、搜索和图像分析。',
  cliDetected: '检测到 Claude CLI — 无需 API 密钥',
  cliNotNeeded: '登录为',
  signedInAs: '登录为',
  willUseSubscriptionAutomatically: 'Siftly 将自动使用你的订阅。如果设置了 API 密钥，下方密钥将优先使用。',
  apiKeyWillTakePriority: '',
  cliSessionExpired: 'Claude CLI 会话已过期',
  runCluadeRefresh: '在终端运行 claude 刷新会话，然后刷新此页面。',
  noCliDetected: '未检测到 Claude CLI',
  installClaudeCode: '安装 Claude Code 并登录可跳过 API 密钥，或在下方粘贴你的 API 密钥。',
  keysStoredPlaintext: '密钥以明文形式存储在本地 SQLite 数据库中',
  doNotExposeDatabase: '不要暴露数据库文件。',
  model: '模型：',
  appliesToAllAiOps: '适用于所有 AI 操作 — API 密钥和 Claude CLI',
  opusSlowWarning: 'Opus 在 20 个并行工作线程下较慢 — 考虑使用 Sonnet 或 Haiku 以加快批量分类速度。',
  considerSonnetOrHaiku: '',

  // X OAuth
  xOAuth: 'X (Twitter) OAuth 2.0',
  xOAuthDescription: '连接你的 X 账户以使用官方 API 导入书签。',
  connectXAccount: '连接你的 X 账户',
  clientId: '客户端 ID',
  clientSecret: '客户端密钥',
  clientSecretOptional: '客户端密钥（公共客户端可选）',
  credentialsSaved: 'X OAuth 凭据已保存',
  credentialsRemoved: 'X OAuth 凭据已移除',
  getCredentialsFrom: '从以下位置获取凭据',
  xDeveloperPortal: 'X 开发者门户',
  callbackUrl: '回调 URL：',
  saveOAuthCredentials: '保存 X OAuth 凭据',

  // GitHub PAT
  githubPat: 'GitHub 个人访问令牌',
  githubPatDescription: '从书签中同步 GitHub 仓库。',
  githubPatHint: '用于获取仓库元数据和 README 内容。需要 repo 权限。',

  // Bird CLI
  birdCli: 'X 书签 CLI 导入',
  birdCliDescription: '使用 bird CLI 直接拉取书签。无需 X Premium。',
  birdAuthToken: 'auth_token',
  birdCt0: 'ct0',
  birdAuthTokenHint: '从浏览器 Cookie 获取（x.com → 开发者工具 → Application → Cookies）',
  birdCt0Hint: '从浏览器 Cookie 获取（x.com → 开发者工具 → Application → Cookies）',
  birdCredentialsSaved: 'Bird 凭据已保存',
  birdFetchNow: '立即拉取书签',
  birdFetching: '正在拉取书签…',
  birdImportComplete: 'Bird 导入完成',
  birdNotConfigured: 'Bird CLI 未配置',
  birdAddCredentialsFirst: '请先填写 auth_token 和 ct0',
  savedBirdCredentials: 'Bird 凭据已配置',
  removeBirdCredentials: '移除 Bird 凭据',
  removeBirdCredentialsConfirm: '确定要移除 Bird 凭据吗？',

  // Data Management
  dataManagement: '数据管理',
  dataManagementDescription: '导出所有书签和分类数据以进行备份或迁移。',
  exportAllBookmarks: '导出所有书签',
  exportAsCsv: '导出为 CSV',
  exportAsJson: '导出为 JSON',
  spreadsheetCompatible: '电子表格兼容格式',
  fullDataWithFields: '包含所有字段的完整数据',
  permanentlyDeleteAll: '永久删除所有已导入的书签',
  clearAll: '清除全部',
  areYouSure: '确定吗？',
  cancel: '取消',
  yesDeleteAll: '是，删除全部',
  deleting: '删除中…',
  allBookmarksDeleted: '所有书签已成功删除',

  // Danger Zone
  dangerZone: '危险区域',
  dangerZoneDescription: '影响所有数据的不可逆操作。',
  irreversibleActions: '不可逆操作',
  clearAllBookmarks: '清除所有书签',
  permanentlyDeleteBookmarks: '永久删除所有已导入的书签',

  // About
  about: '关于 Siftly',
  aboutDescription: '自托管 Twitter 书签管理器',
  siftlyDescription: '是一个自托管应用，用于整理你的 Twitter/X 书签。',
  siftlyAboutDetail: '使用内置的书签工具或控制台脚本导入，然后运行 4 阶段 AI 处理管线来分析图像、提取实体、生成语义标签和自动分类。',
  builtBy: '构建者和开源贡献者',
  supportDevelopment: '支持开发',
  ifSiftlySavesYouTime: '如果 Siftly 节省了你的时间，考虑留下小费',
  addressCopied: '地址已复制！',

  // General
  success: '成功',
  error: '错误',
  description: '描述',
  copy: '复制',
  copied: '已复制！',
  disconnect: '断开连接',
  retry: '重试',
  cleared: '已清除',
  saving: '保存中…',
  hideKey: '隐藏密钥',
  showKey: '显示密钥',
  connectionError: '连接错误',
  failedToSaveModel: '保存模型偏好失败',
  failedToSaveProvider: '保存提供商偏好失败',
  switchedTo: '已切换到',
  failedToRemoveKey: '移除密钥失败',
  failedToSaveApiKey: '保存 API 密钥失败',
  failedToSaveOAuth: '保存失败',
  failedToRemoveOAuth: '移除失败',

  // Import Page
  importBookmarks: '导入书签',
  importDescription: '将 X/Twitter 书签导出为 JSON，然后上传。',
  step1: '上传',
  step2: '导入中',
  step3: '分类',
  importingBookmarks: '正在导入书签…',
  thisMayTakeAMoment: '这可能需要一些时间',
  importComplete: '导入完成',
  imported: '已导入',
  skipped: '跳过',
  asDuplicates: '重复书签',
  startingAiCategorization: '正在启动 AI 分类…',
  liveImport: '实时导入',
  liveImportRecommended: '推荐',
  bookmarklet: '书签小工具',
  console: '控制台',
  dropJsonHere: '将 JSON 文件拖到这里',
  orClickToBrowse: '或点击浏览',
  uploadDownloadedFile: '上传下载的文件',
  dragToBookmarkBar: '拖到书签栏',
  manualWorksInAllBrowsers: '手动方式（所有浏览器可用）',
  addBookmarkBar: '添加书签 / 新建书签',
  addBookmark: '添加书签',
  copyUrlBelow: '复制下方链接',
  goToBookmarksPage: '登录后访问 x.com/i/bookmarks',
  clickExportInBookmarkBar: '点击书签栏中的"导出 X 书签"',
  exportButtonAppears: '页面上会出现一个紫色的导出按钮',
  clickAutoScrollCapture: '点击"自动滚动"自动抓取所有书签',
  autoScrollAppears: '导出按钮下方会出现第二个按钮',
  clickPurpleExport: '点击紫色的"导出 N 条书签"按钮',
  downloadedAutomatically: '会自动下载一个 bookmarks.json 文件',
  goToDevTools: '打开浏览器开发者工具，进入控制台标签',
  pressF12: 'Windows/Linux 按 F12，Mac 按 Cmd+Option+J',
  pasteAndRunScript: '粘贴并运行下方脚本',
  pressEnterScroll: '按回车键，然后滚动浏览所有书签',
  purpleButtonAppears: '会出现一个紫色按钮。慢慢滚动以抓取所有书签。',
  xOAuthRecommended: 'X OAuth 2.0（推荐）',
  connectYourXAccount: '连接你的 X 账户',
  officialOAuthMethod: '官方 OAuth 2.0 流程。无需 cookies 或会话令牌。',
  requiresOAuthClientId: '需要在设置中填写 X OAuth 客户端 ID。权限范围：bookmark.read, tweet.read, users.read',
  requiresBasicTier: '注意：X API 需要付费的 Basic 套餐（$200/月）才能访问 bookmark.read 权限。',
  xOAuthNotConfigured: 'X OAuth 未配置',
  addOAuthInSettings: '在设置中添加你的 X OAuth 客户端 ID',
  connectedToX: '已连接到 X',
  tokenExpired: '令牌已过期。Siftly 会尝试自动刷新，或者你可以重新连接。',
  autoRefreshTry: '令牌已过期。Siftly 会尝试自动刷新。',
  fetchingBookmarks: '正在获取书签…',
  fetchBookmarksFromX: '从 X 获取书签',
  stopPipeline: '停止处理',
  stopping: '停止中…',
  categorizationComplete: '分类完成！',
  imagesAnalyzedLabel: '张图片已分析',
  entitiesExtracted: '个实体已提取',
  bookmarksEnrichedLabel: '条书签已增强',
  categorizedLabel: '条已分类',
  remaining: '剩余',
  viewYourBookmarks: '查看书签',
  reprocessAll: '全部重新处理',
  alreadyUpToDate: '已是最新',
  allBookmarksAlreadyImported: '此文件中的所有书签都已被导入',
  retryCategorization: '重试分类',
  lostConnectionServer: '与服务器的连接丢失。处理管线可能仍在运行。',
  pipelineMayStillBeRunning: '请刷新页面检查。',
  bookmarksNotYetProcessed: '条书签尚未处理',
  process: '处理',
  reAnalyzeAll: '重新分析所有',
  fromScratch: '从头开始',
  dragToBookmarkBarTip: '拖到书签栏 — 不要点击',
  openDevTools: '开发者工具控制台',
  liveImportDescription: '连接你的 X 账户以使用官方 API 导入书签。',
  redirectingToX: '正在跳转到 X…',

  // Bookmarks Page
  browseBookmarks: '浏览书签',
  allBookmarks: '所有书签',
  allTypes: '所有类型',
  allCategories: '所有分类',
  filterByType: '按类型筛选',
  filterByCategory: '按分类筛选',
  sortBy: '排序',
  newest: '最新',
  oldest: '最旧',
  noBookmarksFound: '未找到书签',
  noBookmarksMatchFilters: '没有书签符合筛选条件',
  searchBookmarksPlaceholder: '搜索书签…',
  clearFilters: '清除筛选',
  photos: '图片',
  videos: '视频',
  allMedia: '所有媒体',
  newestFirst: '最新优先',
  oldestFirst: '最旧优先',

  // Category Translations
  catAiResources: 'AI 与机器学习',
  catFinanceCrypto: '加密货币与 Web3',
  catDesign: '设计与产品',
  catDevTools: '开发工具与工程',
  catFinanceInvesting: '金融与投资',
  catFunnyMemes: '趣味与梗',
  catGeneral: '通用',
  catHealthWellness: '健康与养生',
  catNews: '新闻与政治',
  catProductivity: '效率工具',
  catScienceResearch: '科学研究',
  catSecurityPrivacy: '安全与隐私',
  catStartupsBusiness: '创业与商业',

  // Bookmark Card
  less: '收起',
  noTextContent: '无文字内容',
  editCategories: '编辑分类',
  saveFailed: '保存失败',
  loadingCategories: '加载中…',
  noCategoriesFound: '未找到分类',
  downloadMedia: '下载媒体',
  openOnX: '在 X 上查看',
  watchOnX: '在 X 上观看 ↗',
  viewOnX: '在 X 上查看',
  viewArticleOnX: '在 X 上阅读文章',

  // Mindmap Page
  mindmapTitle: '知识图谱',
  viewAsGraph: '以图谱查看',

  // AI Search Page
  aiSearchTitle: 'AI 搜索',
  aiSearchDescription: '使用自然语言搜索你的书签',
  askQuestion: '问一个问题…',
  searching: '搜索中…',
  noResultsFound: '未找到结果',
  aiSearchSubtitle: '在下方描述你要查找的内容。',
  aiPoweredSearch: 'AI 驱动搜索',
  noBookmarksMatchedDescription: '没有书签匹配此描述。请尝试不同的关键词。',

  // Categories
  categories: '分类',
  manageCategories: '管理分类',
  categoryName: '分类名称',
  addCategory: '添加分类',
  deleteCategory: '删除分类',
  confirmDelete: '确定要删除这个分类吗？',
  noBookmarksInCategory: '此分类下暂无书签',
  bookmarksAcrossXCategories: '条书签分布在',
  organizeByTopic: '按主题整理你的书签',
  createFirstCategory: '创建你的第一个分类，开始按主题整理书签。',
  createFirstCategoryBtn: '创建第一个分类',
  autoAssignBookmarks: '来自动将书签分配到你的分类。',
  viewBookmarks: '查看书签',
  loadingYourCategories: '加载中…',
  noCategoriesYet: '暂无分类',
  tipUse: '提示：使用 ',
  newCategory: '新建分类',
  color: '颜色',

  // GitHub Repos
  syncRepos: '同步仓库',
  syncing: '同步中…',
  sortByStars: '星标',
  sortByName: '名称',
  sortByRecent: '最新',
  clickSyncReposEmpty: '点击"同步仓库"从书签中提取所有 GitHub 链接并获取元数据。',
  searchReposPlaceholder: '按名称或描述搜索仓库…',
  githubTokenNotConfigured: '未配置 GitHub 令牌',
  githubTokenNotConfiguredDesc: '在设置中添加 GitHub 个人访问令牌以启用仓库同步。需要 repo 权限。',
  reposSynced: '已同步',
  reposAnalyzed: '已分析',
  noReposSyncedYet: '尚未同步任何仓库',
  viewOnGithub: '在 GitHub 上查看',
  reanalyze: '重新分析',
  analyzing: '分析中…',
  pendingAiAnalysis: '等待 AI 分析',
  features: '功能特点',
  useCases: '使用场景',
  techStack: '技术栈：',
  moreFeatures: '更多',

  // Mindmap
  bookmarksImported: '你已导入',
  bookmarksNotYetCategorized: '书签尚未分类',
  importAndCategorizeFirst: '请先导入并分类书签。',
  bookmarksOfTotal: '条书签',
  mindmapRunAiFirst: '运行 AI 分类来填充思维导图。',
  mindmapStartAiCategorization: '开始 AI 分类',
  mindmapCategorizationComplete: '分类完成！',
  mindmapReloading: '正在重新加载思维导图…',
  mindmapAiInProgress: 'AI 分类进行中',
  mindmapWillAutoPopulate: '思维导图完成后会自动填充。',

  // AI Search
  findAnything: '在你的书签中查找任何内容',
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
