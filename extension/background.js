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
