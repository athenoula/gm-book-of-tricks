# Web Clipper Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that clips web content (pages, text selections, images) directly into the GM Book of Tricks Inspiration Board.

**Architecture:** Chrome Manifest V3 extension with vanilla JS (no React, no build step). Communicates directly with Supabase using the bundled JS client. Content script grabs page info, background service worker manages context menu, popup handles UI and save logic.

**Tech Stack:** Chrome Extension Manifest V3, @supabase/supabase-js (UMD bundle), vanilla JS/HTML/CSS.

**Spec:** `docs/superpowers/specs/2026-03-21-web-clipper-design.md`

**Important:** This extension lives in `extension/` at the project root (sibling to `app/`). No changes to the existing app are needed.

---

### Task 1: Extension Scaffold — manifest.json + Icons

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/icons/icon-16.png`
- Create: `extension/icons/icon-48.png`
- Create: `extension/icons/icon-128.png`

- [ ] **Step 1: Create the extension directory structure**

```bash
mkdir -p extension/popup extension/lib extension/icons
```

- [ ] **Step 2: Create manifest.json**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Book of Tricks Clipper",
  "version": "1.0.0",
  "description": "Clip web content to your GM Book of Tricks inspiration board",
  "permissions": ["activeTab", "contextMenus", "storage"],
  "host_permissions": [
    "https://bytlbwwkglhfidrohneu.supabase.co/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 3: Generate extension icons**

Create a small HTML file that generates the icons using canvas, then open it in a browser and save the generated PNGs:

Create a temporary file `extension/icons/generate.html`:

```html
<!DOCTYPE html>
<html><body>
<script>
[16, 48, 128].forEach(size => {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  // Dark background
  ctx.fillStyle = '#1c1917'
  ctx.fillRect(0, 0, size, size)

  // Amber lightning bolt
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  const s = size / 16
  ctx.moveTo(9*s, 1*s)
  ctx.lineTo(4*s, 9*s)
  ctx.lineTo(7*s, 9*s)
  ctx.lineTo(6*s, 15*s)
  ctx.lineTo(12*s, 7*s)
  ctx.lineTo(9*s, 7*s)
  ctx.lineTo(11*s, 1*s)
  ctx.closePath()
  ctx.fill()

  // Download link
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = 'icon-' + size + '.png'
  a.textContent = 'Download icon-' + size + '.png'
  a.style.display = 'block'
  a.style.margin = '8px'
  document.body.appendChild(a)
  document.body.appendChild(c)
})
</script>
</body></html>
```

Open this file in Chrome, click each download link, and save the PNGs to `extension/icons/`. Then delete `generate.html`.

**Alternative:** Copy `app/public/favicon.svg`, open in a browser, and screenshot at 16x16, 48x48, 128x128. The icons can be refined later — they just need to exist for the extension to load.

- [ ] **Step 4: Verify extension loads**

Open `chrome://extensions/`, enable "Developer mode", click "Load unpacked", select the `extension/` folder. It should load without errors (popup and scripts don't exist yet, but the manifest should parse).

- [ ] **Step 5: Commit**

```bash
git add extension/
git commit -m "feat: scaffold Chrome extension with manifest and icons"
```

---

### Task 2: Supabase Client Bundle

**Files:**
- Create: `extension/lib/supabase-client.js` (downloaded UMD bundle)
- Create: `extension/lib/supabase.js` (client init)

- [ ] **Step 1: Download Supabase JS UMD bundle**

```bash
curl -L "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js" -o extension/lib/supabase-client.js
```

Verify the file downloaded and is not empty:

```bash
wc -c extension/lib/supabase-client.js
```

Expected: ~200-400KB file.

- [ ] **Step 2: Create Supabase client init**

Create `extension/lib/supabase.js`. Read the Supabase URL and anon key from `app/.env` first:

```bash
grep VITE_SUPABASE app/.env
```

Then create the file with those values:

```js
// extension/lib/supabase.js
// Note: anon key is public by design. RLS enforces all access control.
// These values must match what's in app/.env

const SUPABASE_URL = 'https://bytlbwwkglhfidrohneu.supabase.co'
const SUPABASE_ANON_KEY = '<paste anon key from app/.env>'

// IMPORTANT: Use `var` (not `const`) so `supabase` is attached to `window`
// and accessible from auth.js and popup.js which are loaded as separate scripts.
// `window.supabase` is the UMD namespace from supabase-client.js.
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
```

**IMPORTANT:** The implementer MUST read the actual anon key from `app/.env` and paste it into this file. Do NOT commit with placeholder text.

- [ ] **Step 3: Commit**

```bash
git add extension/lib/
git commit -m "feat: add bundled Supabase client for Chrome extension"
```

---

### Task 3: Auth Module

**Files:**
- Create: `extension/lib/auth.js`

- [ ] **Step 1: Create auth module**

Create `extension/lib/auth.js`:

```js
// extension/lib/auth.js
// Manual session management via chrome.storage.local
// (Supabase client's built-in storage requires sync getItem, chrome.storage is async)

const AUTH_STORAGE_KEY = 'supabaseSession'

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.session) {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: data.session })
  }
  return data
}

async function logout() {
  await supabase.auth.signOut()
  await chrome.storage.local.remove(AUTH_STORAGE_KEY)
}

async function restoreSession() {
  const result = await chrome.storage.local.get(AUTH_STORAGE_KEY)
  const storedSession = result[AUTH_STORAGE_KEY]
  if (!storedSession) return null

  const { data, error } = await supabase.auth.setSession(storedSession)
  if (error || !data.session) {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY)
    return null
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY)
    return null
  }

  return user
}

function listenForSessionChanges() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      chrome.storage.local.set({ [AUTH_STORAGE_KEY]: session })
    } else {
      chrome.storage.local.remove(AUTH_STORAGE_KEY)
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/lib/auth.js
git commit -m "feat: add auth module for Chrome extension session management"
```

---

### Task 4: Content Script

**Files:**
- Create: `extension/content.js`

- [ ] **Step 1: Create content script**

Create `extension/content.js`:

```js
// extension/content.js
// Lightweight content script — only responds to messages from the popup

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getPageInfo') {
    sendResponse({
      title: document.title,
      url: window.location.href,
      selectedText: window.getSelection()?.toString() || '',
    })
  }
  return true // Keep message channel open for async response
})
```

- [ ] **Step 2: Commit**

```bash
git add extension/content.js
git commit -m "feat: add content script for page info extraction"
```

---

### Task 5: Background Service Worker

**Files:**
- Create: `extension/background.js`

- [ ] **Step 1: Create background script**

Create `extension/background.js`:

```js
// extension/background.js
// Service worker: manages context menu for image clipping

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-image',
    title: 'Clip Image to Book of Tricks',
    contexts: ['image'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-image') {
    // Store image data for the popup to read
    chrome.storage.session.set({
      pendingClip: {
        type: 'image',
        imageUrl: info.srcUrl,
        pageTitle: tab.title,
        pageUrl: tab.url,
      }
    })
    // Try to open popup (Chrome 127+)
    if (chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {
        // Fallback: user clicks extension icon manually
        // pendingClip persists in session storage
      })
    }
  }
})
```

- [ ] **Step 2: Reload extension and verify context menu**

In `chrome://extensions/`, click the reload button on the extension. Right-click any image on a web page — "Clip Image to Book of Tricks" should appear in the context menu.

- [ ] **Step 3: Commit**

```bash
git add extension/background.js
git commit -m "feat: add background service worker with image context menu"
```

---

### Task 6: Popup UI — HTML + CSS

**Files:**
- Create: `extension/popup/popup.html`
- Create: `extension/popup/popup.css`

- [ ] **Step 1: Create popup HTML**

Create `extension/popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="popup.css">
  <title>Book of Tricks Clipper</title>
</head>
<body>
  <!-- Login state -->
  <div id="login-view" class="view" style="display: none;">
    <div class="header">
      <h1>Book of Tricks</h1>
      <p class="subtitle">Sign in to clip</p>
    </div>
    <form id="login-form">
      <input type="email" id="login-email" placeholder="Email" required>
      <input type="password" id="login-password" placeholder="Password" required>
      <button type="submit" id="login-btn">Sign In</button>
      <p id="login-error" class="error" style="display: none;"></p>
    </form>
  </div>

  <!-- Clip state -->
  <div id="clip-view" class="view" style="display: none;">
    <div class="header">
      <h1>Clip to Tricks</h1>
      <button id="logout-btn" class="link-btn">Sign out</button>
    </div>

    <!-- Preview -->
    <div id="image-preview" class="preview-image" style="display: none;">
      <img id="preview-img" src="" alt="Preview">
    </div>
    <div id="text-preview" class="preview-text" style="display: none;"></div>

    <!-- Form -->
    <div class="form-group">
      <label for="clip-title">Title</label>
      <input type="text" id="clip-title" placeholder="Clip title">
    </div>
    <div id="clip-url-group" class="form-group">
      <label>URL</label>
      <div id="clip-url" class="url-display"></div>
    </div>
    <div class="form-group">
      <label for="clip-campaign">Campaign</label>
      <select id="clip-campaign">
        <option value="">Global Inbox</option>
      </select>
    </div>
    <div class="form-group">
      <label for="clip-tags">Tags</label>
      <input type="text" id="clip-tags" placeholder="fantasy, npc, art (comma separated)">
    </div>

    <button id="save-btn" class="save-btn">Save Clip</button>
    <div id="error-state" style="display: none;">
      <p id="save-error" class="error"></p>
      <button id="retry-btn" class="link-btn" style="margin-top: 4px;">Try again</button>
    </div>
  </div>

  <!-- Success state -->
  <div id="success-view" class="view" style="display: none;">
    <div class="success-content">
      <div class="checkmark">✓</div>
      <p>Clipped!</p>
    </div>
  </div>

  <!-- Loading state -->
  <div id="loading-view" class="view" style="display: none;">
    <div class="loading-content">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  </div>

  <!-- LOAD ORDER MATTERS: supabase-client exposes window.supabase namespace,
       supabase.js creates the client, auth.js defines session helpers,
       popup.js uses all of them. Do not reorder. -->
  <script src="../lib/supabase-client.js"></script>
  <script src="../lib/supabase.js"></script>
  <script src="../lib/auth.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup CSS**

Create `extension/popup/popup.css`:

```css
/* Warm Craft theme for extension popup */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 360px;
  min-height: 200px;
  background: #1c1917;
  color: #d6d3d1;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

.view {
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h1 {
  font-family: Georgia, serif;
  font-size: 16px;
  color: #fef3c7;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.subtitle {
  color: #78716c;
  font-size: 12px;
}

/* Form elements */
.form-group {
  margin-bottom: 12px;
}

label {
  display: block;
  font-size: 11px;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}

input[type="text"],
input[type="email"],
input[type="password"],
select {
  width: 100%;
  padding: 8px 10px;
  background: #292524;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: #d6d3d1;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

input:focus,
select:focus {
  border-color: rgba(245, 158, 11, 0.3);
}

select {
  cursor: pointer;
}

/* Buttons */
button {
  cursor: pointer;
  font-family: inherit;
}

.save-btn,
#login-btn {
  width: 100%;
  padding: 10px;
  background: #f59e0b;
  color: #1c1917;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: background 0.15s;
  margin-top: 8px;
}

.save-btn:hover,
#login-btn:hover {
  background: #fbbf24;
}

.save-btn:disabled,
#login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.link-btn {
  background: none;
  border: none;
  color: #78716c;
  font-size: 11px;
  padding: 0;
  text-decoration: underline;
  transition: color 0.15s;
}

.link-btn:hover {
  color: #d6d3d1;
}

/* Preview */
.preview-image {
  margin-bottom: 12px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.preview-image img {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  display: block;
}

.preview-text {
  background: #292524;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #a8a29e;
  max-height: 80px;
  overflow-y: auto;
  font-style: italic;
  line-height: 1.5;
}

.url-display {
  font-size: 11px;
  color: #78716c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Error */
.error {
  color: #e07a5f;
  font-size: 11px;
  margin-top: 8px;
}

/* Success */
.success-content,
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  gap: 8px;
}

.checkmark {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2d6a4f;
  color: #52b788;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

/* Spinner */
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(245, 158, 11, 0.2);
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 3: Reload extension and click icon**

Reload the extension in `chrome://extensions/`. Click the extension icon — the popup should render (login form, since no JS logic yet, the views are hidden by default).

- [ ] **Step 4: Commit**

```bash
git add extension/popup/
git commit -m "feat: add popup HTML and Warm Craft CSS for clipper"
```

---

### Task 7: Popup Logic — The Main Event

**Files:**
- Create: `extension/popup/popup.js`

- [ ] **Step 1: Create popup logic**

Create `extension/popup/popup.js`:

```js
// extension/popup/popup.js

// DOM elements
const loginView = document.getElementById('login-view')
const clipView = document.getElementById('clip-view')
const successView = document.getElementById('success-view')
const loadingView = document.getElementById('loading-view')

const loginForm = document.getElementById('login-form')
const loginEmail = document.getElementById('login-email')
const loginPassword = document.getElementById('login-password')
const loginBtn = document.getElementById('login-btn')
const loginError = document.getElementById('login-error')

const logoutBtn = document.getElementById('logout-btn')
const clipTitle = document.getElementById('clip-title')
const clipUrl = document.getElementById('clip-url')
const clipUrlGroup = document.getElementById('clip-url-group')
const clipCampaign = document.getElementById('clip-campaign')
const clipTags = document.getElementById('clip-tags')
const saveBtn = document.getElementById('save-btn')
const saveError = document.getElementById('save-error')
const errorState = document.getElementById('error-state')
const retryBtn = document.getElementById('retry-btn')

const imagePreview = document.getElementById('image-preview')
const previewImg = document.getElementById('preview-img')
const textPreview = document.getElementById('text-preview')

// State
let currentUser = null
let clipData = { type: 'link', title: '', url: '', content: '', mediaUrl: '' }

// --- View Management ---

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none')
  document.getElementById(viewId).style.display = 'block'
}

// --- Init ---

async function init() {
  showView('loading-view')
  listenForSessionChanges()

  currentUser = await restoreSession()
  if (!currentUser) {
    showView('login-view')
    return
  }

  await loadClipData()
  await loadCampaigns()
  showView('clip-view')
}

// --- Auth ---

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  loginError.style.display = 'none'
  loginBtn.disabled = true
  loginBtn.textContent = 'Signing in...'

  try {
    const data = await login(loginEmail.value, loginPassword.value)
    currentUser = data.user
    await loadClipData()
    await loadCampaigns()
    showView('clip-view')
  } catch (err) {
    loginError.textContent = err.message || 'Sign in failed'
    loginError.style.display = 'block'
  } finally {
    loginBtn.disabled = false
    loginBtn.textContent = 'Sign In'
  }
})

logoutBtn.addEventListener('click', async () => {
  await logout()
  currentUser = null
  showView('login-view')
})

// --- Load Clip Data ---

async function loadClipData() {
  // Check for pending image clip from context menu
  const { pendingClip } = await chrome.storage.session.get('pendingClip')

  if (pendingClip) {
    clipData = {
      type: pendingClip.type,
      title: pendingClip.pageTitle || '',
      url: pendingClip.pageUrl || '',
      content: '',
      mediaUrl: pendingClip.imageUrl || '',
    }
    await chrome.storage.session.remove('pendingClip')
  } else {
    // Get info from current tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'getPageInfo' })
      clipData = {
        type: response.selectedText ? 'text' : 'link',
        title: response.title || '',
        url: response.url || '',
        content: response.selectedText || '',
        mediaUrl: response.url || '',
      }
    } catch {
      // Content script might not be injected (chrome:// pages, etc.)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      clipData = {
        type: 'link',
        title: tab?.title || '',
        url: tab?.url || '',
        content: '',
        mediaUrl: tab?.url || '',
      }
    }
  }

  // Populate form
  clipTitle.value = clipData.title
  clipUrl.textContent = clipData.url
  clipUrlGroup.style.display = clipData.url ? 'block' : 'none'

  // Show preview
  imagePreview.style.display = 'none'
  textPreview.style.display = 'none'

  if (clipData.type === 'image' && clipData.mediaUrl) {
    previewImg.src = clipData.mediaUrl
    imagePreview.style.display = 'block'
  } else if (clipData.content) {
    textPreview.textContent = clipData.content.length > 300
      ? clipData.content.slice(0, 300) + '...'
      : clipData.content
    textPreview.style.display = 'block'
  }
}

// --- Load Campaigns ---

async function loadCampaigns() {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name')
      .order('name')

    if (error) throw error

    // Clear existing options (keep "Global Inbox")
    clipCampaign.innerHTML = '<option value="">Global Inbox</option>'
    data.forEach(campaign => {
      const option = document.createElement('option')
      option.value = campaign.id
      option.textContent = campaign.name
      clipCampaign.appendChild(option)
    })
  } catch {
    // Silently fail — Global Inbox still works
  }
}

// --- Save Clip ---

async function saveClip() {
  errorState.style.display = 'none'
  saveBtn.disabled = true
  saveBtn.textContent = 'Saving...'

  // Validate blob/data URLs
  if (clipData.type === 'image' && clipData.mediaUrl) {
    const scheme = clipData.mediaUrl.split(':')[0]
    if (scheme === 'blob' || scheme === 'data') {
      if (!confirm('This image URL is temporary and may not work later. Clip anyway?')) {
        saveBtn.disabled = false
        saveBtn.textContent = 'Save Clip'
        return
      }
    }
  }

  try {
    const tags = clipTags.value
      ? clipTags.value.split(',').map(t => t.trim()).filter(Boolean)
      : []

    // media_url: image clips get the image URL, text clips get the source page URL,
    // link clips get null (the URL is stored as content context, not as media)
    let mediaUrl = null
    if (clipData.type === 'image') mediaUrl = clipData.mediaUrl || null
    else if (clipData.type === 'text') mediaUrl = clipData.url || null

    const { error } = await supabase.from('inspiration_items').insert({
      user_id: currentUser.id,
      campaign_id: clipCampaign.value || null,
      title: clipTitle.value || clipData.title || 'Untitled clip',
      content: clipData.content || null,
      type: clipData.type,
      tags,
      media_url: mediaUrl,
    })

    if (error) throw error

    showView('success-view')
    setTimeout(() => window.close(), 1500)
  } catch (err) {
    saveError.textContent = err.message || 'Failed to save clip'
    errorState.style.display = 'block'
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = 'Save Clip'
  }
}

saveBtn.addEventListener('click', saveClip)
retryBtn.addEventListener('click', saveClip)

// --- Start ---
init()
```

- [ ] **Step 2: Reload extension and test full flow**

1. Reload extension in `chrome://extensions/`
2. Click extension icon → should show login form
3. Log in with your Book of Tricks credentials
4. Should show clip form with current page's title and URL
5. Click "Save Clip"
6. Check the Inspiration Board in the app — clip should appear in Global Inbox

- [ ] **Step 3: Test text selection clipping**

1. Select some text on any web page
2. Click extension icon
3. Should show selected text in preview
4. Save → should appear as type "text" in Inspiration Board

- [ ] **Step 4: Test image context menu**

1. Right-click any image on a web page
2. Click "Clip Image to Book of Tricks"
3. If popup opens, should show image preview
4. If not, click extension icon manually — should show image preview from pending clip
5. Save → should appear as type "image" in Inspiration Board

- [ ] **Step 5: Test campaign picker**

1. Open popup → campaign dropdown should list your campaigns
2. Select a campaign, save a clip
3. Check that campaign's scratchpad in the app — clip should be there

- [ ] **Step 6: Test error handling**

1. Disconnect from internet, try to save → should show error with message
2. Reconnect and try again → should work

- [ ] **Step 7: Test session persistence**

1. Close and reopen Chrome
2. Click extension icon → should be still logged in (not showing login form)
3. Click "Sign out" → should show login form

- [ ] **Step 8: Commit**

```bash
git add extension/popup/popup.js
git commit -m "feat: add popup logic — clip, save, auth, campaign picker"
```

---

### Task 8: Final Polish + Push

- [ ] **Step 1: Add extension to .gitignore exclusion**

The `extension/` folder should NOT be gitignored. Verify it's tracked:

```bash
cd "/Users/athenoula/claude things/V2 book of tricks"
git status extension/
```

Should show new files, not "ignored".

- [ ] **Step 2: Full integration test**

Run through the complete flow:
1. Load extension → login → clip a page → check Global Inbox in app
2. Select text → clip → check it saved as "text" type with content
3. Right-click image → clip → check it saved as "image" type with media_url
4. Clip to a specific campaign → check that campaign's scratchpad
5. Sign out → sign back in → clip works
6. Close Chrome → reopen → still logged in

- [ ] **Step 3: Commit and push everything**

```bash
git add extension/
git commit -m "feat: complete Book of Tricks web clipper Chrome extension

Chrome Manifest V3 extension that clips web content directly
into the Inspiration Board. Supports page URLs, text selections,
and right-click image clipping. Authenticates with Supabase,
picks campaigns, adds tags.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push
```

- [ ] **Step 4: Update NEXT-STEPS.md**

Add the web clipper to the "Completed" section in `app/NEXT-STEPS.md`.
