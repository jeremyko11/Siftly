# Siftly Browser Extension

Save any webpage to your Siftly bookmark manager with one click.

## Setup

### 1. Configure Siftly Server URL

1. Open Chrome and go to `chrome://extensions/`
2. Find **Siftly Saver** and click **Details**
3. Scroll to **Extension options** and set your Siftly server URL (e.g. `http://localhost:3000` or your public Tailscale URL)

### 2. Create Icons

The extension needs PNG icons. Create them from the logo:

```bash
# Using ImageMagick (macOS/Linux)
convert -resize 16x16 siftly-logo.png icons/icon16.png
convert -resize 48x48 siftly-logo.png icons/icon48.png
convert -resize 128x128 siftly-logo.png icons/icon128.png
```

Or use any image editor to export 16x16, 48x48, and 128x128 PNG icons from the Siftly logo (`public/logo.svg`).

### 3. Load the Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `siftly-browser-extension` folder

## Usage

### From the toolbar
Click the Siftly icon in your Chrome toolbar to open the popup and save the current page.

### From right-click menu
Right-click any webpage or link and select **"Save to Siftly"**

### Keyboard shortcut
Default: none assigned. Set one in `chrome://extensions` → Keyboard shortcuts.

## Features

- One-click save from any webpage
- Add notes and tags
- Auto-fetches content for YouTube, Reddit, and articles (via Siftly's Agent-Reach)
- Context menu integration
- Works with any Siftly instance via URL configuration

## Files

```
siftly-browser-extension/
  manifest.json     — Extension manifest (Manifest V3)
  popup.html       — Save popup UI
  popup.js         — Popup logic
  background.js    — Service worker (context menu, messaging)
  content.js       — Content script (auto-extracts page data)
  icons/           — PNG icons (create these yourself)
  README.md        — This file
```
