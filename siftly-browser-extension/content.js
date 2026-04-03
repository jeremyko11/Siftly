// Siftly Browser Extension — Content Script
// Auto-extracts page metadata and notifies background script

(function () {
  // Extract page metadata
  const title =
    document.querySelector('meta[property="og:title"]')?.content ||
    document.querySelector('meta[name="twitter:title"]')?.content ||
    document.title

  const url = window.location.href

  // Notify background script of page data
  chrome.runtime.sendMessage({
    type: 'SAVED_PAGE_DATA',
    url,
    title,
  }).catch(() => {
    // Ignore errors if background script isn't ready
  })
})()
