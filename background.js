/**
 * Background service worker for the extension
 * 
 * IMPORTANT: This file should implement background functionality as specified in PRD.md
 * See PRD.md for all design decisions, requirements, and technical constraints.
 * 
 * Current implementation is placeholder - refer to PRD.md for target functionality.
 */

// Background service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Linky installed');
});

// Optional: Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // The popup will handle the UI, but we can add additional logic here if needed
});

/**
 * Proxy LangCache API calls from content script to avoid CORS issues
 * Content scripts run in the page context and are subject to CORS restrictions,
 * but background scripts can make cross-origin requests to domains in host_permissions
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callLangCache') {
    const { langCacheUrl, langCacheApiKey, langCacheId, openaiApiKey, messages, model, maxTokens, temperature } = request;
    
    // Construct the LangCache endpoint URL
    // Redis LangCache API uses /chat/completions as the endpoint
    const baseUrl = langCacheUrl.replace(/\/$/, "");
    const endpoint = `${baseUrl}/chat/completions`;
    
    console.log("[Background] Proxying LangCache API call", { endpoint, langCacheId });
    
    // Prepare request body - LangCache API expects OpenAI-compatible format
    const requestBody = {
      messages: messages,
      model: model,
      max_tokens: maxTokens,
      temperature: temperature,
      provider: {
        type: "openai",
        api_key: openaiApiKey,
      },
    };
    
    // Make the fetch request from background script (no CORS restrictions)
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${langCacheApiKey}`,
        "X-LangCache-Id": langCacheId,
      },
      body: JSON.stringify(requestBody),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Background] LangCache API error:", response.status, errorText);
          sendResponse({ 
            error: `LangCache API error: ${response.status} - ${errorText}` 
          });
          return;
        }
        
        const data = await response.json();
        
        // Verify the response structure
        if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
          sendResponse({ 
            error: "Invalid LangCache response format: missing choices" 
          });
          return;
        }
        
        console.log("[Background] LangCache response received (cache hit or miss)");
        sendResponse({ data: data });
      })
      .catch((error) => {
        console.error("[Background] LangCache fetch error:", error);
        sendResponse({ error: error.message || "Unknown error" });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});
