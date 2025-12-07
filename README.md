# Linky - LinkedIn Chrome Extension

> **⚠️ IMPORTANT FOR DEVELOPERS AND AGENTS:** 
> **Before making any changes, read [PRD.md](./PRD.md) first!** 
> The PRD contains all design decisions, requirements, and technical constraints. It is the source of truth for this project.

A Chrome extension that helps socially awkward LinkedIn users by automatically generating message drafts based on conversation context and user preferences.

## 📋 Product Requirements

**All development must follow the [Product Requirements Document (PRD.md)](./PRD.md).**

The PRD specifies:
- Core functionality and features
- Technical constraints (no LinkedIn API, DOM parsing only, etc.)
- User preferences and configuration
- Interaction categories and message generation logic
- Implementation guidelines

## Features

- Automatically generates LinkedIn message drafts based on conversation context
- Extracts recipient information from chat interface
- Analyzes chat history to understand conversation context
- Categorizes interactions (recruiter, colleague, advice request, etc.)
- Customizable user preferences per interaction category
- Inserts ready-to-edit drafts (not auto-sent)

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select this directory
5. The extension will now be active on LinkedIn pages

## Usage

1. Navigate to any LinkedIn page (e.g., https://www.linkedin.com)
2. You'll see a greeting banner at the top of the page
3. Click the extension icon in the Chrome toolbar to open the settings menu
4. Enter your name and click "Save"
5. The greeting will update to show your name

## Development

### Getting Started

1. **Read the PRD**: Start by reading [PRD.md](./PRD.md) to understand all requirements
2. **Configure API Keys**: Set up your API keys (see "API Key Configuration" below)
3. **Follow technical constraints**: No LinkedIn API calls, DOM parsing only, Manifest V3
4. **Reference PRD during development**: Check PRD.md for design decisions and requirements

### API Key Configuration

The extension requires an OpenAI API key to generate message drafts. For local development and demos, you can hardcode your API key in `secrets.js` (this file is gitignored and will not be committed).

**Setup Steps:**

1. The `secrets.js` file already exists with placeholder values
2. Open `secrets.js` and replace `'your-openai-api-key-here'` with your actual OpenAI API key
3. Get your API key from: https://platform.openai.com/api-keys

**Redis LangCache Configuration (Optional):**

The extension supports Redis LangCache for semantic caching of message generation. This can significantly reduce API costs by caching semantically similar requests.

**LangCache Setup Steps:**

1. Set up a Redis LangCache instance (see https://redis.io/docs/latest/develop/ai/langcache/)
2. Open `secrets.js` and configure:
   - `LANGCACHE_URL` - Your LangCache endpoint URL (e.g., `https://your-langcache-instance.redis.com`)
   - `LANGCACHE_API_KEY` - Your LangCache API key
   - `LANGCACHE_ID` - Your LangCache instance ID
3. **Important**: Add your LangCache URL domain to `manifest.json` under `host_permissions` for Chrome to allow the requests
   - Example: If your URL is `https://langcache.example.com`, add `"https://langcache.example.com/*"` to the `host_permissions` array

**Security Notes:**

- `secrets.js` is gitignored and will never be committed to the repository
- `secrets.example.js` is a template file that can be safely committed
- The extension will first check `secrets.js` for the API key, then fall back to Chrome storage
- For production use, consider using Chrome storage instead of hardcoded keys
- LangCache credentials are also stored in `secrets.js` and are gitignored

### File Structure

- `PRD.md` - **Product Requirements Document (READ THIS FIRST)**
- `AGENT_INSTRUCTIONS.md` - Quick reference guide for coding agents
- `.cursorrules` - Cursor-specific agent instructions
- `manifest.json` - Extension configuration
- `popup.html` - Settings/preferences UI
- `popup.js` - Settings/preferences logic
- `popup.css` - Settings/preferences styles
- `content.js` - Main script that runs on LinkedIn pages
- `content.css` - Styles for the content script
- `background.js` - Background service worker
- `research.js` - Research API module for gathering recipient context
- `secrets.js` - **Local API keys (gitignored, do not commit)**
- `secrets.example.js` - Template for API key configuration

### Icons

The extension references icon files (`icon16.png`, `icon48.png`, `icon128.png`). You'll need to add these icons for the extension to work properly. You can create simple placeholder icons or use any 16x16, 48x48, and 128x128 pixel images.

## For Coding Agents

**If you are a coding agent (cursor-agent, etc.):**

1. **ALWAYS read PRD.md before making changes** - It's the single source of truth
2. **Read AGENT_INSTRUCTIONS.md** - Quick reference for key requirements
3. **Follow the `.cursorrules` file instructions** - Cursor-specific guidance
4. **Use PRD.md as the source of truth**, not the current codebase state
5. **Respect all technical constraints** specified in the PRD
