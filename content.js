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
const processedInputs = new WeakSet(); // Track processed inputs to avoid duplicates
const messageGenerationInProgress = new WeakSet(); // Track inputs that are currently generating messages

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
 * Extracts recipient information from LinkedIn chat interface
 * Based on PRD.md: Extracts visible profile data (name, job title, company, etc.)
 * @returns {Object|null} - Object with name and byline, or null if not found
 */
function extractRecipientInfo() {
  console.log('[Content] Extracting recipient information from LinkedIn chat interface');
  
  try {
    // LinkedIn chat header typically contains recipient info
    // Expanded selectors for recipient name in chat interface
    const nameSelectors = [
      // Modern LinkedIn selectors
      'div.msg-s-message-list__name',
      'h2.msg-s-message-list__name',
      'span.msg-s-message-list__name',
      'div[data-testid="message-header-name"]',
      'h2.msg-conversation-listitem__participant-names',
      // Conversation header selectors
      'div.msg-conversation-header__title h2',
      'div.msg-conversation-header__title span',
      'div.msg-conversation-header__title',
      // Alternative header selectors
      'header.msg-conversation-header h2',
      'header.msg-conversation-header span',
      'div[class*="conversation-header"] h2',
      'div[class*="conversation-header"] span',
      // Profile name in message list area
      'div[class*="message-list"] h2',
      'div[class*="message-list"] h1',
      // Generic fallbacks - look for any h2/h1 in the message area
      'div.msg-s-message-list h2',
      'div.msg-s-message-list h1',
      // Look for aria-label with name
      '[aria-label*="conversation"] h2',
      '[aria-label*="conversation"] h1',
      // Try finding by proximity to message form
      'form.msg-form ~ * h2',
      'form.msg-form ~ * h1'
    ];
    
    let name = null;
    let usedSelector = null;
    for (const selector of nameSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          // Filter out empty strings and common UI text
          if (text && text.length > 0 && 
              !text.toLowerCase().includes('linkedin') &&
              !text.toLowerCase().includes('message') &&
              !text.toLowerCase().includes('conversation') &&
              text.length < 100) { // Reasonable name length
            name = text;
            usedSelector = selector;
            console.log('[Content] Found recipient name using selector:', selector, '=', name);
            break;
          }
        }
      } catch (selectorError) {
        // Continue to next selector if this one fails
        continue;
      }
    }
    
    // If still no name, try a more aggressive search
    if (!name) {
      console.log('[Content] Standard selectors failed, trying broader search');
      // Look for any visible h2/h1 near the message form
      const messageForm = document.querySelector('form.msg-form, div.msg-form__contenteditable');
      if (messageForm) {
        const header = messageForm.closest('div[class*="conversation"], div[class*="message"]');
        if (header) {
          const headings = header.querySelectorAll('h1, h2, h3, [class*="name"], [class*="title"]');
          for (const heading of headings) {
            const text = heading.textContent?.trim();
            if (text && text.length > 0 && text.length < 100 &&
                !text.toLowerCase().includes('linkedin') &&
                !text.toLowerCase().includes('message') &&
                !text.toLowerCase().includes('conversation')) {
              name = text;
              usedSelector = 'broad-search';
              console.log('[Content] Found recipient name via broad search:', name);
              break;
            }
          }
        }
      }
    }
    
    // Common selectors for recipient byline (job title, company, location)
    const bylineSelectors = [
      'div.msg-s-message-list__byline',
      'span.msg-s-message-list__byline',
      'div[data-testid="message-header-byline"]',
      'div.msg-conversation-header__subtitle',
      'p.msg-conversation-header__subtitle',
      'span.msg-conversation-header__subtitle',
      'div[class*="byline"]',
      'div[class*="subtitle"]',
      'span[class*="byline"]',
      'span[class*="subtitle"]'
    ];
    
    let byline = null;
    for (const selector of bylineSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length > 0) {
            byline = text;
            console.log('[Content] Found recipient byline using selector:', selector, '=', byline);
            break;
          }
        }
      } catch (selectorError) {
        continue;
      }
    }
    
    // If we found at least a name, return the info
    if (name) {
      const recipientInfo = {
        name,
        byline: byline || null
      };
      console.log('[Content] Extracted recipient info:', recipientInfo, '(used selector:', usedSelector, ')');
      return recipientInfo;
    } else {
      // Enhanced debugging: log what we found
      console.warn('[Content] Could not extract recipient information - no name found');
      console.log('[Content] Debug info:');
      console.log('  - Message form found:', !!document.querySelector('form.msg-form, div.msg-form__contenteditable'));
      console.log('  - Conversation header found:', !!document.querySelector('div[class*="conversation-header"]'));
      console.log('  - Message list found:', !!document.querySelector('div[class*="message-list"]'));
      console.log('  - All h2 elements:', Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).filter(Boolean));
      console.log('  - All h1 elements:', Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()).filter(Boolean));
      return null;
    }
  } catch (error) {
    console.error('[Content] Error extracting recipient information:', error);
    return null;
  }
}

/**
 * Extracts the chat history DOM element from LinkedIn
 * @returns {HTMLElement|null} - The chat messages container or null if not found
 */
function extractChatHistoryDOM() {
  console.log('[Content] Extracting chat history DOM element');
  
  try {
    // Common selectors for LinkedIn chat message containers
    const chatContainerSelectors = [
      'div.msg-s-message-list',
      'div.msg-s-message-list__conversation-container',
      'div[data-testid="message-list"]',
      'div.msg-conversation-listitem__message-list',
      'ul.msg-s-message-list__list',
      // Fallback: look for message items directly
      'div.msg-s-message-list__item',
      'li.msg-s-message-list__item'
    ];
    
    for (const selector of chatContainerSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[Content] Found chat container using selector:', selector);
        return element;
      }
    }
    
    // If no container found, try to find individual message elements
    const messageSelectors = [
      'div.msg-s-message-list__item',
      'li.msg-s-message-list__item',
      'div[data-testid="message-item"]',
      'div.msg-s-message-list__message'
    ];
    
    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Return the parent container if we found messages
        const parent = elements[0].closest('div.msg-s-message-list, ul.msg-s-message-list__list, div[data-testid="message-list"]');
        if (parent) {
          console.log('[Content] Found chat container via message items');
          return parent;
        }
      }
    }
    
    console.log('[Content] Could not find chat history container');
    return null;
  } catch (error) {
    console.error('[Content] Error extracting chat history DOM:', error);
    return null;
  }
}

/**
 * Uses OpenAI to extract useful information from chat history DOM
 * Uses a cheap LLM call (gpt-4o-mini) to analyze the DOM structure
 * @param {HTMLElement} chatContainer - The chat messages container element
 * @returns {Promise<Object|null>} - Extracted chat history info or null on error
 */
async function extractChatHistoryInfo(chatContainer) {
  console.log('[Content] Extracting chat history info using OpenAI');
  
  if (!chatContainer) {
    console.log('[Content] No chat container provided');
    return null;
  }
  
  try {
    // Get OpenAI API key
    const openaiApiKey = await getOpenAIApiKey();
    
    if (!openaiApiKey) {
      console.warn('[Content] No OpenAI API key available for chat history extraction');
      return null;
    }
    
    // Clone the container to avoid modifying the original
    const clonedContainer = chatContainer.cloneNode(true);
    
    // Remove any script tags and other non-content elements
    clonedContainer.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    
    // Get the HTML content (limit size to avoid token limits)
    const htmlContent = clonedContainer.innerHTML;
    const maxLength = 10000; // Limit to ~10k chars to keep API call cheap
    const truncatedContent = htmlContent.length > maxLength 
      ? htmlContent.substring(0, maxLength) + '...'
      : htmlContent;
    
    console.log('[Content] Sending chat history DOM to OpenAI for analysis');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a LinkedIn chat history analyzer. Extract the key information from the provided HTML of a LinkedIn chat conversation. Return a JSON object with: messages (array of {sender: "user"|"recipient", text: string, timestamp: string|null}), summary (brief summary of conversation), isNewConversation (boolean), and keyTopics (array of main topics discussed). Only extract visible, meaningful messages. Ignore UI elements, placeholders, and empty messages.'
          },
          {
            role: 'user',
            content: `Analyze this LinkedIn chat HTML and extract the conversation information:\n\n${truncatedContent}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Content] OpenAI API call failed for chat history:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    const extractedInfo = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    
    console.log('[Content] Extracted chat history info:', extractedInfo);
    return extractedInfo;
  } catch (error) {
    console.error('[Content] Error extracting chat history info:', error);
    return null;
  }
}

/**
 * Retrieves OpenAI API key (helper function)
 * @returns {Promise<string|null>} - API key or null if not found
 */
async function getOpenAIApiKey() {
  // Check for hardcoded key in secrets.js
  if (typeof self !== 'undefined' && self.OPENAI_API_KEY && self.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    return self.OPENAI_API_KEY;
  } else if (typeof window !== 'undefined' && window.OPENAI_API_KEY && window.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    return window.OPENAI_API_KEY;
  }
  
  // Fallback to Chrome storage
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      resolve(result.openaiApiKey || null);
    });
  });
}

/**
 * Categorizes the interaction type using chat history and recipient info
 * @param {Object} chatHistoryInfo - Extracted chat history information
 * @param {Object} recipientInfo - Recipient information (name, byline)
 * @returns {Promise<string>} - Interaction category name
 */
async function categorizeInteraction(chatHistoryInfo, recipientInfo) {
  console.log('[Content] Categorizing interaction');
  
  try {
    const openaiApiKey = await getOpenAIApiKey();
    
    if (!openaiApiKey) {
      console.warn('[Content] No OpenAI API key, using default category');
      return 'Recruiter inbound'; // Default as per PRD
    }
    
    // Get available categories from storage
    const result = await chrome.storage.sync.get(['categories']);
    const categories = result.categories || [
      'Recruiter inbound',
      'Colleague/friend',
      'Inbound advice request',
      'Inbound meeting request'
    ];
    
    const chatSummary = chatHistoryInfo?.summary || 'No previous messages';
    const isNewConversation = chatHistoryInfo?.isNewConversation !== false;
    const keyTopics = chatHistoryInfo?.keyTopics || [];
    const recipientByline = recipientInfo?.byline || '';
    
    console.log('[Content] Categorizing with context:', {
      chatSummary,
      isNewConversation,
      keyTopics,
      recipientByline,
      categories
    });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a LinkedIn interaction categorizer. Categorize the conversation into one of these categories: ${categories.join(', ')}. Return only the category name, nothing else.`
          },
          {
            role: 'user',
            content: `Categorize this LinkedIn conversation:\n\nRecipient: ${recipientInfo?.name || 'Unknown'}\nRecipient Info: ${recipientByline}\n\nConversation Summary: ${chatSummary}\nIs New Conversation: ${isNewConversation}\nKey Topics: ${keyTopics.join(', ') || 'None'}\n\nWhich category does this belong to?`
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Content] OpenAI API call failed for categorization:', response.status, errorText);
      return 'Recruiter inbound'; // Default fallback
    }
    
    const data = await response.json();
    const category = data.choices?.[0]?.message?.content?.trim();
    
    // Validate category is in the list
    const validCategory = categories.find(cat => 
      cat.toLowerCase() === category?.toLowerCase() || 
      category?.toLowerCase().includes(cat.toLowerCase())
    ) || categories[0]; // Default to first category
    
    console.log('[Content] Categorized as:', validCategory);
    return validCategory;
  } catch (error) {
    console.error('[Content] Error categorizing interaction:', error);
    return 'Recruiter inbound'; // Default fallback
  }
}

/**
 * Generates a personalized message draft using OpenAI
 * @param {Object} context - Full context object with all information
 * @returns {Promise<string>} - Generated message draft
 */
async function generateMessageDraft(context) {
  console.log('[Content] Generating message draft with OpenAI');
  
  try {
    const openaiApiKey = await getOpenAIApiKey();
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not available');
    }
    
    const {
      recipientInfo,
      chatHistoryInfo,
      researchResults,
      category,
      userPreferences,
      userName
    } = context;
    
    // Build the prompt with all context
    const recipientContext = `Recipient Name: ${recipientInfo?.name || 'Unknown'}\nRecipient Info: ${recipientInfo?.byline || 'Not available'}`;
    
    const chatContext = chatHistoryInfo?.isNewConversation 
      ? 'This is a new conversation with no previous messages.'
      : `Previous conversation summary: ${chatHistoryInfo?.summary || 'No summary available'}\nKey topics discussed: ${chatHistoryInfo?.keyTopics?.join(', ') || 'None'}`;
    
    const researchContext = researchResults?.searchResults?.results?.length > 0
      ? `Research findings: Found ${researchResults.searchResults.results.length} relevant results about the recipient.`
      : 'No additional research findings available.';
    
    const preferencesContext = userPreferences
      ? `Message style preferences:\n- Tone: ${userPreferences.tone || 'professional'}\n- Length: ${userPreferences.length || 'medium'}\n- Greeting style: ${userPreferences.greetingStyle || 'standard'}\n- Closing style: ${userPreferences.closingStyle || 'standard'}\n- Formality: ${userPreferences.formalityLevel || 'moderate'}`
      : 'Use professional, medium-length, moderate formality.';
    
    const systemPrompt = `You are a LinkedIn message draft generator. Generate a personalized, contextually appropriate LinkedIn message draft based on the provided information. The message should be ready to send (or edit) and should match the user's preferences for tone, length, and formality.`;

    const userPrompt = `Generate a LinkedIn message draft with the following context:

${recipientContext}

${chatContext}

${researchContext}

Interaction Category: ${category}

${preferencesContext}

${userName ? `Your name: ${userName}` : ''}

Generate a personalized message draft that:
- Is appropriate for the interaction category
- Matches the specified tone, length, and formality preferences
- References relevant context from the conversation or recipient info when appropriate
- Is professional and ready to send (user will review and edit if needed)
- Does NOT include placeholders or [INSERT] markers

Return only the message text, nothing else.`;
    
    console.log('[Content] Sending message generation request to OpenAI');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();
    
    if (!message) {
      throw new Error('Empty response from OpenAI');
    }
    
    console.log('[Content] Generated message draft:', message);
    return message;
  } catch (error) {
    console.error('[Content] Error generating message draft:', error);
    throw error;
  }
}

/**
 * Performs research on the recipient after extracting their information
 * This function orchestrates the research process
 */
async function performRecipientResearch() {
  console.log('[Content] Starting recipient research process');
  
  // Extract recipient information from the page
  const recipientInfo = extractRecipientInfo();
  
  if (!recipientInfo) {
    console.log('[Content] No recipient info available, skipping research');
    return null;
  }
  
  // Check if research.js is available (it should be loaded before content.js)
  if (typeof researchRecipient === 'undefined') {
    console.warn('[Content] researchRecipient function not available - research.js may not be loaded');
    return null;
  }
  
  try {
    console.log('[Content] Calling researchRecipient with:', recipientInfo);
    const researchResults = await researchRecipient(recipientInfo);
    console.log('[Content] Research completed:', researchResults);
    return researchResults;
  } catch (error) {
    console.error('[Content] Error during recipient research:', error);
    return null;
  }
}

/**
 * Detects LinkedIn chat message input fields
 * LinkedIn uses contenteditable divs for message inputs
 * Based on actual LinkedIn structure: div.msg-form__contenteditable[contenteditable="true"]
 */
function findChatInputFields() {
  const inputs = [];
  
  // Primary selector: LinkedIn's actual message input field
  const primarySelector = 'div.msg-form__contenteditable[contenteditable="true"][role="textbox"]';
  const elements = document.querySelectorAll(primarySelector);
  
  elements.forEach(el => {
    // Verify it's in a message form (has a send button nearby)
    const form = el.closest('form.msg-form');
    if (form) {
      const hasSendButton = form.querySelector('button.msg-form__send-button, button[type="submit"]');
      if (hasSendButton && !processedInputs.has(el)) {
        inputs.push(el);
      }
    }
  });
  
  return inputs;
}

/**
 * Inserts a message into a chat input field
 * Uses proper text insertion methods to ensure LinkedIn recognizes the content
 * @param {HTMLElement} inputElement - The chat input element
 * @param {string} message - The message text to insert
 * @returns {Promise<boolean>} - Promise that resolves to true if successful, false otherwise
 */
async function insertMessage(inputElement, message) {
  if (!inputElement || !message) {
    return false;
  }
  
  try {
    // Focus the element first to ensure it's in the correct state
    inputElement.focus();
    
    // Clear any existing content completely
    inputElement.innerHTML = '';
    
    // Wait a frame to ensure the DOM is updated
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        try {
          // Use execCommand to insert text as if typed - this is the most reliable method
          // It ensures LinkedIn recognizes the content and hides the placeholder
          const selection = window.getSelection();
          const range = document.createRange();
          
          // Set range to the contenteditable element
          range.selectNodeContents(inputElement);
          range.collapse(true); // Collapse to start
          
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Insert text using execCommand (simulates actual typing)
          // This method is recognized by LinkedIn as user input
          if (document.execCommand && document.execCommand('insertText', false, message)) {
            // Success - text was inserted
            // Trigger input event to ensure LinkedIn processes it
            setTimeout(() => {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true });
              inputElement.dispatchEvent(inputEvent);
              processedInputs.add(inputElement);
              console.log('[Content] Auto-inserted message into chat input');
              resolve(true);
            }, 0);
          } else {
            // Fallback: Direct text insertion with proper structure
            // Create a paragraph element with the text
            const p = document.createElement('p');
            p.textContent = message;
            inputElement.appendChild(p);
            
            // Remove any placeholder-related attributes
            inputElement.removeAttribute('data-placeholder');
            inputElement.removeAttribute('placeholder');
            
            // Trigger events to notify LinkedIn
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            inputElement.dispatchEvent(inputEvent);
            
            // Also trigger beforeinput event
            inputElement.dispatchEvent(new Event('beforeinput', { bubbles: true, cancelable: true }));
            
            processedInputs.add(inputElement);
            console.log('[Content] Auto-inserted message into chat input (fallback method)');
            resolve(true);
          }
        } catch (error) {
          console.error('[Content] Error in text insertion:', error);
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('[Content] Error inserting message:', error);
    return false;
  }
}

/**
 * Inserts an error message into the chat input field
 * @param {HTMLElement} inputElement - The chat input element
 * @param {string} errorMessage - The error message to display
 */
function insertErrorMessage(inputElement, errorMessage) {
  const fullErrorMessage = `[Error: ${errorMessage}]`;
  insertMessage(inputElement, fullErrorMessage);
}

/**
 * Generates and inserts a personalized message draft
 * Orchestrates the full flow: extract → research → categorize → generate → insert
 * @param {HTMLElement} inputElement - The chat input element
 */
async function generateAndInsertMessage(inputElement) {
  if (!inputElement || processedInputs.has(inputElement) || messageGenerationInProgress.has(inputElement)) {
    return;
  }
  
  // Check if input is already filled
  const currentText = inputElement.textContent || '';
  const currentHTML = inputElement.innerHTML || '';
  const isEmpty = currentText.trim() === '' || 
                  currentHTML.trim() === '' || 
                  currentHTML.trim() === '<p><br></p>' ||
                  currentHTML.trim() === '<br>';
  
  if (!isEmpty) {
    return;
  }
  
  messageGenerationInProgress.add(inputElement);
  
  try {
    console.log('[Content] Starting message generation flow');
    
    // Step 1: Extract recipient information (with retry)
    let recipientInfo = extractRecipientInfo();
    
    // If extraction failed, wait a bit and retry (page might still be loading)
    if (!recipientInfo) {
      console.log('[Content] Initial extraction failed, waiting 1s and retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      recipientInfo = extractRecipientInfo();
    }
    
    // Final retry after another delay
    if (!recipientInfo) {
      console.log('[Content] Second extraction attempt failed, waiting 2s and retrying one more time...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      recipientInfo = extractRecipientInfo();
    }
    
    if (!recipientInfo) {
      const errorMsg = 'Could not extract recipient information. Please ensure you are on a LinkedIn chat page and the page has fully loaded.';
      console.error('[Content]', errorMsg);
      console.error('[Content] Current URL:', window.location.href);
      console.error('[Content] Page title:', document.title);
      throw new Error(errorMsg);
    }
    
    // Step 2: Extract chat history DOM
    const chatContainer = extractChatHistoryDOM();
    
    // Step 3: Extract chat history info using OpenAI
    let chatHistoryInfo = null;
    if (chatContainer) {
      chatHistoryInfo = await extractChatHistoryInfo(chatContainer);
    }
    
    // Step 4: Perform recipient research
    const researchResults = await performRecipientResearch();
    
    // Step 5: Categorize interaction
    const category = await categorizeInteraction(chatHistoryInfo, recipientInfo);
    
    // Step 6: Get user preferences for this category
    const categoryKey = category.toLowerCase().replace(/\s+/g, '_');
    const result = await chrome.storage.sync.get(['categoryPreferences', 'userName']);
    const allPreferences = result.categoryPreferences || {};
    const userPreferences = allPreferences[categoryKey] || {
      tone: 'professional',
      length: 'medium',
      greetingStyle: 'standard',
      closingStyle: 'standard',
      formalityLevel: 'moderate'
    };
    const userName = result.userName || '';
    
    // Step 7: Generate message draft
    const context = {
      recipientInfo,
      chatHistoryInfo,
      researchResults,
      category,
      userPreferences,
      userName
    };
    
    const message = await generateMessageDraft(context);
    
    // Step 8: Insert the generated message
    await insertMessage(inputElement, message);
    
    console.log('[Content] Message generation and insertion completed successfully');
  } catch (error) {
    console.error('[Content] Error in message generation flow:', error);
    const errorMessage = error.message || 'Failed to generate message draft';
    insertErrorMessage(inputElement, errorMessage);
  } finally {
    messageGenerationInProgress.delete(inputElement);
  }
}

/**
 * Scans for chat interfaces and auto-generates/inserts personalized messages
 * Only processes empty inputs that haven't been processed yet
 * Adds a small delay to ensure LinkedIn's UI is stable
 */
function detectAndInsertChatMessages() {
  const chatInputs = findChatInputFields();
  
  chatInputs.forEach(input => {
    // Only process if the input is visible and not already processed
    if (input.offsetParent !== null && !processedInputs.has(input) && !messageGenerationInProgress.has(input)) {
      // Add a small delay to ensure the input is fully ready
      // This prevents triggering LinkedIn's refresh handlers
      setTimeout(() => {
        // Double-check the input is still valid and empty
        if (input.isConnected && !processedInputs.has(input) && !messageGenerationInProgress.has(input)) {
          const currentText = input.textContent || '';
          const currentHTML = input.innerHTML || '';
          const isEmpty = currentText.trim() === '' || 
                          currentHTML.trim() === '' || 
                          currentHTML.trim() === '<p><br></p>' ||
                          currentHTML.trim() === '<br>';
          
          if (isEmpty) {
            // Generate and insert personalized message
            generateAndInsertMessage(input);
          }
        }
      }, 500); // Slightly longer delay to let UI stabilize before starting generation
    }
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
  // Increased delay to let LinkedIn's UI settle after changes
  if (chatCheckTimeout) {
    clearTimeout(chatCheckTimeout);
  }
  chatCheckTimeout = setTimeout(() => {
    detectAndInsertChatMessages();
  }, 1000);
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
