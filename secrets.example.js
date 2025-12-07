/**
 * Secrets Configuration Template
 * 
 * Copy this file to secrets.js and add your actual API keys.
 * secrets.js is gitignored and will not be committed to the repository.
 * 
 * Usage:
 * 1. Copy this file: cp secrets.example.js secrets.js
 * 2. Add your actual API keys to secrets.js
 * 3. secrets.js will be loaded automatically by the extension
 */

// OpenAI API Key
// Get your API key from: https://platform.openai.com/api-keys
const OPENAI_API_KEY = 'your-openai-api-key-here';

// Google API credentials (optional, for research functionality)
// Get your credentials from: https://console.cloud.google.com/apis/credentials
const GOOGLE_API_KEY = 'your-google-api-key-here';
const GOOGLE_SEARCH_ENGINE_ID = 'your-google-search-engine-id-here';

// Redis connection details for LangCache
// For Redis Cloud or self-hosted Redis, provide connection details
// Format: redis://[username]:[password]@[host]:[port] or redis://[host]:[port]
// Example: redis://default:password@redis.example.com:6379
// Example: redis://localhost:6379 (for local Redis without auth)
const REDIS_URL = 'redis://localhost:6379';
// Alternative: Provide separate connection details
// const REDIS_HOST = 'localhost';
// const REDIS_PORT = 6379;
// const REDIS_PASSWORD = 'your-redis-password-here';
// const REDIS_USERNAME = 'default'; // Optional, for Redis 6+ ACL

// Make secrets available globally
// This will be loaded before research.js and content.js
if (typeof self !== 'undefined') {
  self.OPENAI_API_KEY = OPENAI_API_KEY;
  self.GOOGLE_API_KEY = GOOGLE_API_KEY;
  self.GOOGLE_SEARCH_ENGINE_ID = GOOGLE_SEARCH_ENGINE_ID;
  self.REDIS_URL = REDIS_URL;
} else if (typeof window !== 'undefined') {
  window.OPENAI_API_KEY = OPENAI_API_KEY;
  window.GOOGLE_API_KEY = GOOGLE_API_KEY;
  window.GOOGLE_SEARCH_ENGINE_ID = GOOGLE_SEARCH_ENGINE_ID;
  window.REDIS_URL = REDIS_URL;
}
