# LinkedIn Chrome Extension

A Chrome extension that works on the LinkedIn website with a settings menu.

## Features

- Displays a "Hello World" greeting banner on LinkedIn pages
- Settings popup to customize your name
- Persists settings using Chrome storage

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

### File Structure

- `manifest.json` - Extension configuration
- `popup.html` - Settings menu UI
- `popup.js` - Settings menu logic
- `popup.css` - Settings menu styles
- `content.js` - Script that runs on LinkedIn pages
- `content.css` - Styles for the content script
- `background.js` - Background service worker

### Icons

The extension references icon files (`icon16.png`, `icon48.png`, `icon128.png`). You'll need to add these icons for the extension to work properly. You can create simple placeholder icons or use any 16x16, 48x48, and 128x128 pixel images.

## Future Enhancements

- Expand the settings menu with additional options
- Add more features that interact with LinkedIn content
