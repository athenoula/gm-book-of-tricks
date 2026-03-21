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
