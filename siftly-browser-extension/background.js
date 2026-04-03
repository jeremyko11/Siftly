// Siftly Browser Extension — Background Service Worker

// ── Context menu: "Save to Siftly" on right-click ─────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'siftly-save',
    title: 'Save to Siftly',
    contexts: ['page', 'link'],
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'siftly-save') return

  const url = info.linkUrl || info.pageUrl
  const title = info.linkText || tab?.title || url

  // Store temp data and open popup
  await chrome.storage.local.set({ siftlyPendingUrl: url, siftlyPendingTitle: title })
  chrome.action.openPopup().catch(() => {
    // Fallback: open options page with pending flag
    chrome.runtime.openOptionsPage()
  })
})

// ── Listen for messages from content script ────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVED_PAGE_DATA') {
    // Store page data for the popup
    chrome.storage.local.set({
      siftlyPendingUrl: message.url,
      siftlyPendingTitle: message.title,
    })
    sendResponse({ ok: true })
  }
  return true
})
