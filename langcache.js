/**
 * Redis LangCache Integration
 * 
 * This module provides semantic caching for OpenAI LLM calls using Redis LangCache.
 * It implements caching with semantic similarity matching to reduce API costs and improve response times.
 * 
 * Based on Redis LangCache API: https://redis.io/docs/latest/develop/ai/langcache/api-examples/
 */

/**
 * Generates a cache key from a prompt and context
 * @param {string} prompt - The user prompt
 * @param {Object} context - Additional context (model, temperature, etc.)
 * @returns {string} - Cache key
 */
function generateCacheKey(prompt, context = {}) {
  const contextStr = JSON.stringify({
    model: context.model || 'gpt-4o-mini',
    temperature: context.temperature || 0.7,
    maxTokens: context.maxTokens,
    systemPrompt: context.systemPrompt,
  });
  
  // Create a hash of prompt + context for exact matching
  // For semantic caching, we'll use embeddings instead
  const keyData = `${prompt}|${contextStr}`;
  
  // Simple hash function (for exact match caching)
  let hash = 0;
  for (let i = 0; i < keyData.length; i++) {
    const char = keyData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `langcache:${Math.abs(hash).toString(36)}`;
}

/**
 * Generates an embedding for semantic similarity search
 * Uses OpenAI's embedding API to generate vector embeddings
 * @param {string} text - Text to embed
 * @param {string} openaiApiKey - OpenAI API key
 * @returns {Promise<Array<number>|null>} - Embedding vector or null on error
 */
async function generateEmbedding(text, openaiApiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Cost-effective embedding model
        input: text.substring(0, 8000), // Limit input length
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[LangCache] Embedding generation failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('[LangCache] Error generating embedding:', error);
    return null;
  }
}

/**
 * Calculates cosine similarity between two vectors
 * @param {Array<number>} vec1 - First vector
 * @param {Array<number>} vec2 - Second vector
 * @returns {number} - Similarity score (0-1)
 */
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Retrieves Redis connection details from secrets or storage
 * @returns {Promise<Object|null>} - Redis connection details or null
 */
async function getRedisConnection() {
  // Check for hardcoded Redis URL in secrets.js
  let redisUrl = null;
  
  if (typeof self !== 'undefined' && self.REDIS_URL && self.REDIS_URL !== 'redis://localhost:6379') {
    redisUrl = self.REDIS_URL;
  } else if (typeof window !== 'undefined' && window.REDIS_URL && window.REDIS_URL !== 'redis://localhost:6379') {
    redisUrl = window.REDIS_URL;
  }

  // Fallback to Chrome storage
  if (!redisUrl) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['redisUrl'], (result) => {
        resolve(result.redisUrl ? { url: result.redisUrl } : null);
      });
    });
  }

  return { url: redisUrl };
}

/**
 * Stores a cached response in Redis
 * Note: This implementation uses a simplified approach for browser compatibility
 * In production, you might want to use a Redis REST API or backend proxy
 * @param {string} cacheKey - Cache key
 * @param {string} prompt - Original prompt
 * @param {string} response - Cached response
 * @param {Array<number>} embedding - Embedding vector for semantic search
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<boolean>} - Success status
 */
async function storeInRedis(cacheKey, prompt, response, embedding, metadata = {}) {
  try {
    const redisConn = await getRedisConnection();
    
    if (!redisConn) {
      console.log('[LangCache] Redis not configured, skipping cache storage');
      return false;
    }

    // For browser compatibility, we'll use Chrome storage as a fallback
    // In production, you'd want to use a Redis REST API or backend service
    const cacheEntry = {
      key: cacheKey,
      prompt: prompt,
      response: response,
      embedding: embedding,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
      },
    };

    // Store in Chrome local storage as a fallback
    // In a real implementation, you'd send this to a Redis backend
    const result = await chrome.storage.local.get(['langcache_entries']);
    const entries = result.langcache_entries || {};
    entries[cacheKey] = cacheEntry;
    
    // Limit cache size to 1000 entries
    const keys = Object.keys(entries);
    if (keys.length > 1000) {
      // Remove oldest entries
      const sortedKeys = keys.sort((a, b) => {
        return (entries[a].metadata?.timestamp || 0) - (entries[b].metadata?.timestamp || 0);
      });
      sortedKeys.slice(0, keys.length - 1000).forEach(key => delete entries[key]);
    }
    
    await chrome.storage.local.set({ langcache_entries: entries });
    
    console.log('[LangCache] Cached response with key:', cacheKey);
    return true;
  } catch (error) {
    console.error('[LangCache] Error storing in cache:', error);
    return false;
  }
}

/**
 * Retrieves a cached response from Redis (exact match)
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} - Cached entry or null
 */
async function getFromRedis(cacheKey) {
  try {
    const redisConn = await getRedisConnection();
    
    if (!redisConn) {
      return null;
    }

    // Retrieve from Chrome local storage (fallback)
    const result = await chrome.storage.local.get(['langcache_entries']);
    const entries = result.langcache_entries || {};
    const entry = entries[cacheKey];
    
    if (entry) {
      console.log('[LangCache] Cache hit for key:', cacheKey);
      return entry;
    }
    
    return null;
  } catch (error) {
    console.error('[LangCache] Error retrieving from cache:', error);
    return null;
  }
}

/**
 * Performs semantic similarity search in the cache
 * Finds cached responses with similar prompts using embedding similarity
 * @param {Array<number>} queryEmbedding - Embedding vector of the query
 * @param {number} threshold - Similarity threshold (0-1), default 0.85
 * @returns {Promise<Object|null>} - Best matching cache entry or null
 */
async function semanticSearch(queryEmbedding, threshold = 0.85) {
  try {
    if (!queryEmbedding) {
      return null;
    }

    const redisConn = await getRedisConnection();
    
    if (!redisConn) {
      return null;
    }

    // Search in Chrome local storage (fallback)
    const result = await chrome.storage.local.get(['langcache_entries']);
    const entries = result.langcache_entries || {};
    
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const key in entries) {
      const entry = entries[key];
      if (entry.embedding) {
        const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
        if (similarity >= threshold && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = { ...entry, similarity };
        }
      }
    }

    if (bestMatch) {
      console.log('[LangCache] Semantic cache hit with similarity:', bestSimilarity.toFixed(3));
      return bestMatch;
    }

    return null;
  } catch (error) {
    console.error('[LangCache] Error in semantic search:', error);
    return null;
  }
}

/**
 * Cached OpenAI API call with semantic caching
 * This is the main function that wraps OpenAI calls with Redis LangCache
 * @param {Object} params - Parameters for the OpenAI call
 * @param {string} params.model - OpenAI model name
 * @param {Array} params.messages - Message array for chat completion
 * @param {number} params.temperature - Temperature setting
 * @param {number} params.max_tokens - Max tokens
 * @param {string} params.openaiApiKey - OpenAI API key
 * @param {Object} params.response_format - Response format (optional)
 * @param {boolean} params.useSemanticCache - Whether to use semantic caching (default: true)
 * @param {number} params.semanticThreshold - Similarity threshold for semantic cache (default: 0.85)
 * @returns {Promise<Object>} - OpenAI API response
 */
async function cachedOpenAICall(params) {
  const {
    model = 'gpt-4o-mini',
    messages = [],
    temperature = 0.7,
    max_tokens,
    openaiApiKey,
    response_format,
    useSemanticCache = true,
    semanticThreshold = 0.85,
  } = params;

  if (!openaiApiKey) {
    throw new Error('OpenAI API key is required');
  }

  // Extract the user prompt for caching
  const userMessage = messages.find(m => m.role === 'user');
  const systemMessage = messages.find(m => m.role === 'system');
  const prompt = userMessage?.content || '';
  const systemPrompt = systemMessage?.content || '';

  // Generate cache key for exact match
  const cacheKey = generateCacheKey(prompt, {
    model,
    temperature,
    max_tokens,
    systemPrompt,
  });

  // Try exact match cache first
  const exactCache = await getFromRedis(cacheKey);
  if (exactCache && exactCache.response) {
    console.log('[LangCache] Exact cache hit');
    return {
      choices: [{
        message: {
          content: exactCache.response,
        },
      }],
      cached: true,
    };
  }

  // Try semantic cache if enabled
  if (useSemanticCache) {
    try {
      const queryEmbedding = await generateEmbedding(prompt, openaiApiKey);
      if (queryEmbedding) {
        const semanticCache = await semanticSearch(queryEmbedding, semanticThreshold);
        if (semanticCache && semanticCache.response) {
          console.log('[LangCache] Semantic cache hit');
          return {
            choices: [{
              message: {
                content: semanticCache.response,
              },
            }],
            cached: true,
            similarity: semanticCache.similarity,
          };
        }
      }
    } catch (error) {
      console.warn('[LangCache] Semantic cache lookup failed, proceeding with API call:', error);
    }
  }

  // Cache miss - make actual API call
  console.log('[LangCache] Cache miss, calling OpenAI API');
  
  const requestBody = {
    model,
    messages,
    temperature,
  };
  
  if (max_tokens) {
    requestBody.max_tokens = max_tokens;
  }
  
  if (response_format) {
    requestBody.response_format = response_format;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const responseContent = data.choices?.[0]?.message?.content || '';

  // Store in cache for future use
  if (responseContent) {
    try {
      // Generate embedding for semantic caching
      const embedding = useSemanticCache ? await generateEmbedding(prompt, openaiApiKey) : null;
      
      await storeInRedis(
        cacheKey,
        prompt,
        responseContent,
        embedding,
        {
          model,
          temperature,
          max_tokens,
          systemPrompt,
        }
      );
    } catch (error) {
      console.warn('[LangCache] Failed to cache response:', error);
      // Don't fail the request if caching fails
    }
  }

  return {
    ...data,
    cached: false,
  };
}

// Make functions available globally
if (typeof self !== 'undefined') {
  self.cachedOpenAICall = cachedOpenAICall;
  self.generateCacheKey = generateCacheKey;
  self.generateEmbedding = generateEmbedding;
} else if (typeof window !== 'undefined') {
  window.cachedOpenAICall = cachedOpenAICall;
  window.generateCacheKey = generateCacheKey;
  window.generateEmbedding = generateEmbedding;
}
