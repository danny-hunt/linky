/**
 * Popup script for settings/preferences UI
 * 
 * IMPORTANT: This file should implement user preferences UI as specified in PRD.md
 * See PRD.md for user preference requirements (tone, style, length, formality, etc.)
 * 
 * Current implementation is placeholder - refer to PRD.md for target functionality.
 */

// Load saved name when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const userNameInput = document.getElementById('userName');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Load saved name from storage
  const result = await chrome.storage.sync.get(['userName']);
  if (result.userName) {
    userNameInput.value = result.userName;
  }

  // Save button click handler
  saveBtn.addEventListener('click', async () => {
    const userName = userNameInput.value.trim();
    
    if (userName) {
      try {
        await chrome.storage.sync.set({ userName: userName });
        showStatus('Settings saved successfully!', 'success');
        
        // Notify content script to update
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('linkedin.com')) {
          chrome.tabs.sendMessage(tab.id, { action: 'updateName', userName: userName });
        }
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
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  
  setTimeout(() => {
    status.className = 'status';
    status.textContent = '';
  }, 3000);
}
