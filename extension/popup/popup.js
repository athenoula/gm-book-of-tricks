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
const clipNotes = document.getElementById('clip-notes')
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
        mediaUrl: '',
      }
    } catch {
      // Content script might not be injected (chrome:// pages, etc.)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      clipData = {
        type: 'link',
        title: tab?.title || '',
        url: tab?.url || '',
        content: '',
        mediaUrl: '',
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

    // media_url: image clips get the image URL,
    // text and link clips get the source page URL
    let mediaUrl = clipData.url || null
    if (clipData.type === 'image') mediaUrl = clipData.mediaUrl || null

    // Build content: source URL (for image clips) + selected text + user notes
    const parts = []
    if (clipData.type === 'image' && clipData.url) parts.push(clipData.url)
    if (clipData.content) parts.push(clipData.content)
    if (clipNotes.value.trim()) parts.push(clipNotes.value.trim())
    const content = parts.join('\n\n') || null

    const { error } = await supabase.from('inspiration_items').insert({
      user_id: currentUser.id,
      campaign_id: clipCampaign.value || null,
      title: clipTitle.value || clipData.title || 'Untitled clip',
      content,
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
