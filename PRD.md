# Product Requirements Document: Linky

> **⚠️ FOR CODING AGENTS:** This document is the **single source of truth** for all design decisions and requirements. Always read this entire document before making any code changes. See also [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) and [.cursorrules](./.cursorrules) for agent-specific guidance.

## Overview

Linky is a Chrome extension that helps socially awkward LinkedIn users by automatically generating message drafts based on conversation context and user preferences. The extension reduces messaging friction by inserting ready-to-edit drafts into LinkedIn chat windows.

## Core Functionality

When a LinkedIn chat interface is detected, the extension:

1. **Discovers recipient information**: Extracts visible profile data from the chat interface (name, job title, company, connection status, mutual connections). No LinkedIn API calls are made.

2. **Analyzes chat history**: Reads visible message history to understand conversation context and categorizes the interaction type. If chat history is empty (new conversation), generates a draft introduction message using recipient information and user preferences as context.

3. **Categorizes interactions**: Classifies conversations into categories including:
   - Recruiter inbound (default with placeholders)
   - Colleague/friend
   - Inbound advice request
   - Inbound meeting request
   - Other user-defined categories (users can customize and add new categories)

4. **Generates draft message**: Creates a contextually appropriate draft using:
   - Discovered recipient information
   - Chat history context
   - Interaction category
   - User-configured preferences (tone, style, length, formality)
   - If categorization is unclear or context is insufficient, attempts to draft the best possible message with available information

5. **Inserts draft**: Places the draft text into the chat input field immediately upon generation (no preview or regeneration step). The message is **not sent automatically** - users must manually review, edit, and send.

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
- **Draft generation**: Uses OpenAI API called directly from the extension (API keys can be hard-coded in the local client)
- **Desktop only**: Chrome browser extension for desktop browsers only
- **1-on-1 chats only**: Extension works only in individual conversations, not group chats
- **LinkedIn UI stability**: Uses selectors that work across different sessions; not designed to handle future LinkedIn UI updates
- **Chrome Extension**: Built using Manifest V3 with content scripts

