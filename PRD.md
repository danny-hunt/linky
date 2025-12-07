# Product Requirements Document: Linky

## Overview

Linky is a Chrome extension that helps socially awkward LinkedIn users by automatically generating message drafts based on conversation context and user preferences. The extension reduces messaging friction by inserting ready-to-edit drafts into LinkedIn chat windows.

## Core Functionality

When a LinkedIn chat interface is detected, the extension:

1. **Discovers recipient information**: Extracts visible profile data from the chat interface (name, job title, company, connection status, mutual connections). No LinkedIn API calls are made.

2. **Analyzes chat history**: Reads visible message history to understand conversation context and categorizes the interaction type.

3. **Categorizes interactions**: Classifies conversations into categories including:
   - Recruiter inbound
   - Colleague/friend
   - Inbound advice request
   - Inbound meeting request
   - Other user-defined categories

4. **Generates draft message**: Creates a contextually appropriate draft using:
   - Discovered recipient information
   - Chat history context
   - Interaction category
   - User-configured preferences (tone, style, length, formality)

5. **Inserts draft**: Places the draft text into the chat input field. The message is **not sent automatically** - users must manually review, edit, and send.

## User Preferences

Users configure preferences for each interaction category:
- Message tone (professional, casual, friendly, formal)
- Message length (brief, medium, detailed)
- Greeting/closing style
- Formality level
- Auto-insert behavior (on/off, with preview option)

Preferences are stored locally in Chrome extension storage.

## Technical Constraints

- **No LinkedIn API calls**: All data extraction via DOM parsing
- **No interface control**: Only inserts text into input fields, does not manipulate other UI elements
- **Local processing only**: All data stays on device, no external API calls
- **Chrome Extension**: Built using Manifest V3 with content scripts

## Questions

1. How should draft generation work without external APIs? (Template-based, rule-based, or local AI model?)
2. Should the extension work in group conversations or only 1-on-1 chats?
3. What happens if chat history is empty (new conversation)?
4. Should users be able to customize or add new interaction categories?
5. How should the extension handle LinkedIn UI updates that break DOM selectors?
6. Should there be a way to preview/regenerate drafts before insertion?
7. What's the fallback behavior if categorization is unclear or context is insufficient?
8. Should the extension work on LinkedIn's mobile web interface or desktop only?
