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
2. **Follow technical constraints**: No LinkedIn API calls, DOM parsing only, Manifest V3
3. **Reference PRD during development**: Check PRD.md for design decisions and requirements

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

### Icons

The extension references icon files (`icon16.png`, `icon48.png`, `icon128.png`). You'll need to add these icons for the extension to work properly. You can create simple placeholder icons or use any 16x16, 48x48, and 128x128 pixel images.

## For Coding Agents

**If you are a coding agent (cursor-agent, etc.):**

1. **ALWAYS read PRD.md before making changes** - It's the single source of truth
2. **Read AGENT_INSTRUCTIONS.md** - Quick reference for key requirements
3. **Follow the `.cursorrules` file instructions** - Cursor-specific guidance
4. **Use PRD.md as the source of truth**, not the current codebase state
5. **Respect all technical constraints** specified in the PRD
