# Linky - LinkedIn Chrome Extension

> **⚠️ IMPORTANT:** Read [PRD.md](./PRD.md) before making any changes. It contains all design decisions, requirements, and technical constraints.

A Chrome extension that automatically generates LinkedIn message drafts based on conversation context and user preferences.

## Features

- Generates message drafts from conversation context
- Extracts recipient information and analyzes chat history
- Categorizes interactions (recruiter, colleague, advice request, etc.)
- Customizable preferences per interaction category
- Inserts ready-to-edit drafts (not auto-sent)

## Installation

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

## Usage

1. Navigate to LinkedIn
2. Click the extension icon to open settings
3. Enter your name and save

## Development

### Setup

1. Read [PRD.md](./PRD.md) for requirements and constraints
2. Configure API keys in `secrets.js` (see below)

### API Keys

**OpenAI (Required):**
- Copy `secrets.example.js` to `secrets.js` (if needed)
- Replace `'your-openai-api-key-here'` with your API key from https://platform.openai.com/api-keys

**Redis LangCache (Optional):**
- Configure `LANGCACHE_URL`, `LANGCACHE_API_KEY`, and `LANGCACHE_ID` in `secrets.js`
- Add LangCache domain to `manifest.json` `host_permissions` (e.g., `"https://langcache.example.com/*"`)

**Note:** `secrets.js` is gitignored. The extension checks `secrets.js` first, then Chrome storage.

### Key Files

- `PRD.md` - **Product Requirements (READ FIRST)**
- `manifest.json` - Extension configuration
- `content.js` - Main LinkedIn page script
- `popup.js/html/css` - Settings UI
- `background.js` - Service worker
- `research.js` - Recipient context gathering
- `secrets.js` - Local API keys (gitignored)

## For Coding Agents

1. Read `PRD.md` first - it's the source of truth
2. Check `AGENT_INSTRUCTIONS.md` for quick reference
3. Follow `.cursorrules` for Cursor-specific guidance
4. Respect all PRD technical constraints (no LinkedIn API, DOM parsing only, Manifest V3)
