// Background service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn Extension installed');
});

// Optional: Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // The popup will handle the UI, but we can add additional logic here if needed
});
