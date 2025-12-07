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
    // Redis LangCache API endpoint format can vary:
    // - Some use: {baseUrl}/v1/chat/completions
    // - Some use: {baseUrl}/chat/completions
    // - Some include instance ID in path: {baseUrl}/{instanceId}/chat/completions
    // - Some URLs are already complete endpoints
    let endpoint;
    const baseUrl = langCacheUrl.replace(/\/$/, "");
    
    // Check if URL already contains an endpoint path
    if (langCacheUrl.includes('/v1/chat/completions') || langCacheUrl.includes('/chat/completions')) {
      // URL already contains the full endpoint path
      endpoint = langCacheUrl;
    } else {
      // Try /v1/chat/completions first (most common format)
      // If that fails, the error handler will provide details
      endpoint = `${baseUrl}/v1/chat/completions`;
    }
    
    console.log("[Background] Proxying LangCache API call", { endpoint, langCacheId });
    
    // Prepare request body - LangCache API expects OpenAI-compatible format
    // Note: Some LangCache implementations may use different body formats
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
    
    // Helper function to make LangCache request
    const makeLangCacheRequest = (url) => {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${langCacheApiKey}`,
          "X-LangCache-Id": langCacheId,
        },
        body: JSON.stringify(requestBody),
      });
    };
    
    // Make the fetch request from background script (no CORS restrictions)
    makeLangCacheRequest(endpoint)
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Background] LangCache API error:", response.status, errorText);
          
          // If 404, try alternative endpoint formats
          if (response.status === 404) {
            const alternatives = [];
            
            // Try without /v1/ prefix
            if (endpoint.includes('/v1/chat/completions')) {
              alternatives.push(endpoint.replace('/v1/chat/completions', '/chat/completions'));
            }
            
            // Try with instance ID in path
            if (langCacheId && !endpoint.includes(langCacheId)) {
              const baseUrl = langCacheUrl.replace(/\/$/, "");
              alternatives.push(`${baseUrl}/${langCacheId}/chat/completions`);
              alternatives.push(`${baseUrl}/${langCacheId}/v1/chat/completions`);
            }
            
            // Try each alternative endpoint
            for (const altEndpoint of alternatives) {
              console.log("[Background] Trying alternative endpoint:", altEndpoint);
              try {
                const altResponse = await makeLangCacheRequest(altEndpoint);
                if (altResponse.ok) {
                  const altData = await altResponse.json();
                  if (altData.choices && Array.isArray(altData.choices) && altData.choices.length > 0) {
                    console.log("[Background] LangCache response received (cache hit or miss)");
                    sendResponse({ data: altData });
                    return;
                  }
                }
              } catch (altError) {
                console.log("[Background] Alternative endpoint failed:", altEndpoint, altError);
                continue;
              }
            }
            
            // All alternatives failed
            console.error("[Background] All LangCache endpoint alternatives failed");
            sendResponse({ 
              error: `LangCache API error: 404 - All endpoint formats failed. Tried: ${endpoint}, ${alternatives.join(', ')}` 
            });
            return;
          }
          
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
