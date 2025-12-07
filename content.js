/**
 * Content script that runs on LinkedIn pages
 *
 * IMPORTANT: This file should implement functionality as specified in PRD.md
 * See PRD.md for all design decisions, requirements, and technical constraints.
 *
 * Current implementation is placeholder - refer to PRD.md for target functionality.
 */
let userName = "";

// Default interaction categories as per PRD.md
const DEFAULT_CATEGORIES = [
  "Recruiter inbound",
  "Colleague/friend",
  "Inbound advice request",
  "Inbound meeting request",
];

// Default preferences for each category
const DEFAULT_PREFERENCES = {
  tone: "professional",
  length: "medium",
  greetingStyle: "standard",
  closingStyle: "standard",
  formalityLevel: "moderate",
  autoInsert: true,
  previewBeforeInsert: false,
};

// Chat detection and auto-insert
const processedInputs = new WeakSet(); // Track processed inputs to avoid duplicates
const messageGenerationInProgress = new WeakSet(); // Track inputs that are currently generating messages

// Load saved name from storage
chrome.storage.sync.get(["userName"], (result) => {
  if (result.userName) {
    userName = result.userName;
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateName" || request.action === "preferencesUpdated") {
    userName = request.userName || userName;
  }
});


/**
 * Extracts recipient information from LinkedIn chat interface
 * Based on PRD.md: Extracts visible profile data (name, job title, company, etc.)
 * @returns {Object|null} - Object with name and byline, or null if not found
 */
function extractRecipientInfo() {
  console.log("[Content] Extracting recipient information from LinkedIn chat interface");

  try {
    // LinkedIn chat header typically contains recipient info
    // Expanded selectors for recipient name in chat interface
    const nameSelectors = [
      // Modern LinkedIn selectors
      "div.msg-s-message-list__name",
      "h2.msg-s-message-list__name",
      "span.msg-s-message-list__name",
      'div[data-testid="message-header-name"]',
      "h2.msg-conversation-listitem__participant-names",
      // Conversation header selectors
      "div.msg-conversation-header__title h2",
      "div.msg-conversation-header__title span",
      "div.msg-conversation-header__title",
      "div.msg-conversation-header__title h1",
      // Alternative header selectors
      "header.msg-conversation-header h2",
      "header.msg-conversation-header span",
      "header.msg-conversation-header h1",
      'div[class*="conversation-header"] h2',
      'div[class*="conversation-header"] span',
      'div[class*="conversation-header"] h1',
      // Profile name in message list area
      'div[class*="message-list"] h2',
      'div[class*="message-list"] h1',
      // Generic fallbacks - look for any h2/h1 in the message area
      "div.msg-s-message-list h2",
      "div.msg-s-message-list h1",
      // Look for aria-label with name
      '[aria-label*="conversation"] h2',
      '[aria-label*="conversation"] h1',
      // Try finding by proximity to message form
      "form.msg-form ~ * h2",
      "form.msg-form ~ * h1",
      // Look for elements with aria-label that might contain the name
      '[aria-label]:not([aria-label*="button"]):not([aria-label*="link"])',
      // Look for data attributes
      '[data-testid*="name"]',
      '[data-testid*="header"]',
      // Look in specific LinkedIn containers
      'div[class*="msg-s-message-list"] h2',
      'div[class*="msg-s-message-list"] h1',
      'div[class*="msg-s-message-list"] span[class*="name"]',
      // Try to find the main heading in the conversation view
      "main h2",
      "main h1",
      '[role="main"] h2',
      '[role="main"] h1',
    ];

    let name = null;
    let usedSelector = null;
    for (const selector of nameSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          // Try textContent first
          let text = element.textContent?.trim();

          // If no text, try aria-label
          if (!text || text.length === 0) {
            text = element.getAttribute("aria-label")?.trim();
          }

          // If still no text, try title attribute
          if (!text || text.length === 0) {
            text = element.getAttribute("title")?.trim();
          }

          if (text && text.length > 0 && text.length < 100) {
            // More lenient filtering - only exclude if it's clearly UI text
            const lowerText = text.toLowerCase();
            const isUIText =
              lowerText === "linkedin" ||
              lowerText === "messaging" ||
              lowerText === "conversation" ||
              lowerText === "new message" ||
              lowerText === "search" ||
              lowerText.startsWith("linkedin ") ||
              lowerText.includes("linkedin messaging") ||
              lowerText.includes("linkedin conversation");

            // Also check if it looks like a name (contains letters, possibly spaces, not all caps unless short)
            const looksLikeName =
              /^[a-zA-Z\s\-'\.]+$/.test(text) && text.length >= 2 && (text.length <= 3 || text.toUpperCase() !== text); // Not all caps unless very short

            if (!isUIText && looksLikeName) {
              name = text;
              usedSelector = selector;
              console.log("[Content] Found recipient name using selector:", selector, "=", name);
              break;
            }
          }
        }
      } catch (selectorError) {
        // Continue to next selector if this one fails
        continue;
      }
    }

    // If still no name, try a more aggressive search
    if (!name) {
      console.log("[Content] Standard selectors failed, trying broader search");

      // First, try to find all h1/h2 elements and log their content for debugging
      const allH2s = Array.from(document.querySelectorAll("h2"));
      const allH1s = Array.from(document.querySelectorAll("h1"));
      console.log(
        "[Content] All h2 elements found:",
        allH2s.map((h) => ({
          text: h.textContent?.trim(),
          classes: h.className,
          id: h.id,
          parent: h.parentElement?.className,
        }))
      );
      console.log(
        "[Content] All h1 elements found:",
        allH1s.map((h) => ({
          text: h.textContent?.trim(),
          classes: h.className,
          id: h.id,
          parent: h.parentElement?.className,
        }))
      );

      // Look for any visible h2/h1 near the message form
      const messageForm = document.querySelector("form.msg-form, div.msg-form__contenteditable");
      if (messageForm) {
        // Try to find the conversation container - look up the DOM tree
        let container = messageForm;
        for (let i = 0; i < 10 && container; i++) {
          container = container.parentElement;
          if (
            container &&
            (container.className?.includes("conversation") ||
              container.className?.includes("message") ||
              container.getAttribute("data-testid")?.includes("message") ||
              container.getAttribute("data-testid")?.includes("conversation"))
          ) {
            break;
          }
        }

        if (container) {
          const headings = container.querySelectorAll(
            'h1, h2, h3, [class*="name"], [class*="title"], [class*="header"]'
          );
          console.log("[Content] Found headings in container:", headings.length);
          for (const heading of headings) {
            const text = heading.textContent?.trim();
            console.log("[Content] Checking heading:", { text, classes: heading.className });
            if (text && text.length > 0 && text.length < 100) {
              // More lenient filtering - only exclude if it's clearly UI text
              const lowerText = text.toLowerCase();
              if (
                !lowerText.includes("linkedin") &&
                !lowerText.includes("messaging") &&
                !lowerText.includes("conversation") &&
                !lowerText.includes("new message") &&
                !lowerText.includes("search") &&
                text.length > 1
              ) {
                // At least 2 characters
                name = text;
                usedSelector = "broad-search";
                console.log("[Content] Found recipient name via broad search:", name);
                break;
              }
            }
          }
        }

        // If still no name, try searching the entire visible area above the message form
        if (!name) {
          // Get all headings in the viewport
          const allHeadings = document.querySelectorAll("h1, h2");
          for (const heading of allHeadings) {
            // Check if heading is visible and above the message form
            const rect = heading.getBoundingClientRect();
            const formRect = messageForm.getBoundingClientRect();
            if (rect.bottom < formRect.top && rect.width > 0 && rect.height > 0) {
              const text = heading.textContent?.trim();
              if (text && text.length > 1 && text.length < 100) {
                const lowerText = text.toLowerCase();
                // Very lenient - just exclude obvious UI elements
                if (
                  !lowerText.match(/^(linkedin|messaging|conversation|new message|search|filter)$/i) &&
                  !lowerText.startsWith("linkedin") &&
                  text.length > 1
                ) {
                  name = text;
                  usedSelector = "viewport-search";
                  console.log("[Content] Found recipient name via viewport search:", name);
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Common selectors for recipient byline (job title, company, location)
    const bylineSelectors = [
      "div.msg-s-message-list__byline",
      "span.msg-s-message-list__byline",
      'div[data-testid="message-header-byline"]',
      "div.msg-conversation-header__subtitle",
      "p.msg-conversation-header__subtitle",
      "span.msg-conversation-header__subtitle",
      'div[class*="byline"]',
      'div[class*="subtitle"]',
      'span[class*="byline"]',
      'span[class*="subtitle"]',
    ];

    let byline = null;
    for (const selector of bylineSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length > 0) {
            byline = text;
            console.log("[Content] Found recipient byline using selector:", selector, "=", byline);
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
        byline: byline || null,
      };
      console.log("[Content] Extracted recipient info:", recipientInfo, "(used selector:", usedSelector, ")");
      return recipientInfo;
    } else {
      // Enhanced debugging: log what we found
      console.warn("[Content] Could not extract recipient information - no name found");
      console.log("[Content] Debug info:");
      const messageForm = document.querySelector("form.msg-form, div.msg-form__contenteditable");
      console.log("  - Message form found:", !!messageForm);
      console.log("  - Conversation header found:", !!document.querySelector('div[class*="conversation-header"]'));
      console.log("  - Message list found:", !!document.querySelector('div[class*="message-list"]'));

      const h2Elements = Array.from(document.querySelectorAll("h2"));
      const h1Elements = Array.from(document.querySelectorAll("h1"));
      console.log(
        "  - All h2 elements:",
        h2Elements.map((h) => ({
          text: h.textContent?.trim(),
          classes: h.className,
          visible: h.offsetParent !== null,
          rect: h.getBoundingClientRect(),
        }))
      );
      console.log(
        "  - All h1 elements:",
        h1Elements.map((h) => ({
          text: h.textContent?.trim(),
          classes: h.className,
          visible: h.offsetParent !== null,
          rect: h.getBoundingClientRect(),
        }))
      );

      // Try to find any text that looks like a name near the message form
      if (messageForm) {
        const formRect = messageForm.getBoundingClientRect();
        const candidates = [];
        h2Elements.forEach((h) => {
          const rect = h.getBoundingClientRect();
          if (rect.bottom < formRect.top && rect.width > 0 && rect.height > 0) {
            const text = h.textContent?.trim();
            if (text && text.length > 1 && text.length < 100) {
              candidates.push({ element: "h2", text, rect });
            }
          }
        });
        h1Elements.forEach((h) => {
          const rect = h.getBoundingClientRect();
          if (rect.bottom < formRect.top && rect.width > 0 && rect.height > 0) {
            const text = h.textContent?.trim();
            if (text && text.length > 1 && text.length < 100) {
              candidates.push({ element: "h1", text, rect });
            }
          }
        });
        console.log("  - Candidate names above message form:", candidates);
      }

      return null;
    }
  } catch (error) {
    console.error("[Content] Error extracting recipient information:", error);
    return null;
  }
}

/**
 * Extracts the chat history DOM element from LinkedIn
 * @returns {HTMLElement|null} - The chat messages container or null if not found
 */
function extractChatHistoryDOM() {
  console.log("[Content] Extracting chat history DOM element");

  try {
    // Common selectors for LinkedIn chat message containers
    const chatContainerSelectors = [
      "div.msg-s-message-list",
      "div.msg-s-message-list__conversation-container",
      'div[data-testid="message-list"]',
      "div.msg-conversation-listitem__message-list",
      "ul.msg-s-message-list__list",
      // Fallback: look for message items directly
      "div.msg-s-message-list__item",
      "li.msg-s-message-list__item",
    ];

    for (const selector of chatContainerSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log("[Content] Found chat container using selector:", selector);
        return element;
      }
    }

    // If no container found, try to find individual message elements
    const messageSelectors = [
      "div.msg-s-message-list__item",
      "li.msg-s-message-list__item",
      'div[data-testid="message-item"]',
      "div.msg-s-message-list__message",
    ];

    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Return the parent container if we found messages
        const parent = elements[0].closest(
          'div.msg-s-message-list, ul.msg-s-message-list__list, div[data-testid="message-list"]'
        );
        if (parent) {
          console.log("[Content] Found chat container via message items");
          return parent;
        }
      }
    }

    console.log("[Content] Could not find chat history container");
    return null;
  } catch (error) {
    console.error("[Content] Error extracting chat history DOM:", error);
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
  console.log("[Content] Extracting chat history info using OpenAI");

  if (!chatContainer) {
    console.log("[Content] No chat container provided");
    return null;
  }

  try {
    // Get OpenAI API key
    const openaiApiKey = await getOpenAIApiKey();

    if (!openaiApiKey) {
      console.warn("[Content] No OpenAI API key available for chat history extraction");
      return null;
    }

    // Clone the container to avoid modifying the original
    const clonedContainer = chatContainer.cloneNode(true);

    // Remove any script tags and other non-content elements
    clonedContainer.querySelectorAll("script, style, noscript").forEach((el) => el.remove());

    // Get the HTML content (limit size to avoid token limits)
    const htmlContent = clonedContainer.innerHTML;
    const maxLength = 10000; // Limit to ~10k chars to keep API call cheap
    const truncatedContent = htmlContent.length > maxLength ? htmlContent.substring(0, maxLength) + "..." : htmlContent;

    console.log("[Content] Sending chat history DOM to OpenAI for analysis");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'You are a LinkedIn chat history analyzer. Extract the key information from the provided HTML of a LinkedIn chat conversation. Return a JSON object with: messages (array of {sender: "user"|"recipient", text: string, timestamp: string|null}), summary (brief summary of conversation), isNewConversation (boolean), and keyTopics (array of main topics discussed). Only extract visible, meaningful messages. Ignore UI elements, placeholders, and empty messages.',
          },
          {
            role: "user",
            content: `Analyze this LinkedIn chat HTML and extract the conversation information:\n\n${truncatedContent}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Content] OpenAI API call failed for chat history:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const extractedInfo = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    console.log("[Content] Extracted chat history info:", extractedInfo);
    return extractedInfo;
  } catch (error) {
    console.error("[Content] Error extracting chat history info:", error);
    return null;
  }
}

/**
 * Retrieves OpenAI API key (helper function)
 * @returns {Promise<string|null>} - API key or null if not found
 */
async function getOpenAIApiKey() {
  // Check for hardcoded key in secrets.js
  if (typeof self !== "undefined" && self.OPENAI_API_KEY && self.OPENAI_API_KEY !== "your-openai-api-key-here") {
    return self.OPENAI_API_KEY;
  } else if (
    typeof window !== "undefined" &&
    window.OPENAI_API_KEY &&
    window.OPENAI_API_KEY !== "your-openai-api-key-here"
  ) {
    return window.OPENAI_API_KEY;
  }

  // Fallback to Chrome storage
  return new Promise((resolve) => {
    chrome.storage.sync.get(["openaiApiKey"], (result) => {
      resolve(result.openaiApiKey || null);
    });
  });
}

/**
 * Retrieves LangCache credentials (helper function)
 * @returns {Promise<Object|null>} - Object with url, apiKey, and id, or null if not found
 */
async function getLangCacheCredentials() {
  // Check for hardcoded credentials in secrets.js
  let url, apiKey, id;
  
  if (typeof self !== "undefined") {
    url = self.LANGCACHE_URL;
    apiKey = self.LANGCACHE_API_KEY;
    id = self.LANGCACHE_ID;
  } else if (typeof window !== "undefined") {
    url = window.LANGCACHE_URL;
    apiKey = window.LANGCACHE_API_KEY;
    id = window.LANGCACHE_ID;
  }

  // Check if credentials are valid (not placeholder values)
  if (
    url &&
    url !== "your-langcache-url-here" &&
    apiKey &&
    apiKey !== "your-langcache-api-key-here" &&
    id &&
    id !== "your-langcache-id-here"
  ) {
    return { url, apiKey, id };
  }

  return null;
}

/**
 * Categorizes the interaction type using chat history and recipient info
 * @param {Object} chatHistoryInfo - Extracted chat history information
 * @param {Object} recipientInfo - Recipient information (name, byline)
 * @returns {Promise<string>} - Interaction category name
 */
async function categorizeInteraction(chatHistoryInfo, recipientInfo) {
  console.log("[Content] Categorizing interaction");

  try {
    const openaiApiKey = await getOpenAIApiKey();

    if (!openaiApiKey) {
      console.warn("[Content] No OpenAI API key, using default category");
      return "Recruiter inbound"; // Default as per PRD
    }

    // Get available categories from storage
    const result = await chrome.storage.sync.get(["categories"]);
    const categories = result.categories || [
      "Recruiter inbound",
      "Colleague/friend",
      "Inbound advice request",
      "Inbound meeting request",
    ];

    const messages = chatHistoryInfo?.messages || [];
    const recipientByline = recipientInfo?.byline || "";
    const currentTime = new Date().toISOString();

    // Format the full message history with names and timestamps
    let messageHistoryText = "";
    if (messages.length > 0) {
      messageHistoryText = messages
        .map((msg) => {
          const sender = msg.sender === "user" ? "You" : recipientInfo?.name || "Recipient";
          const timestamp = msg.timestamp ? ` [${msg.timestamp}]` : "";
          return `${sender}${timestamp}: ${msg.text}`;
        })
        .join("\n\n");
    } else {
      messageHistoryText = "No previous messages (new conversation)";
    }

    console.log("[Content] Categorizing with context:", {
      messageCount: messages.length,
      recipientByline,
      categories,
      currentTime,
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn interaction categorizer. Categorize the conversation into one of these categories: ${categories.join(
              ", "
            )}. Return only the category name, nothing else.`,
          },
          {
            role: "user",
            content: `Categorize this LinkedIn conversation:\n\nRecipient: ${
              recipientInfo?.name || "Unknown"
            }\nRecipient Info: ${recipientByline}\n\nMessage History:\n${messageHistoryText}\n\nWhich category does this belong to?`,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("[Content] OpenAI API call failed for categorization:", response.status, errorText);
      return "Recruiter inbound"; // Default fallback
    }

    const data = await response.json();
    const category = data.choices?.[0]?.message?.content?.trim();

    // Validate category is in the list
    const validCategory =
      categories.find(
        (cat) => cat.toLowerCase() === category?.toLowerCase() || category?.toLowerCase().includes(cat.toLowerCase())
      ) || categories[0]; // Default to first category

    console.log("[Content] Categorized as:", validCategory);
    return validCategory;
  } catch (error) {
    console.error("[Content] Error categorizing interaction:", error);
    return "Recruiter inbound"; // Default fallback
  }
}

/**
 * Calls Redis LangCache API for semantic caching
 * The cache key is automatically generated based on semantic similarity of the messages
 * @param {string} langCacheUrl - LangCache endpoint URL
 * @param {string} langCacheApiKey - LangCache API key
 * @param {string} langCacheId - LangCache ID
 * @param {string} openaiApiKey - OpenAI API key
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} model - Model name (e.g., "gpt-4o-mini")
 * @param {number} maxTokens - Maximum tokens
 * @param {number} temperature - Temperature setting
 * @returns {Promise<Object>} - Response data from LangCache (OpenAI-compatible format)
 */
async function callLangCache(langCacheUrl, langCacheApiKey, langCacheId, openaiApiKey, messages, model, maxTokens, temperature) {
  // Construct the LangCache endpoint URL
  // Based on Redis LangCache API docs, the endpoint is /chat/completions
  // Remove trailing slash from URL if present
  const baseUrl = langCacheUrl.replace(/\/$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  
  console.log("[Content] Calling Redis LangCache for semantic caching via background script", { endpoint, langCacheId });

  // Proxy the request through the background script to avoid CORS issues
  // Content scripts run in the page context and are subject to CORS restrictions,
  // but background scripts can make cross-origin requests to domains in host_permissions
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "callLangCache",
        langCacheUrl: langCacheUrl,
        langCacheApiKey: langCacheApiKey,
        langCacheId: langCacheId,
        openaiApiKey: openaiApiKey,
        messages: messages,
        model: model,
        maxTokens: maxTokens,
        temperature: temperature,
      },
      (response) => {
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.error("[Content] LangCache message error:", chrome.runtime.lastError.message);
          reject(new Error(`LangCache message error: ${chrome.runtime.lastError.message}`));
          return;
        }

        // Check for API errors in response
        if (response.error) {
          console.error("[Content] LangCache API error:", response.error);
          reject(new Error(response.error));
          return;
        }

        // Verify the response structure
        if (!response.data || !response.data.choices || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
          reject(new Error("Invalid LangCache response format: missing choices"));
          return;
        }

        console.log("[Content] LangCache response received (cache hit or miss)");
        resolve(response.data);
      }
    );
  });
}

/**
 * Generates a personalized message draft using OpenAI with Redis LangCache semantic caching
 * @param {Object} context - Full context object with all information
 * @returns {Promise<string>} - Generated message draft
 */
async function generateMessageDraft(context) {
  console.log("[Content] Generating message draft with OpenAI and Redis LangCache");

  try {
    const openaiApiKey = await getOpenAIApiKey();

    if (!openaiApiKey) {
      throw new Error("OpenAI API key not available");
    }

    const { recipientInfo, chatHistoryInfo, researchResults, category, userPreferences, userName } = context;

    // Build the prompt with all context
    const recipientContext = `Recipient Name: ${recipientInfo?.name || "Unknown"}\nRecipient Info: ${
      recipientInfo?.byline || "Not available"
    }`;

    // Build chat context with full message history including names and timestamps
    let chatContext = "";
    if (chatHistoryInfo?.isNewConversation) {
      chatContext = "This is a new conversation with no previous messages.";
    } else {
      const messages = chatHistoryInfo?.messages || [];

      // Format the full conversation history with names and timestamps
      if (messages.length > 0) {
        const messageHistoryText = messages
          .map((msg, idx) => {
            const sender = msg.sender === "user" ? "You" : recipientInfo?.name || "Recipient";
            const timestamp = msg.timestamp ? ` [${msg.timestamp}]` : "";
            const isLast = idx === messages.length - 1;
            const marker = isLast ? " ⬅️ LAST MESSAGE (MOST IMPORTANT)" : "";
            return `${sender}${timestamp}: ${msg.text}${marker}`;
          })
          .join("\n\n");

        chatContext = `=== FULL MESSAGE HISTORY (Last message is MOST IMPORTANT) ===\n\n${messageHistoryText}`;
      } else {
        // Fallback if messages array is empty
        chatContext = "No previous messages available.";
      }
    }

    const researchContext =
      researchResults?.searchResults?.results?.length > 0
        ? `Research findings: Found ${researchResults.searchResults.results.length} relevant results about the recipient.`
        : "No additional research findings available.";

    const preferencesContext = userPreferences
      ? `Message style preferences:\n- Tone: ${userPreferences.tone || "professional"}\n- Length: ${
          userPreferences.length || "medium"
        }\n- Greeting style: ${userPreferences.greetingStyle || "standard"}\n- Closing style: ${
          userPreferences.closingStyle || "standard"
        }\n- Formality: ${userPreferences.formalityLevel || "moderate"}`
      : "Use professional, medium-length, moderate formality.";

    const systemPrompt = `You are a LinkedIn message draft generator. Generate a personalized, contextually appropriate LinkedIn message draft based on the provided information. 

CRITICAL: The LAST MESSAGE in the conversation history is the MOST IMPORTANT. Your generated message must be a direct response to the last message. Read the last message carefully and respond to its specific content, questions, or requests. Do NOT generate a generic message that ignores the last message.

The message should be ready to send (or edit) and should match the user's preferences for tone, length, and formality. LinkedIn messages are direct chat messages, not emails - they should be concise, conversational, and professional without email formatting.`;

    const userPrompt = `Generate a LinkedIn message draft with the following context:

${recipientContext}

${chatContext}

${researchContext}

Interaction Category: ${category}

${preferencesContext}

${userName ? `Your name: ${userName}` : ""}

Current time: ${new Date().toLocaleString()}

Generate a personalized message draft that:
- **CRITICALLY IMPORTANT: Responds directly to the LAST MESSAGE in the conversation history** - This is the most important requirement. Read the last message carefully and address its specific content, questions, or requests. Do NOT generate a generic message that could apply to any conversation.
- Is appropriate for the interaction category
- Matches the specified tone, length, and formality preferences
- References relevant context from the conversation history, especially the last message
- Is professional and ready to send (user will review and edit if needed)
- Is formatted as a LinkedIn chat message (NOT an email - no subject line, no email-style formatting)
- Is concise and direct, not overly formal or email-like
- Is complete and specific - do NOT include any placeholders, square brackets, [INSERT] markers, or anything for the user to fill in
- Uses specific details from the conversation history and context provided rather than generic placeholders

Return only the message text, nothing else. Do not include a subject line or email headers.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const model = "gpt-4o-mini";
    const maxTokens = 500;
    const temperature = 0.7;

    // Try to use LangCache if credentials are available
    const langCacheCreds = await getLangCacheCredentials();
    
    if (langCacheCreds) {
      try {
        console.log("[Content] Using Redis LangCache for semantic caching");
        const langCacheData = await callLangCache(
          langCacheCreds.url,
          langCacheCreds.apiKey,
          langCacheCreds.id,
          openaiApiKey,
          messages,
          model,
          maxTokens,
          temperature
        );
        
        const message = langCacheData.choices?.[0]?.message?.content?.trim();
        
        if (message) {
          console.log("[Content] Generated message draft from LangCache:", message);
          return message;
        } else {
          console.warn("[Content] LangCache returned empty response, falling back to direct OpenAI call");
        }
      } catch (langCacheError) {
        console.warn("[Content] LangCache error, falling back to direct OpenAI call:", langCacheError);
        // Fall through to direct OpenAI call
      }
    } else {
      console.log("[Content] LangCache credentials not available, using direct OpenAI call");
    }

    // Fallback to direct OpenAI call if LangCache is not available or fails
    console.log("[Content] Sending message generation request directly to OpenAI");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (!message) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("[Content] Generated message draft:", message);
    return message;
  } catch (error) {
    console.error("[Content] Error generating message draft:", error);
    throw error;
  }
}

/**
 * Performs research on the recipient after extracting their information
 * This function orchestrates the research process
 */
async function performRecipientResearch() {
  console.log("[Content] Starting recipient research process");

  // Extract recipient information from the page
  const recipientInfo = extractRecipientInfo();

  if (!recipientInfo) {
    console.log("[Content] No recipient info available, skipping research");
    return null;
  }

  // Check if research.js is available (it should be loaded before content.js)
  if (typeof researchRecipient === "undefined") {
    console.warn("[Content] researchRecipient function not available - research.js may not be loaded");
    return null;
  }

  try {
    console.log("[Content] Calling researchRecipient with:", recipientInfo);
    const researchResults = await researchRecipient(recipientInfo);
    console.log("[Content] Research completed:", researchResults);
    return researchResults;
  } catch (error) {
    console.error("[Content] Error during recipient research:", error);
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

  elements.forEach((el) => {
    // Verify it's in a message form (has a send button nearby)
    const form = el.closest("form.msg-form");
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
 * Uses the approach that works reliably with LinkedIn's contenteditable fields
 * Based on working browser console code that properly inserts text (not as placeholder)
 * @param {HTMLElement} inputElement - The chat input element
 * @param {string} message - The message text to insert
 * @returns {Promise<boolean>} - Promise that resolves to true if successful, false otherwise
 */
async function insertMessage(inputElement, message) {
  if (!inputElement || !message) {
    return false;
  }

  try {
    // Focus the element first
    inputElement.focus();

    // Convert newlines to HTML breaks
    // Escape HTML to prevent XSS, then convert \n to <br>
    const escapeHtml = (text) => {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    };

    const escapedMessage = escapeHtml(message);
    // Convert newlines to <br> tags
    const htmlContent = `<p>${escapedMessage.replace(/\n/g, "<br>")}</p>`;

    // Insert text using innerHTML with proper formatting
    inputElement.innerHTML = htmlContent;

    // Trigger input event so LinkedIn recognizes the change
    inputElement.dispatchEvent(new InputEvent("input", { bubbles: true }));

    // Workaround: Add and remove a space to trigger LinkedIn's formatting
    // This ensures newlines are properly rendered in the UI
    // LinkedIn's contenteditable needs this trigger to format newlines correctly
    setTimeout(() => {
      // Add a space at the end inside the paragraph
      const htmlWithSpace = htmlContent.replace("</p>", " </p>");
      inputElement.innerHTML = htmlWithSpace;
      // Trigger input event
      inputElement.dispatchEvent(new InputEvent("input", { bubbles: true }));
      // Remove the space and restore proper HTML
      setTimeout(() => {
        inputElement.innerHTML = htmlContent;
        // Trigger input event again to ensure LinkedIn updates
        inputElement.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }, 10);
    }, 50);

    processedInputs.add(inputElement);
    console.log("[Content] Auto-inserted message into chat input");
    return true;
  } catch (error) {
    console.error("[Content] Error inserting message:", error);
    return false;
  }
}

/**
 * Stores generated message and context in Chrome storage for history tracking
 * @param {string} message - The generated message text
 * @param {Object} context - The context object used to generate the message
 */
async function storeMessageHistory(message, context) {
  try {
    console.log("[Content] Storing message history");

    // Get existing message history
    const result = await chrome.storage.local.get(["messageHistory"]);
    const history = result.messageHistory || [];

    // Create history entry
    const historyEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      message: message,
      context: {
        recipientInfo: context.recipientInfo || null,
        category: context.category || null,
        messageHistory: context.chatHistoryInfo?.messages || [],
        isNewConversation: context.chatHistoryInfo?.isNewConversation || null,
        userPreferences: context.userPreferences || null,
        userName: context.userName || null,
        // Store a simplified version of research results (avoid storing large objects)
        hasResearchResults: !!(context.researchResults && context.researchResults.searchResults),
      },
    };

    // Add to history (most recent first)
    history.unshift(historyEntry);

    // Limit history to last 100 messages to avoid storage issues
    const maxHistory = 100;
    if (history.length > maxHistory) {
      history.splice(maxHistory);
    }

    // Save to storage
    await chrome.storage.local.set({ messageHistory: history });

    console.log("[Content] Message history stored successfully");
  } catch (error) {
    console.error("[Content] Error storing message history:", error);
    // Don't throw - history storage failure shouldn't break message generation
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
  const currentText = inputElement.textContent || "";
  const currentHTML = inputElement.innerHTML || "";
  const isEmpty =
    currentText.trim() === "" ||
    currentHTML.trim() === "" ||
    currentHTML.trim() === "<p><br></p>" ||
    currentHTML.trim() === "<br>";

  if (!isEmpty) {
    return;
  }

  messageGenerationInProgress.add(inputElement);

  try {
    console.log("[Content] Starting message generation flow");

    // Step 1: Extract recipient information (with retry)
    let recipientInfo = extractRecipientInfo();

    // If extraction failed, wait a bit and retry (page might still be loading)
    if (!recipientInfo) {
      console.log("[Content] Initial extraction failed, waiting 1s and retrying...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      recipientInfo = extractRecipientInfo();
    }

    // Final retry after another delay
    if (!recipientInfo) {
      console.log("[Content] Second extraction attempt failed, waiting 2s and retrying one more time...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      recipientInfo = extractRecipientInfo();
    }

    if (!recipientInfo) {
      const errorMsg =
        "Could not extract recipient information. Please ensure you are on a LinkedIn chat page and the page has fully loaded.";
      console.error("[Content]", errorMsg);
      console.error("[Content] Current URL:", window.location.href);
      console.error("[Content] Page title:", document.title);
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
    const categoryKey = category.toLowerCase().replace(/\s+/g, "_");
    const result = await chrome.storage.sync.get(["categoryPreferences", "userName"]);
    const allPreferences = result.categoryPreferences || {};
    const userPreferences = allPreferences[categoryKey] || {
      tone: "professional",
      length: "medium",
      greetingStyle: "standard",
      closingStyle: "standard",
      formalityLevel: "moderate",
    };
    const userName = result.userName || "";

    // Step 7: Generate message draft
    const context = {
      recipientInfo,
      chatHistoryInfo,
      researchResults,
      category,
      userPreferences,
      userName,
    };

    const message = await generateMessageDraft(context);

    // Step 8: Store message history
    await storeMessageHistory(message, context);

    // Step 9: Insert the generated message
    await insertMessage(inputElement, message);

    console.log("[Content] Message generation and insertion completed successfully");
  } catch (error) {
    console.error("[Content] Error in message generation flow:", error);
    const errorMessage = error.message || "Failed to generate message draft";
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

  chatInputs.forEach((input) => {
    // Only process if the input is visible and not already processed
    if (input.offsetParent !== null && !processedInputs.has(input) && !messageGenerationInProgress.has(input)) {
      // Add a small delay to ensure the input is fully ready
      // This prevents triggering LinkedIn's refresh handlers
      setTimeout(() => {
        // Double-check the input is still valid and empty
        if (input.isConnected && !processedInputs.has(input) && !messageGenerationInProgress.has(input)) {
          const currentText = input.textContent || "";
          const currentHTML = input.innerHTML || "";
          const isEmpty =
            currentText.trim() === "" ||
            currentHTML.trim() === "" ||
            currentHTML.trim() === "<p><br></p>" ||
            currentHTML.trim() === "<br>";

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

// Initialize chat detection on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    detectAndInsertChatMessages();
  });
} else {
  detectAndInsertChatMessages();
}

/**
 * Checks if the current profile page belongs to the logged-in user
 * This function's only job is to determine if a profile page is the user's own profile
 * @returns {boolean} - True if this is the user's own profile page, false otherwise
 */
function isUserOwnProfile() {
  try {
    // LinkedIn profile URLs typically follow patterns like:
    // - /in/username/ (for public profiles)
    // - /feed/ (home feed, which indicates you're viewing your own content)
    
    const currentUrl = window.location.href;
    const pathname = window.location.pathname;
    
    // Check if we're on a profile page (not messaging, feed, etc.)
    const isProfilePage = pathname.match(/^\/in\/[^\/]+\/?$/) || pathname.match(/^\/in\/[^\/]+\/recent-activity\/?$/);
    
    if (!isProfilePage) {
      return false;
    }
    
    // Look for indicators that this is the user's own profile:
    // 1. Check for "Edit profile" button or similar controls
    const editProfileSelectors = [
      'button[aria-label*="Edit profile"]',
      'button[aria-label*="Edit public profile"]',
      'a[aria-label*="Edit profile"]',
      'a[aria-label*="Edit public profile"]',
      'button[data-control-name="edit_topcard"]',
      'a[data-control-name="edit_topcard"]',
    ];
    
    for (const selector of editProfileSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log("[Content] Found edit profile button, confirming own profile");
        return true;
      }
    }
    
    // Also check for text content containing "Edit profile"
    const allButtons = document.querySelectorAll('button, a');
    for (const btn of allButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (text.includes('edit profile') || ariaLabel.includes('edit profile')) {
        console.log("[Content] Found edit profile button via text search, confirming own profile");
        return true;
      }
    }
    
    // 2. Check for "View profile as" or "See how others see your profile" - these only appear on own profile
    const viewAsSelectors = [
      'button[aria-label*="View profile as"]',
      'button[aria-label*="See how others see"]',
      'a[aria-label*="View profile as"]',
      'a[aria-label*="See how others see"]',
    ];
    
    for (const selector of viewAsSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log("[Content] Found 'view as' option, confirming own profile");
        return true;
      }
    }
    
    // Also check for text content
    for (const btn of allButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (text.includes('view profile as') || text.includes('see how others see') ||
          ariaLabel.includes('view profile as') || ariaLabel.includes('see how others see')) {
        console.log("[Content] Found 'view as' option via text search, confirming own profile");
        return true;
      }
    }
    
    // 3. Check for "Me" navigation item being active (if available)
    const meNavItem = document.querySelector('nav a[href*="/in/"]');
    if (meNavItem) {
      const meNavText = meNavItem.textContent?.toLowerCase() || '';
      const meNavAriaLabel = meNavItem.getAttribute('aria-label')?.toLowerCase() || '';
      if (meNavText.includes('me') || meNavAriaLabel.includes('me') || meNavAriaLabel.includes('profile')) {
        // Check if this nav item's href matches current profile URL
        const navHref = meNavItem.getAttribute('href');
        if (navHref && currentUrl.includes(navHref.split('?')[0])) {
          console.log("[Content] Found active 'Me' nav item matching current profile");
          return true;
        }
      }
    }
    
    // 4. Check for profile header actions that only appear on own profile
    // Look for "Add profile section" or similar
    const profileActions = document.querySelectorAll('button, a');
    for (const action of profileActions) {
      const text = action.textContent?.toLowerCase() || '';
      const ariaLabel = action.getAttribute('aria-label')?.toLowerCase() || '';
      if (
        text.includes('add profile section') ||
        text.includes('add section') ||
        ariaLabel.includes('add profile section') ||
        ariaLabel.includes('add section')
      ) {
        console.log("[Content] Found 'add section' button, confirming own profile");
        return true;
      }
    }
    
    // 5. Check URL pattern - if URL matches the pattern for "me" profile
    // LinkedIn sometimes uses /in/me/ or similar patterns
    if (pathname.includes('/me') || pathname.includes('/in/me')) {
      console.log("[Content] URL pattern suggests own profile (/me)");
      return true;
    }
    
    // If none of the indicators are found, assume it's not the user's profile
    // This is a conservative approach - we only scrape when we're confident
    console.log("[Content] Could not confirm this is user's own profile");
    return false;
  } catch (error) {
    console.error("[Content] Error checking if profile is user's own:", error);
    return false; // Conservative: if we can't determine, assume it's not
  }
}

/**
 * Extracts user profile information from the current page using OpenAI LLM
 * Only called when isUserOwnProfile() returns true
 * @returns {Promise<Object|null>} - Extracted profile information or null on error
 */
async function extractUserProfileInfo() {
  console.log("[Content] Extracting user profile information using OpenAI");
  
  try {
    const openaiApiKey = await getOpenAIApiKey();
    
    if (!openaiApiKey) {
      console.warn("[Content] No OpenAI API key available for profile extraction");
      return null;
    }
    
    // Get the main profile content area
    // LinkedIn profile pages typically have a main content area with profile information
    const profileSelectors = [
      'main',
      'div[class*="profile"]',
      'section[class*="profile"]',
      'div[data-testid="profile"]',
      'div[class*="pv-profile"]',
    ];
    
    let profileContainer = null;
    for (const selector of profileSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        profileContainer = element;
        break;
      }
    }
    
    // Fallback to body if no specific container found
    if (!profileContainer) {
      profileContainer = document.body;
    }
    
    // Clone to avoid modifying the original
    const clonedContainer = profileContainer.cloneNode(true);
    
    // Remove non-content elements
    clonedContainer.querySelectorAll('script, style, noscript, nav, header, footer').forEach((el) => el.remove());
    
    // Get HTML content (limit size to keep API call reasonable)
    const htmlContent = clonedContainer.innerHTML;
    const maxLength = 20000; // Limit to ~20k chars for profile pages
    const truncatedContent = htmlContent.length > maxLength ? htmlContent.substring(0, maxLength) + "..." : htmlContent;
    
    console.log("[Content] Sending profile page DOM to OpenAI for analysis");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn profile information extractor. Extract key information from the provided HTML of a LinkedIn profile page. Return a JSON object with the following structure:
{
  "name": "Full name",
  "headline": "Professional headline/title",
  "location": "Location",
  "currentCompany": "Current company name",
  "currentPosition": "Current job title",
  "about": "About section text",
  "experience": [{"title": "Job title", "company": "Company name", "duration": "Time period"}],
  "education": [{"school": "School name", "degree": "Degree", "field": "Field of study"}],
  "skills": ["Skill 1", "Skill 2"],
  "summary": "Brief professional summary"
}
Extract all available information. If a field is not available, use null. Only extract visible, meaningful content. Ignore UI elements, placeholders, and navigation.`,
          },
          {
            role: "user",
            content: `Extract profile information from this LinkedIn profile HTML:\n\n${truncatedContent}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Content] OpenAI API call failed for profile extraction:", response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    const extractedInfo = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    
    // Add metadata
    extractedInfo.extractedAt = new Date().toISOString();
    extractedInfo.sourceUrl = window.location.href;
    
    console.log("[Content] Extracted user profile info:", extractedInfo);
    return extractedInfo;
  } catch (error) {
    console.error("[Content] Error extracting user profile info:", error);
    return null;
  }
}

/**
 * Stores user profile information in Chrome storage
 * @param {Object} profileInfo - The extracted profile information
 */
async function storeUserProfileInfo(profileInfo) {
  try {
    console.log("[Content] Storing user profile information");
    
    if (!profileInfo) {
      console.warn("[Content] No profile info to store");
      return;
    }
    
    // Store in Chrome sync storage so it's available across devices
    await chrome.storage.sync.set({ 
      userProfile: profileInfo,
      userProfileLastUpdated: new Date().toISOString()
    });
    
    console.log("[Content] User profile information stored successfully");
  } catch (error) {
    console.error("[Content] Error storing user profile info:", error);
  }
}

/**
 * Checks if we're on a profile page and if it's the user's own profile, then extracts and stores it
 */
async function checkAndStoreUserProfile() {
  try {
    // Check if we're on a profile page
    const isProfilePage = window.location.pathname.match(/^\/in\/[^\/]+\/?/) || 
                         window.location.pathname.match(/^\/in\/[^\/]+\/recent-activity\/?$/);
    
    if (!isProfilePage) {
      return; // Not on a profile page
    }
    
    // Wait a bit for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if this is the user's own profile
    const isOwnProfile = isUserOwnProfile();
    
    if (!isOwnProfile) {
      console.log("[Content] Not user's own profile, skipping extraction");
      return;
    }
    
    console.log("[Content] Detected user's own profile page, extracting information");
    
    // Extract profile information
    const profileInfo = await extractUserProfileInfo();
    
    if (profileInfo) {
      // Store the profile information
      await storeUserProfileInfo(profileInfo);
      console.log("[Content] User profile information extracted and stored");
    } else {
      console.warn("[Content] Failed to extract profile information");
    }
  } catch (error) {
    console.error("[Content] Error in checkAndStoreUserProfile:", error);
  }
}

// Re-detect chat interfaces when navigating (LinkedIn is a SPA)
let lastUrl = location.href;
let chatCheckTimeout = null;
let profileCheckTimeout = null;
const domObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Reset processed inputs on navigation to allow re-detection
    // Note: WeakSet will automatically clear when elements are removed from DOM
    
    // Check for profile page when URL changes
    if (profileCheckTimeout) {
      clearTimeout(profileCheckTimeout);
    }
    profileCheckTimeout = setTimeout(() => {
      checkAndStoreUserProfile();
    }, 2000); // Wait 2 seconds for page to load
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

// Check profile on initial page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => checkAndStoreUserProfile(), 2000);
  });
} else {
  setTimeout(() => checkAndStoreUserProfile(), 2000);
}
