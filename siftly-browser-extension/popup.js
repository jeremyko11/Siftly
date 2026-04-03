// Siftly Browser Extension — Popup Script

let siftlyUrl = ''
let tags = []
let pageData = { url: '', title: '' }

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Load settings
  const stored = await chrome.storage.local.get(['siftlyUrl', 'siftlyApiKey'])
  siftlyUrl = stored.siftlyUrl || ''

  if (!siftlyUrl) {
    document.getElementById('not-configured').style.display = 'block'
    document.getElementById('main-ui').style.display = 'none'
    return
  }

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab) {
    pageData.url = tab.url || ''
    pageData.title = tab.title || ''
    document.getElementById('page-title').textContent = pageData.title
    document.getElementById('page-url').textContent = pageData.url
  }

  setupTagInput()
  setupEventListeners()
})

// ── Tag input ────────────────────────────────────────────────────────────────

function setupTagInput() {
  const container = document.getElementById('tags-container')
  const input = document.getElementById('tag-input')

  function renderTags() {
    // Remove existing tag elements (keep input)
    container.querySelectorAll('.tag').forEach((el) => el.remove())
    // Insert tags before input
    tags.forEach((tag) => {
      const el = document.createElement('span')
      el.className = 'tag'
      el.innerHTML = `${escapeHtml(tag)}<button data-tag="${escapeHtml(tag)}">×</button>`
      container.insertBefore(el, input)
    })
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = input.value.trim().replace(/,$/, '')
      if (val && !tags.includes(val)) {
        tags.push(val)
        renderTags()
      }
      input.value = ''
    } else if (e.key === 'Backspace' && !input.value && tags.length > 0) {
      tags.pop()
      renderTags()
    }
  })

  container.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const tag = e.target.dataset.tag
      tags = tags.filter((t) => t !== tag)
      renderTags()
    } else {
      input.focus()
    }
  })
}

// ── Event listeners ───────────────────────────────────────────────────────────

function setupEventListeners() {
  document.getElementById('save-btn').addEventListener('click', () => saveBookmark(false))
  document.getElementById('save-and-fetch').addEventListener('click', () => saveBookmark(true))
  document.getElementById('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage())
  document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })
}

// ── Save bookmark ───────────────────────────────────────────────────────────

async function saveBookmark(fetchContent) {
  const btn = document.getElementById('save-btn')
  const btn2 = document.getElementById('save-and-fetch')
  const status = document.getElementById('status')

  btn.disabled = true
  btn2.disabled = true
  status.className = 'status loading'
  status.textContent = 'Saving…'
  status.style.display = 'block'

  try {
    const notes = document.getElementById('notes').value.trim()
    const apiUrl = `${siftlyUrl.replace(/\/$/, '')}/api/import/url`

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: pageData.url,
        title: pageData.title,
        text: notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const data = await res.json()
    status.className = 'status success'
    status.textContent = data.duplicate ? 'Already saved!' : 'Saved to Siftly!'
    setTimeout(() => { window.close() }, 1200)
  } catch (err) {
    status.className = 'status error'
    status.textContent = err.message || 'Failed to save'
    btn.disabled = false
    btn2.disabled = false
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
