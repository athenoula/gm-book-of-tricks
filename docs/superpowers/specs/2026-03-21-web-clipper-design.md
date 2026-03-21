# Web Clipper Chrome Extension — Design Spec

## Context

GMs find inspiration everywhere — Pinterest, Reddit, ArtStation, D&D wikis, random blog posts. Currently there's no way to capture that inspiration into the Book of Tricks without manually copy-pasting. A browser extension that clips content directly into the Inspiration Board closes this gap.

## Decisions

- **Destination**: Defaults to Global Inspiration Inbox, optional campaign picker dropdown
- **Clip types**: Page URL + title, selected text, right-click image clipping
- **Auth**: Supabase email/password login in the extension popup, session persisted in `chrome.storage.local`
- **UI**: Preview popup with editable title, content preview, campaign picker, tags, save button
- **Backend**: No changes needed — inserts directly into existing `inspiration_items` table via Supabase client

---

## 1. Extension Structure

Chrome Manifest V3 extension. Lives in a separate `extension/` folder at the project root (sibling to `app/`).

```
extension/
  manifest.json
  popup/
    popup.html
    popup.css
    popup.js
  background.js
  content.js
  lib/
    supabase.js
    auth.js
    supabase-client.js     ← bundled UMD build of @supabase/supabase-js
  icons/
    icon-16.png
    icon-48.png
    icon-128.png
```

### manifest.json

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

**Notes:**
- `host_permissions` grants network access to the Supabase URL (required for fetch calls from popup/background)
- `content_security_policy` enforces local-only scripts (no CDN imports)
- The Supabase anon key is public by design — RLS is the security boundary, not key secrecy
- The Supabase URL and anon key must match what's in `app/.env`

---

## 2. Content Script — `content.js`

Runs on every page. Lightweight — only responds to messages from the popup.

### Responsibilities

- Respond to `getPageInfo` message with: page title, page URL, selected text (if any)

### Message API

```js
// Popup sends:
{ type: 'getPageInfo' }

// Content script responds:
{
  title: document.title,
  url: window.location.href,
  selectedText: window.getSelection()?.toString() || '',
}
```

**Note:** The content script does NOT need to track right-clicked images. The background script gets the image URL directly from `info.srcUrl` in the context menu handler.

---

## 3. Background Script — `background.js`

Service worker that manages the context menu.

### Context Menu

On install, creates a context menu item:

```js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-image',
    title: 'Clip Image to Book of Tricks',
    contexts: ['image'],
  })
})
```

When clicked, stores the image info for the popup to read:

```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-image') {
    chrome.storage.session.set({
      pendingClip: {
        type: 'image',
        imageUrl: info.srcUrl,
        pageTitle: tab.title,
        pageUrl: tab.url,
      }
    })
    // Attempt to open popup (Chrome 127+, may not work in all contexts)
    chrome.action.openPopup?.()
  }
})
```

**Fallback:** If `openPopup()` is unavailable or fails, the user clicks the extension icon manually. The pending clip data persists in `chrome.storage.session` until the popup opens and reads it.

---

## 4. Popup — `popup.html` + `popup.js` + `popup.css`

### States

1. **Logged out**: Login form (email + password + "Sign in" button)
2. **Logged in, loading**: Fetching page info and campaigns
3. **Logged in, ready**: Clip form with preview, campaign picker, tags, save button
4. **Saving**: Loading state on save button (disabled)
5. **Saved**: Success checkmark, auto-close after 1.5s, clears `pendingClip`
6. **Error**: Error message with retry button (network failure, RLS rejection, etc.)

### Popup Flow (logged in)

1. On open: restore session from `chrome.storage.local`, verify with `getUser()`
2. If session invalid/expired → clear stored session, show login form
3. Check `chrome.storage.session` for `pendingClip` data
4. If pending clip exists, use that data. Otherwise, send `getPageInfo` message to content script
5. Fetch campaign list: `supabase.from('campaigns').select('id, name').order('name')`
6. Display preview: title (editable input), URL (read-only), selected text or image preview
7. Campaign dropdown (first option: "Global Inbox", then user's campaigns)
8. Tags input (comma-separated)
9. Save button inserts into `inspiration_items`
10. On success: show checkmark, clear `pendingClip` from session storage, close popup after 1.5s
11. On error: show error message with retry button

### Clip Type Detection

- If `pendingClip.type === 'image'` → type is `'image'`, `media_url` is the image URL
- Else if selected text is present → type is `'text'`, content is the selected text
- Else → type is `'link'`, `media_url` is the page URL

### Image URL Validation

Before saving an image clip, validate the URL scheme:
- `http://` or `https://` → OK
- `blob:` or `data:` → show warning: "This image URL is temporary and may not work later. Clip anyway?"

### Data Insertion

```js
const { error } = await supabase.from('inspiration_items').insert({
  user_id: user.id,
  campaign_id: selectedCampaignId || null,
  title: editedTitle,
  content: selectedText || null,
  type: clipType,
  tags: tagsArray,
  media_url: mediaUrl || null,
})
```

The `sort_order` column is omitted — the table has a default value. (Confirmed: the app's `useCreateInspiration` also omits it.)

---

## 5. Auth — `lib/auth.js`

Session management is handled manually — NOT via the Supabase client's built-in storage adapter (which requires synchronous `getItem`/`setItem`, incompatible with Chrome's async `chrome.storage` API).

### Login

```js
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})
if (data.session) {
  await chrome.storage.local.set({ supabaseSession: data.session })
}
```

### Session Restore (on every popup open)

```js
async function restoreSession() {
  const { supabaseSession } = await chrome.storage.local.get('supabaseSession')
  if (!supabaseSession) return null

  const { data, error } = await supabase.auth.setSession(supabaseSession)
  if (error || !data.session) {
    // Session expired or invalid — clear and show login
    await chrome.storage.local.remove('supabaseSession')
    return null
  }

  // Verify user still exists
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    await chrome.storage.local.remove('supabaseSession')
    return null
  }

  return user
}
```

### Session Persistence (listen for refreshes)

```js
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    chrome.storage.local.set({ supabaseSession: session })
  } else {
    chrome.storage.local.remove('supabaseSession')
  }
})
```

This listener is scoped to the popup's lifetime — it's registered on each popup open, which is correct.

### Logout

```js
await supabase.auth.signOut()
await chrome.storage.local.remove('supabaseSession')
```

---

## 6. Supabase Client — `lib/supabase.js`

```js
const supabaseUrl = 'https://bytlbwwkglhfidrohneu.supabase.co'
const supabaseAnonKey = 'YOUR_ANON_KEY_HERE'

// Note: the anon key is public by design. RLS enforces all access control.
// This value must match VITE_SUPABASE_ANON_KEY in app/.env

const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,   // Popup handles session restore manually
    persistSession: false,     // We manage persistence via chrome.storage.local
  },
})
```

**Key decisions:**
- `autoRefreshToken: false` — the popup is short-lived; session refresh happens via `setSession()` on each popup open. Auto-refresh would fail in the service worker context (no localStorage).
- `persistSession: false` — we manage persistence manually via `chrome.storage.local` in `auth.js`. The Supabase client's built-in storage requires synchronous `getItem`/`setItem` which is incompatible with Chrome's async storage API.
- No custom storage adapter — the `auth.js` module owns all session persistence.

### Loading Supabase JS

The Supabase JS client is bundled locally as `lib/supabase-client.js` (UMD build downloaded from npm). This avoids CSP issues with Manifest V3 (no CDN loads allowed) and works offline.

To obtain the file: `npm pack @supabase/supabase-js` and extract the UMD bundle, or download from `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`.

---

## 7. Popup Styling — `popup.css`

Warm Craft aesthetic matching the app:

- Background: `#1c1917` (charcoal)
- Text: `#d6d3d1` (body), `#fef3c7` (headings)
- Primary: `#f59e0b` (amber) for buttons and accents
- Fonts: `Georgia, serif` for headings, `system-ui, sans-serif` for body (no Google Fonts in extension — keeps bundle small)
- Popup width: 360px
- Compact spacing — optimised for the small popup window
- Success state: green checkmark with fade
- Error state: red text with retry button

---

## 8. Extension Icons

Generate from the app's existing favicon/icon SVG. Need three sizes:
- 16x16 (toolbar, small)
- 48x48 (extension management page)
- 128x128 (Chrome Web Store, install dialog)

Export as PNG from the SVG at each size.

---

## 9. Build & Distribution

### No build step required

The extension uses vanilla JS (no React, no bundler). The Supabase client is bundled locally as a UMD file. This keeps the extension simple and avoids Webpack/Vite complexity.

### Configuration

The Supabase URL and anon key are hardcoded in `lib/supabase.js`. These must be manually kept in sync with `app/.env`. The anon key is safe to expose — it's designed to be public and RLS enforces access.

### Installation

Development: `chrome://extensions/` → enable "Developer mode" → "Load unpacked" → select `extension/` folder.

Distribution: Package as `.crx` or publish to Chrome Web Store (requires $5 one-time developer fee).

---

## 10. What's NOT in Scope

- Firefox/Safari extension — Chrome only for now
- Offline clipping queue (requires network to save)
- Image re-upload to Supabase Storage (clips the URL only — if the original image is deleted/moved, the clip breaks. `blob:` and `data:` URLs will not persist.)
- Full-page screenshots
- Bulk clipping
- Automatic tag suggestions
- Extension settings page

---

## Files Summary

### New Files (all in `extension/` directory)

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome Manifest V3 config with host_permissions and CSP |
| `popup/popup.html` | Popup UI structure |
| `popup/popup.css` | Warm Craft styling for popup |
| `popup/popup.js` | Popup logic: clip preview, campaign picker, save, error handling |
| `background.js` | Service worker: context menu, pending clip storage |
| `content.js` | Content script: page info and selection |
| `lib/supabase.js` | Supabase client init (no custom storage adapter) |
| `lib/auth.js` | Login, logout, manual session management via chrome.storage |
| `lib/supabase-client.js` | Bundled UMD build of @supabase/supabase-js |
| `icons/icon-16.png` | Toolbar icon |
| `icons/icon-48.png` | Management page icon |
| `icons/icon-128.png` | Store/install icon |

### No Changes to Existing App

The extension works entirely through the existing Supabase API and `inspiration_items` table. No new endpoints, tables, or app code changes needed.

---

## Verification

1. Load extension in Chrome via "Load unpacked"
2. Click extension icon → login form appears
3. Log in with Book of Tricks credentials → popup shows clip form
4. Navigate to any web page, click extension → shows page title and URL
5. Select text on a page, click extension → shows selected text as content
6. Right-click an image → "Clip Image to Book of Tricks" appears in context menu
7. Click context menu item → popup opens (or pending clip stored for next open)
8. Save a clip → appears in the Inspiration Board (Global Inbox) in the app
9. Save a clip to a specific campaign → appears in that campaign's scratchpad
10. Close and reopen browser → extension still logged in (session persisted)
11. Log out → popup shows login form again
12. Test with expired session → shows login form (not an error)
13. Test save failure (disconnect network) → shows error with retry button
14. Test clipping a `blob:` URL image → shows warning before save
