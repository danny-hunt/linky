/**
 * Popup script for settings/preferences UI
 * 
 * Implements user preferences UI as specified in PRD.md
 * See PRD.md Section "User Preferences" for requirements:
 * - Message tone (professional, casual, friendly, formal)
 * - Message length (brief, medium, detailed)
 * - Greeting/closing style
 * - Formality level
 * - Auto-insert behavior (on/off, with preview option)
 */

// Default interaction categories as per PRD.md
const DEFAULT_CATEGORIES = [
  'Recruiter inbound',
  'Colleague/friend',
  'Inbound advice request',
  'Inbound meeting request'
];

// Default preferences for each category
const DEFAULT_PREFERENCES = {
  tone: 'professional',
  length: 'medium',
  greetingStyle: 'standard',
  closingStyle: 'standard',
  formalityLevel: 'moderate',
  autoInsert: true,
  previewBeforeInsert: false
};

// Initialize when DOM is ready
async function init() {
  console.log('Initializing popup, readyState:', document.readyState);
  try {
    await initializeUI();
    setupEventListeners();
    setupTabNavigation();
    loadMessageHistory();
  } catch (error) {
    console.error('Error in initialization:', error);
    showStatus('Error initializing: ' + error.message, 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already ready (common for popup windows)
  init();
}

/**
 * Initialize the UI with saved preferences
 */
async function initializeUI() {
  try {
    // Load saved preferences
    let result;
    try {
      result = await chrome.storage.sync.get([
        'userName',
        'categories',
        'categoryPreferences'
      ]);
    } catch (storageError) {
      console.error('Error accessing storage:', storageError);
      // Use defaults if storage fails
      result = {
        userName: '',
        categories: DEFAULT_CATEGORIES,
        categoryPreferences: {}
      };
    }

    console.log('Loaded preferences:', result);

    // Set user name
    const userNameInput = document.getElementById('userName');
    if (!userNameInput) {
      console.error('userName input element not found');
      return;
    }
    if (result.userName) {
      userNameInput.value = result.userName;
    }

    // Initialize categories (merge defaults with saved custom categories)
    let categories = result.categories || DEFAULT_CATEGORIES;
    
    // Ensure categories is an array and not empty
    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn('Categories is not a valid array, using defaults');
      categories = DEFAULT_CATEGORIES;
      // Save defaults to storage
      await chrome.storage.sync.set({ categories: DEFAULT_CATEGORIES });
    }
    
    const preferences = result.categoryPreferences || {};

    console.log('Categories to render:', categories);
    console.log('Number of categories:', categories.length);
    console.log('Preferences:', preferences);

    // Render category preferences
    renderCategoryPreferences(categories, preferences);

    // Setup add category handler
    setupAddCategoryHandler(categories);
  } catch (error) {
    console.error('Error initializing UI:', error);
    showStatus('Error loading preferences: ' + error.message, 'error');
  }
}

/**
 * Render all category preference cards
 */
function renderCategoryPreferences(categories, savedPreferences) {
  try {
    const container = document.getElementById('categoryPreferences');
    if (!container) {
      console.error('categoryPreferences container not found');
      return;
    }
    
    console.log('Rendering categories:', categories);
    container.innerHTML = '';

    if (!categories || categories.length === 0) {
      console.warn('No categories to render');
      return;
    }

    categories.forEach(category => {
      try {
        const categoryKey = category.toLowerCase().replace(/\s+/g, '_');
        const prefs = savedPreferences[categoryKey] || { ...DEFAULT_PREFERENCES };
        
        const card = createCategoryCard(category, categoryKey, prefs);
        container.appendChild(card);
      } catch (error) {
        console.error(`Error creating card for category ${category}:`, error);
      }
    });
    
    // Verify cards were created
    const createdCards = container.querySelectorAll('.category-card');
    console.log(`Created ${createdCards.length} category cards`);
    
    if (createdCards.length === 0 && categories.length > 0) {
      console.error('No cards were created despite having categories');
      const errorMsg = document.createElement('div');
      errorMsg.className = 'status error';
      errorMsg.textContent = 'Error: Could not render category preferences. Check console for details.';
      container.appendChild(errorMsg);
    }
  } catch (error) {
    console.error('Error rendering category preferences:', error);
    showStatus('Error rendering preferences: ' + error.message, 'error');
  }
}

/**
 * Create a preference card for a category
 */
function createCategoryCard(categoryName, categoryKey, preferences) {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.dataset.categoryKey = categoryKey;

  // Header with category name and delete button (if custom)
  const header = document.createElement('div');
  header.className = 'category-header';
  
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = categoryName;
  
  const controls = document.createElement('div');
  controls.className = 'category-controls';
  
  // Only show delete button for custom categories
  if (!DEFAULT_CATEGORIES.includes(categoryName)) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteCategory(categoryName, categoryKey);
    controls.appendChild(deleteBtn);
  }
  
  header.appendChild(title);
  header.appendChild(controls);

  // Preferences grid
  const prefsGrid = document.createElement('div');
  prefsGrid.className = 'category-preferences';

  // Message Tone
  const toneItem = createSelectPreference(
    'Message Tone',
    `${categoryKey}_tone`,
    ['professional', 'casual', 'friendly', 'formal'],
    preferences.tone || DEFAULT_PREFERENCES.tone
  );
  prefsGrid.appendChild(toneItem);

  // Message Length
  const lengthItem = createSelectPreference(
    'Message Length',
    `${categoryKey}_length`,
    ['brief', 'medium', 'detailed'],
    preferences.length || DEFAULT_PREFERENCES.length
  );
  prefsGrid.appendChild(lengthItem);

  // Greeting Style
  const greetingItem = createSelectPreference(
    'Greeting Style',
    `${categoryKey}_greeting`,
    ['standard', 'formal', 'casual', 'warm', 'none'],
    preferences.greetingStyle || DEFAULT_PREFERENCES.greetingStyle
  );
  prefsGrid.appendChild(greetingItem);

  // Closing Style
  const closingItem = createSelectPreference(
    'Closing Style',
    `${categoryKey}_closing`,
    ['standard', 'formal', 'casual', 'warm', 'none'],
    preferences.closingStyle || DEFAULT_PREFERENCES.closingStyle
  );
  prefsGrid.appendChild(closingItem);

  // Formality Level
  const formalityItem = createSelectPreference(
    'Formality Level',
    `${categoryKey}_formality`,
    ['very formal', 'formal', 'moderate', 'casual', 'very casual'],
    preferences.formalityLevel || DEFAULT_PREFERENCES.formalityLevel
  );
  prefsGrid.appendChild(formalityItem);

  // Auto-insert behavior (full width)
  const autoInsertItem = document.createElement('div');
  autoInsertItem.className = 'preference-item full-width';
  
  const autoInsertLabel = document.createElement('label');
  autoInsertLabel.textContent = 'Auto-insert Behavior:';
  
  const autoInsertGroup = document.createElement('div');
  autoInsertGroup.className = 'checkbox-group';
  
  const autoInsertCheckbox = document.createElement('input');
  autoInsertCheckbox.type = 'checkbox';
  autoInsertCheckbox.id = `${categoryKey}_autoInsert`;
  autoInsertCheckbox.checked = preferences.autoInsert !== false;
  
  const autoInsertLabel2 = document.createElement('label');
  autoInsertLabel2.htmlFor = `${categoryKey}_autoInsert`;
  autoInsertLabel2.textContent = 'Auto-insert draft messages';
  
  autoInsertGroup.appendChild(autoInsertCheckbox);
  autoInsertGroup.appendChild(autoInsertLabel2);
  
  // Preview option (only shown if auto-insert is enabled)
  const previewGroup = document.createElement('div');
  previewGroup.className = 'checkbox-group';
  previewGroup.style.marginLeft = '24px';
  
  const previewCheckbox = document.createElement('input');
  previewCheckbox.type = 'checkbox';
  previewCheckbox.id = `${categoryKey}_preview`;
  previewCheckbox.checked = preferences.previewBeforeInsert === true;
  previewCheckbox.disabled = !autoInsertCheckbox.checked;
  
  const previewLabel = document.createElement('label');
  previewLabel.htmlFor = `${categoryKey}_preview`;
  previewLabel.textContent = 'Show preview before inserting';
  
  previewGroup.appendChild(previewCheckbox);
  previewGroup.appendChild(previewLabel);
  
  // Update preview checkbox state when auto-insert changes
  autoInsertCheckbox.addEventListener('change', () => {
    previewCheckbox.disabled = !autoInsertCheckbox.checked;
    if (!autoInsertCheckbox.checked) {
      previewCheckbox.checked = false;
    }
  });
  
  autoInsertItem.appendChild(autoInsertLabel);
  autoInsertItem.appendChild(autoInsertGroup);
  autoInsertItem.appendChild(previewGroup);
  prefsGrid.appendChild(autoInsertItem);

  // Custom Instructions (full width)
  const instructionsItem = document.createElement('div');
  instructionsItem.className = 'preference-item full-width';
  
  const instructionsLabel = document.createElement('label');
  instructionsLabel.textContent = 'Custom Instructions:';
  instructionsLabel.htmlFor = `${categoryKey}_instructions`;
  
  const instructionsTextarea = document.createElement('textarea');
  instructionsTextarea.id = `${categoryKey}_instructions`;
  instructionsTextarea.rows = 3;
  instructionsTextarea.placeholder = 'Provide specific instructions for this category (e.g., "Always mention interest in remote work", "Ask about company culture")';
  instructionsTextarea.value = preferences.customInstructions || '';
  
  instructionsItem.appendChild(instructionsLabel);
  instructionsItem.appendChild(instructionsTextarea);
  prefsGrid.appendChild(instructionsItem);

  card.appendChild(header);
  card.appendChild(prefsGrid);

  return card;
}

/**
 * Create a select dropdown preference item
 */
function createSelectPreference(labelText, id, options, selectedValue) {
  const item = document.createElement('div');
  item.className = 'preference-item';

  const label = document.createElement('label');
  label.textContent = labelText;
  label.htmlFor = id;

  const select = document.createElement('select');
  select.id = id;
  
  options.forEach(option => {
    const optionEl = document.createElement('option');
    optionEl.value = option;
    optionEl.textContent = option.charAt(0).toUpperCase() + option.slice(1);
    if (option === selectedValue) {
      optionEl.selected = true;
    }
    select.appendChild(optionEl);
  });

  item.appendChild(label);
  item.appendChild(select);

  return item;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.addEventListener('click', saveAllPreferences);

  const userNameInput = document.getElementById('userName');
  userNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
}

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active tab content
      tabContents.forEach(content => content.classList.remove('active'));
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // Reload history if switching to history tab
      if (targetTab === 'history') {
        loadMessageHistory();
      }
    });
  });
}

/**
 * Load and display message history
 */
async function loadMessageHistory() {
  const container = document.getElementById('messageHistoryContainer');
  if (!container) return;
  
  try {
    container.innerHTML = '<div class="loading-message">Loading message history...</div>';
    
    const result = await chrome.storage.local.get(['messageHistory']);
    const history = result.messageHistory || [];
    
    if (history.length === 0) {
      container.innerHTML = '<div class="empty-message">No message history yet. Generated messages will appear here.</div>';
      return;
    }
    
    container.innerHTML = '';
    
    history.forEach(entry => {
      const historyCard = createHistoryCard(entry);
      container.appendChild(historyCard);
    });
  } catch (error) {
    console.error('Error loading message history:', error);
    container.innerHTML = '<div class="error-message">Error loading message history: ' + error.message + '</div>';
  }
}

/**
 * Create a history card for a message entry
 */
function createHistoryCard(entry) {
  const card = document.createElement('div');
  card.className = 'history-card';
  
  // Format timestamp
  const date = new Date(entry.timestamp);
  const formattedDate = date.toLocaleString();
  
  // Create card header
  const header = document.createElement('div');
  header.className = 'history-card-header';
  
  const dateSpan = document.createElement('span');
  dateSpan.className = 'history-date';
  dateSpan.textContent = formattedDate;
  
  const categorySpan = document.createElement('span');
  categorySpan.className = 'history-category';
  categorySpan.textContent = entry.context?.category || 'Unknown';
  
  header.appendChild(dateSpan);
  header.appendChild(categorySpan);
  
  // Create message section
  const messageSection = document.createElement('div');
  messageSection.className = 'history-message-section';
  
  const messageLabel = document.createElement('div');
  messageLabel.className = 'history-label';
  messageLabel.textContent = 'Generated Message:';
  
  const messageText = document.createElement('div');
  messageText.className = 'history-message';
  messageText.textContent = entry.message;
  
  messageSection.appendChild(messageLabel);
  messageSection.appendChild(messageText);
  
  // Create context section (collapsible)
  const contextSection = document.createElement('div');
  contextSection.className = 'history-context-section';
  
  const contextToggle = document.createElement('button');
  contextToggle.className = 'history-context-toggle';
  contextToggle.textContent = 'Show Context';
  contextToggle.addEventListener('click', () => {
    const isExpanded = contextDetails.style.display !== 'none';
    contextDetails.style.display = isExpanded ? 'none' : 'block';
    contextToggle.textContent = isExpanded ? 'Show Context' : 'Hide Context';
  });
  
  const contextDetails = document.createElement('div');
  contextDetails.className = 'history-context-details';
  contextDetails.style.display = 'none';
  
  // Build context details
  const context = entry.context || {};
  
  if (context.recipientInfo) {
    const recipientDiv = document.createElement('div');
    recipientDiv.className = 'context-item';
    recipientDiv.innerHTML = `<strong>Recipient:</strong> ${context.recipientInfo.name || 'Unknown'}${context.recipientInfo.byline ? ` - ${context.recipientInfo.byline}` : ''}`;
    contextDetails.appendChild(recipientDiv);
  }
  
  if (context.category) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'context-item';
    categoryDiv.innerHTML = `<strong>Category:</strong> ${context.category}`;
    contextDetails.appendChild(categoryDiv);
  }
  
  if (context.chatHistorySummary) {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'context-item';
    summaryDiv.innerHTML = `<strong>Conversation Summary:</strong> ${context.chatHistorySummary}`;
    contextDetails.appendChild(summaryDiv);
  }
  
  if (context.isNewConversation !== null) {
    const newConvDiv = document.createElement('div');
    newConvDiv.className = 'context-item';
    newConvDiv.innerHTML = `<strong>New Conversation:</strong> ${context.isNewConversation ? 'Yes' : 'No'}`;
    contextDetails.appendChild(newConvDiv);
  }
  
  if (context.keyTopics && context.keyTopics.length > 0) {
    const topicsDiv = document.createElement('div');
    topicsDiv.className = 'context-item';
    topicsDiv.innerHTML = `<strong>Key Topics:</strong> ${context.keyTopics.join(', ')}`;
    contextDetails.appendChild(topicsDiv);
  }
  
  if (context.userPreferences) {
    const prefsDiv = document.createElement('div');
    prefsDiv.className = 'context-item';
    const prefs = context.userPreferences;
    prefsDiv.innerHTML = `<strong>Preferences:</strong> Tone: ${prefs.tone || 'N/A'}, Length: ${prefs.length || 'N/A'}, Formality: ${prefs.formalityLevel || 'N/A'}`;
    contextDetails.appendChild(prefsDiv);
  }
  
  if (context.hasResearchResults) {
    const researchDiv = document.createElement('div');
    researchDiv.className = 'context-item';
    researchDiv.innerHTML = `<strong>Research:</strong> Additional research was performed`;
    contextDetails.appendChild(researchDiv);
  }
  
  contextSection.appendChild(contextToggle);
  contextSection.appendChild(contextDetails);
  
  // Assemble card
  card.appendChild(header);
  card.appendChild(messageSection);
  card.appendChild(contextSection);
  
  return card;
}

/**
 * Setup add category handler
 */
function setupAddCategoryHandler(existingCategories) {
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const newCategoryInput = document.getElementById('newCategoryName');

  addCategoryBtn.addEventListener('click', async () => {
    const categoryName = newCategoryInput.value.trim();
    
    if (!categoryName) {
      showStatus('Please enter a category name', 'error');
      return;
    }

    if (existingCategories.includes(categoryName)) {
      showStatus('Category already exists', 'error');
      return;
    }

    // Add to categories list
    existingCategories.push(categoryName);
    
    // Save categories
    await chrome.storage.sync.set({ categories: existingCategories });
    
    // Reload UI
    const result = await chrome.storage.sync.get(['categoryPreferences']);
    const preferences = result.categoryPreferences || {};
    renderCategoryPreferences(existingCategories, preferences);
    setupAddCategoryHandler(existingCategories);
    
    // Clear input
    newCategoryInput.value = '';
    showStatus('Category added successfully', 'success');
  });

  newCategoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCategoryBtn.click();
    }
  });
}

/**
 * Delete a custom category
 */
async function deleteCategory(categoryName, categoryKey) {
  if (!confirm(`Are you sure you want to delete the "${categoryName}" category?`)) {
    return;
  }

  const result = await chrome.storage.sync.get(['categories', 'categoryPreferences']);
  const categories = result.categories || DEFAULT_CATEGORIES;
  const preferences = result.categoryPreferences || {};

  // Remove from categories
  const updatedCategories = categories.filter(cat => cat !== categoryName);
  
  // Remove preferences
  delete preferences[categoryKey];

  // Save
  await chrome.storage.sync.set({
    categories: updatedCategories,
    categoryPreferences: preferences
  });

  // Reload UI
  renderCategoryPreferences(updatedCategories, preferences);
  setupAddCategoryHandler(updatedCategories);
  
  showStatus('Category deleted successfully', 'success');
}

/**
 * Save all preferences
 */
async function saveAllPreferences() {
  try {
    // Get user name
    const userName = document.getElementById('userName').value.trim();
    
    if (!userName) {
      showStatus('Please enter your name', 'error');
      return;
    }

    // Get categories
    const result = await chrome.storage.sync.get(['categories']);
    const categories = result.categories || DEFAULT_CATEGORIES;

    // Collect all preferences
    const preferences = {};
    
    categories.forEach(category => {
      const categoryKey = category.toLowerCase().replace(/\s+/g, '_');
      
      preferences[categoryKey] = {
        tone: document.getElementById(`${categoryKey}_tone`).value,
        length: document.getElementById(`${categoryKey}_length`).value,
        greetingStyle: document.getElementById(`${categoryKey}_greeting`).value,
        closingStyle: document.getElementById(`${categoryKey}_closing`).value,
        formalityLevel: document.getElementById(`${categoryKey}_formality`).value,
        autoInsert: document.getElementById(`${categoryKey}_autoInsert`).checked,
        previewBeforeInsert: document.getElementById(`${categoryKey}_preview`).checked,
        customInstructions: document.getElementById(`${categoryKey}_instructions`).value.trim()
      };
    });

    // Save to storage
    await chrome.storage.sync.set({
      userName: userName,
      categories: categories,
      categoryPreferences: preferences
    });

    showStatus('All preferences saved successfully!', 'success');

    // Notify content script to update
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'preferencesUpdated',
        userName: userName,
        preferences: preferences
      }).catch(() => {
        // Content script might not be loaded, ignore error
      });
    }
  } catch (error) {
    showStatus('Error saving preferences', 'error');
    console.error('Error saving preferences:', error);
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  try {
    const status = document.getElementById('status');
    if (!status) {
      console.warn('Status element not found, cannot show message:', message);
      return;
    }
    status.textContent = message;
    status.className = `status ${type}`;
    
    setTimeout(() => {
      if (status) {
        status.className = 'status';
        status.textContent = '';
      }
    }, 3000);
  } catch (error) {
    console.error('Error showing status:', error);
  }
}
