/**
 * Research API module
 * 
 * This module handles:
 * 1. Generating search terms from recipient information using OpenAI
 * 2. Performing Google searches to gather additional context about the recipient
 * 
 * IMPORTANT: This file should implement functionality as specified in PRD.md
 * See PRD.md for all design decisions, requirements, and technical constraints.
 */

/**
 * Generates a search term from recipient information using OpenAI
 * @param {Object} recipientInfo - Object containing name and byline
 * @param {string} recipientInfo.name - Recipient's name
 * @param {string} recipientInfo.byline - Recipient's byline (e.g., "CEO @ Strala | Oxford")
 * @returns {Promise<string>} - Generated search term
 */
async function generateSearchTerm(recipientInfo) {
  console.log('[Research] Generating search term for recipient:', recipientInfo);
  
  const { name, byline } = recipientInfo;
  
  if (!name) {
    console.warn('[Research] No name provided, cannot generate search term');
    return null;
  }
  
  // Construct a basic search term if OpenAI is not available
  // Format: "Name - Byline" (e.g., "Timon Gregg - CEO @ Strala | Oxford")
  let searchTerm = name;
  if (byline) {
    searchTerm = `${name} - ${byline}`;
  }
  
  // Try to use OpenAI to generate a better search term
  try {
    const openaiApiKey = await getOpenAIApiKey();
    
    if (openaiApiKey) {
      console.log('[Research] Using OpenAI to generate optimized search term');
      
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
              content: 'You are a search query optimizer. Given a person\'s name and professional byline, generate an optimal Google search query that will find relevant information about them. Return only the search query, nothing else.'
            },
            {
              role: 'user',
              content: `Name: ${name}\nByline: ${byline || 'N/A'}\n\nGenerate an optimal Google search query to find information about this person.`
            }
          ],
          max_tokens: 50,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[Research] OpenAI API call failed:', response.status, errorText);
        console.log('[Research] Falling back to basic search term:', searchTerm);
        return searchTerm;
      }
      
      const data = await response.json();
      const generatedTerm = data.choices?.[0]?.message?.content?.trim();
      
      if (generatedTerm) {
        console.log('[Research] OpenAI generated search term:', generatedTerm);
        return generatedTerm;
      } else {
        console.warn('[Research] OpenAI response missing search term, using fallback');
        return searchTerm;
      }
    } else {
      console.log('[Research] No OpenAI API key found, using basic search term:', searchTerm);
      return searchTerm;
    }
  } catch (error) {
    console.error('[Research] Error generating search term with OpenAI:', error);
    console.log('[Research] Falling back to basic search term:', searchTerm);
    return searchTerm;
  }
}

/**
 * Retrieves OpenAI API key from Chrome storage
 * @returns {Promise<string|null>} - API key or null if not found
 */
async function getOpenAIApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      resolve(result.openaiApiKey || null);
    });
  });
}

/**
 * Performs a Google search using the Custom Search API
 * @param {string} searchTerm - The search query
 * @returns {Promise<Object>} - Search results
 */
async function performGoogleSearch(searchTerm) {
  console.log('[Research] Performing Google search for:', searchTerm);
  
  if (!searchTerm) {
    console.warn('[Research] No search term provided');
    return { error: 'No search term provided' };
  }
  
  try {
    // Get Google API credentials from storage
    const { googleApiKey, googleSearchEngineId } = await getGoogleApiCredentials();
    
    if (!googleApiKey || !googleSearchEngineId) {
      console.warn('[Research] Google API credentials not configured');
      console.log('[Research] To enable Google search, configure googleApiKey and googleSearchEngineId in extension storage');
      return { 
        error: 'Google API credentials not configured',
        searchTerm 
      };
    }
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchTerm)}`;
    
    console.log('[Research] Making Google API request to:', searchUrl.replace(googleApiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Research] Google API call failed:', response.status, errorText);
      return { 
        error: `Google API error: ${response.status}`,
        details: errorText,
        searchTerm 
      };
    }
    
    const data = await response.json();
    
    console.log('[Research] Google search completed successfully');
    console.log('[Research] Found', data.items?.length || 0, 'results');
    
    // Log first few results for debugging
    if (data.items && data.items.length > 0) {
      console.log('[Research] Top results:');
      data.items.slice(0, 3).forEach((item, index) => {
        console.log(`[Research]   ${index + 1}. ${item.title} - ${item.link}`);
      });
    }
    
    return {
      success: true,
      searchTerm,
      results: data.items || [],
      totalResults: data.searchInformation?.totalResults || 0
    };
  } catch (error) {
    console.error('[Research] Error performing Google search:', error);
    return {
      error: error.message,
      searchTerm
    };
  }
}

/**
 * Retrieves Google API credentials from Chrome storage
 * @returns {Promise<Object>} - Object with googleApiKey and googleSearchEngineId
 */
async function getGoogleApiCredentials() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['googleApiKey', 'googleSearchEngineId'], (result) => {
      resolve({
        googleApiKey: result.googleApiKey || null,
        googleSearchEngineId: result.googleSearchEngineId || null
      });
    });
  });
}

/**
 * Main research function that orchestrates the research process
 * @param {Object} recipientInfo - Object containing name and byline
 * @returns {Promise<Object>} - Research results
 */
async function researchRecipient(recipientInfo) {
  console.log('[Research] Starting research for recipient:', recipientInfo);
  
  // Step 1: Generate search term
  const searchTerm = await generateSearchTerm(recipientInfo);
  
  if (!searchTerm) {
    console.warn('[Research] Could not generate search term, aborting research');
    return {
      error: 'Could not generate search term',
      recipientInfo
    };
  }
  
  // Step 2: Perform Google search
  const searchResults = await performGoogleSearch(searchTerm);
  
  console.log('[Research] Research completed');
  
  return {
    recipientInfo,
    searchTerm,
    searchResults
  };
}

// Make functions globally available for content script
// Since research.js is loaded before content.js in manifest.json,
// these functions will be available in the global scope
// Using self (works in both window and worker contexts) for maximum compatibility
if (typeof self !== 'undefined') {
  self.researchRecipient = researchRecipient;
  self.generateSearchTerm = generateSearchTerm;
  self.performGoogleSearch = performGoogleSearch;
} else if (typeof window !== 'undefined') {
  window.researchRecipient = researchRecipient;
  window.generateSearchTerm = generateSearchTerm;
  window.performGoogleSearch = performGoogleSearch;
}
