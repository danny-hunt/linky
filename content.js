// Content script that runs on LinkedIn pages
let userName = '';
let buttonElement = null;
let popoverElement = null;

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

// Create button on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createExtensionButton);
} else {
  createExtensionButton();
}

// Re-create button when navigating (LinkedIn is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      createExtensionButton();
      closePopover();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

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
