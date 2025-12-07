/**
 * Content script that runs on LinkedIn pages
 * 
 * IMPORTANT: This file should implement functionality as specified in PRD.md
 * See PRD.md for all design decisions, requirements, and technical constraints.
 * 
 * Current implementation is placeholder - refer to PRD.md for target functionality.
 */
let userName = '';
let buttonElement = null;
let popoverElement = null;

// Chat detection and auto-insert
const PLACEHOLDER_MESSAGE = 'Hello! This is a placeholder message that will be replaced with dynamic drafts later.';
const processedInputs = new WeakSet(); // Track processed inputs to avoid duplicates

// Load saved name from storage
chrome.storage.sync.get(['userName'], (result) => {
  if (result.userName) {
    userName = result.userName;
  }
  createExtensionButton();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateName') {
    userName = request.userName;
    updateButtonText();
  }
});

function createExtensionButton() {
  // Remove existing button if it exists
  const existingButton = document.getElementById('linkedin-extension-button');
  if (existingButton) {
    existingButton.remove();
  }

  // Create button element
  buttonElement = document.createElement('button');
  buttonElement.id = 'linkedin-extension-button';
  buttonElement.className = 'linkedin-extension-button';
  buttonElement.innerHTML = '⚙️';
  buttonElement.setAttribute('aria-label', 'Extension Settings');
  
  // Add click handler to toggle popover
  buttonElement.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover();
  });

  // Insert button into the page
  const body = document.body;
  if (body) {
    body.appendChild(buttonElement);
  }

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (popoverElement && !popoverElement.contains(e.target) && !buttonElement.contains(e.target)) {
      closePopover();
    }
  });
}

function togglePopover() {
  if (popoverElement && popoverElement.style.display !== 'none') {
    closePopover();
  } else {
    openPopover();
  }
}

function openPopover() {
  // Remove existing popover if it exists
  const existingPopover = document.getElementById('linkedin-extension-popover');
  if (existingPopover) {
    existingPopover.remove();
  }

  // Create popover element
  popoverElement = document.createElement('div');
  popoverElement.id = 'linkedin-extension-popover';
  popoverElement.className = 'linkedin-extension-popover';
  
  // Create popover content (preferences menu)
  popoverElement.innerHTML = `
    <div class="popover-header">
      <h2>LinkedIn Extension</h2>
      <button class="popover-close" aria-label="Close">×</button>
    </div>
    <div class="popover-content">
      <div class="settings-section">
        <label for="popover-userName">Your Name:</label>
        <input type="text" id="popover-userName" placeholder="Enter your name" value="${userName || ''}">
        <button id="popover-saveBtn">Save</button>
      </div>
      <div id="popover-status" class="status"></div>
    </div>
  `;

  // Insert popover into the page
  const body = document.body;
  if (body) {
    body.appendChild(popoverElement);
  }

  // Position popover near the button
  positionPopover();

  // Add event listeners
  const closeBtn = popoverElement.querySelector('.popover-close');
  const saveBtn = popoverElement.querySelector('#popover-saveBtn');
  const userNameInput = popoverElement.querySelector('#popover-userName');

  closeBtn.addEventListener('click', closePopover);
  
  saveBtn.addEventListener('click', async () => {
    const newUserName = userNameInput.value.trim();
    
    if (newUserName) {
      try {
        await chrome.storage.sync.set({ userName: newUserName });
        userName = newUserName;
        showStatus('Settings saved successfully!', 'success');
        updateButtonText();
      } catch (error) {
        showStatus('Error saving settings', 'error');
        console.error('Error saving settings:', error);
      }
    } else {
      showStatus('Please enter a name', 'error');
    }
  });

  // Enter key handler
  userNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  // Focus the input
  setTimeout(() => userNameInput.focus(), 100);
}

function closePopover() {
  if (popoverElement) {
    popoverElement.style.display = 'none';
    setTimeout(() => {
      if (popoverElement && popoverElement.parentNode) {
        popoverElement.remove();
      }
      popoverElement = null;
    }, 200);
  }
}

function positionPopover() {
  if (!buttonElement || !popoverElement) return;

  const buttonRect = buttonElement.getBoundingClientRect();
  const popoverRect = popoverElement.getBoundingClientRect();
  
  // Position popover below and to the right of the button
  const top = buttonRect.bottom + 8;
  const left = buttonRect.left;
  
  popoverElement.style.top = `${top + window.scrollY}px`;
  popoverElement.style.left = `${left + window.scrollX}px`;
  
  // Adjust if popover goes off screen
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (left + popoverRect.width > viewportWidth) {
    popoverElement.style.left = `${viewportWidth - popoverRect.width - 10 + window.scrollX}px`;
  }
  
  if (top + popoverRect.height > viewportHeight + window.scrollY) {
    popoverElement.style.top = `${buttonRect.top - popoverRect.height - 8 + window.scrollY}px`;
  }
}

function updateButtonText() {
  // Button text stays as icon, but we could update tooltip if needed
  if (buttonElement) {
    buttonElement.setAttribute('title', userName ? `Settings (${userName})` : 'Settings');
  }
}

function showStatus(message, type) {
  const status = popoverElement?.querySelector('#popover-status');
  if (!status) return;
  
  status.textContent = message;
  status.className = `status ${type}`;
  
  setTimeout(() => {
    status.className = 'status';
    status.textContent = '';
  }, 3000);
}

/**
 * Detects LinkedIn chat message input fields
 * LinkedIn uses contenteditable divs for message inputs
 */
function findChatInputFields() {
  const inputs = [];
  
  // Look for contenteditable divs that are likely message inputs
  // Common LinkedIn selectors for message input fields
  const selectors = [
    'div[contenteditable="true"][role="textbox"]',
    'div.msg-form__contenteditable[contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder*="message" i]',
    'div[contenteditable="true"][aria-label*="message" i]',
  ];
  
  // Try specific selectors first
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      // Check if it's in a messaging context (not other contenteditable areas)
      const isInMessagingArea = el.closest('[class*="msg-form"], [class*="messaging"], [class*="conversation"]') ||
                                 el.closest('div[role="textbox"]')?.parentElement?.querySelector('button[aria-label*="Send" i]');
      
      if (isInMessagingArea && !processedInputs.has(el)) {
        inputs.push(el);
      }
    });
  }
  
  // Fallback: find any contenteditable in messaging containers
  if (inputs.length === 0) {
    const messagingContainers = document.querySelectorAll('[class*="msg-form"], [class*="messaging"], [class*="conversation"]');
    messagingContainers.forEach(container => {
      const contentEditables = container.querySelectorAll('div[contenteditable="true"]');
      contentEditables.forEach(el => {
        // Check if it's likely a message input (not a message display)
        const hasSendButton = container.querySelector('button[aria-label*="Send" i], button[aria-label*="send" i]');
        const isEmpty = !el.textContent || el.textContent.trim() === '';
        
        if (hasSendButton && isEmpty && !processedInputs.has(el)) {
          inputs.push(el);
        }
      });
    });
  }
  
  return inputs;
}

/**
 * Inserts placeholder message into a chat input field
 */
function insertPlaceholderMessage(inputElement) {
  if (!inputElement || processedInputs.has(inputElement)) {
    return false;
  }
  
  // Check if input is already filled
  const currentText = inputElement.textContent || inputElement.innerText || '';
  if (currentText.trim() !== '') {
    return false;
  }
  
  try {
    // For contenteditable divs, we need to set innerHTML or textContent
    // and trigger input events
    inputElement.textContent = PLACEHOLDER_MESSAGE;
    inputElement.innerText = PLACEHOLDER_MESSAGE;
    
    // Trigger input event so LinkedIn's UI recognizes the change
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    inputElement.dispatchEvent(inputEvent);
    
    // Also trigger other events that might be needed
    const keyupEvent = new Event('keyup', { bubbles: true, cancelable: true });
    inputElement.dispatchEvent(keyupEvent);
    
    // Mark as processed
    processedInputs.add(inputElement);
    
    console.log('Auto-inserted placeholder message into chat input');
    return true;
  } catch (error) {
    console.error('Error inserting placeholder message:', error);
    return false;
  }
}

/**
 * Scans for chat interfaces and auto-inserts placeholder messages
 */
function detectAndInsertChatMessages() {
  const chatInputs = findChatInputFields();
  
  chatInputs.forEach(input => {
    insertPlaceholderMessage(input);
  });
}

// Initialize chat detection
detectAndInsertChatMessages();

// Create button on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    createExtensionButton();
    detectAndInsertChatMessages();
  });
} else {
  createExtensionButton();
  detectAndInsertChatMessages();
}

// Re-create button when navigating (LinkedIn is a SPA)
let lastUrl = location.href;
let chatCheckTimeout = null;
const domObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      createExtensionButton();
      closePopover();
      // Reset processed inputs on navigation to allow re-detection
      // Note: WeakSet will automatically clear when elements are removed from DOM
    }, 1000);
  }
  
  // Also check for new chat interfaces when DOM changes
  // Use debouncing to avoid excessive checks
  if (chatCheckTimeout) {
    clearTimeout(chatCheckTimeout);
  }
  chatCheckTimeout = setTimeout(() => {
    detectAndInsertChatMessages();
  }, 500);
});
domObserver.observe(document, { subtree: true, childList: true });

// Reposition popover on scroll/resize
window.addEventListener('scroll', () => {
  if (popoverElement && popoverElement.style.display !== 'none') {
    positionPopover();
  }
});

window.addEventListener('resize', () => {
  if (popoverElement && popoverElement.style.display !== 'none') {
    positionPopover();
  }
});
