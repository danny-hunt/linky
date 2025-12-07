// Content script that runs on LinkedIn pages
let userName = '';

// Load saved name from storage
chrome.storage.sync.get(['userName'], (result) => {
  if (result.userName) {
    userName = result.userName;
    displayHelloWorld();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateName') {
    userName = request.userName;
    displayHelloWorld();
  }
});

function displayHelloWorld() {
  // Remove existing hello world element if it exists
  const existingElement = document.getElementById('linkedin-extension-hello');
  if (existingElement) {
    existingElement.remove();
  }

  // Create hello world element
  const helloElement = document.createElement('div');
  helloElement.id = 'linkedin-extension-hello';
  helloElement.className = 'linkedin-extension-hello';
  
  const greeting = userName ? `Hello, ${userName}! 👋` : 'Hello, World! 👋';
  helloElement.textContent = greeting;
  
  // Insert at the top of the page
  const body = document.body;
  if (body) {
    body.insertBefore(helloElement, body.firstChild);
  }
}

// Display hello world on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', displayHelloWorld);
} else {
  displayHelloWorld();
}

// Re-display when navigating (LinkedIn is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(displayHelloWorld, 1000);
  }
}).observe(document, { subtree: true, childList: true });
