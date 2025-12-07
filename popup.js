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
document.addEventListener('DOMContentLoaded', async () => {
  await initializeUI();
  setupEventListeners();
});

/**
 * Initialize the UI with saved preferences
 */
async function initializeUI() {
  // Load saved preferences
  const result = await chrome.storage.sync.get([
    'userName',
    'categories',
    'categoryPreferences'
  ]);

  // Set user name
  const userNameInput = document.getElementById('userName');
  if (result.userName) {
    userNameInput.value = result.userName;
  }

  // Initialize categories (merge defaults with saved custom categories)
  const categories = result.categories || DEFAULT_CATEGORIES;
  const preferences = result.categoryPreferences || {};

  // Render category preferences
  renderCategoryPreferences(categories, preferences);

  // Setup add category handler
  setupAddCategoryHandler(categories);
}

/**
 * Render all category preference cards
 */
function renderCategoryPreferences(categories, savedPreferences) {
  const container = document.getElementById('categoryPreferences');
  container.innerHTML = '';

  categories.forEach(category => {
    const categoryKey = category.toLowerCase().replace(/\s+/g, '_');
    const prefs = savedPreferences[categoryKey] || { ...DEFAULT_PREFERENCES };
    
    const card = createCategoryCard(category, categoryKey, prefs);
    container.appendChild(card);
  });
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
        previewBeforeInsert: document.getElementById(`${categoryKey}_preview`).checked
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
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  
  setTimeout(() => {
    status.className = 'status';
    status.textContent = '';
  }, 3000);
}
