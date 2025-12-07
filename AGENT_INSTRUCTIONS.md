# Instructions for Coding Agents

## ⚠️ CRITICAL: Read PRD.md First

**Before making ANY code changes, you MUST read [PRD.md](./PRD.md).**

The PRD.md file is the **single source of truth** for this project. It contains:
- All product requirements and design decisions
- Technical constraints and limitations  
- Core functionality specifications
- User preference requirements
- Implementation guidelines

## Quick Reference

### Key Technical Constraints (from PRD):
- ❌ **NO LinkedIn API calls** - All data extraction via DOM parsing only
- ✅ **DOM parsing only** - Extract data from visible page elements
- ✅ **Manifest V3** - Chrome extension using Manifest V3
- ✅ **Desktop only** - Not for mobile browsers
- ✅ **1-on-1 chats only** - Does not work in group chats
- ✅ **Draft insertion only** - Messages are NOT auto-sent, user must review and send manually
- ✅ **OpenAI API** - Called directly from extension (API keys can be hard-coded locally)

### Core Functionality (from PRD):
1. Discover recipient information from chat interface (name, job title, company, connection status)
2. Analyze chat history to understand conversation context
3. Categorize interactions (recruiter, colleague, advice request, meeting request, custom categories)
4. Generate draft messages using OpenAI API with context
5. Insert draft into chat input field (not auto-sent)

### User Preferences (from PRD):
- Message tone (professional, casual, friendly, formal)
- Message length (brief, medium, detailed)
- Greeting/closing style
- Formality level
- Auto-insert behavior (on/off, with preview option)
- Stored in Chrome extension storage

## Development Workflow

1. **Read PRD.md** - Understand all requirements
2. **Check .cursorrules** - Follow agent-specific instructions
3. **Implement per PRD** - Code should match PRD specifications
4. **Respect constraints** - Follow all technical constraints
5. **Reference PRD** - Add comments referencing relevant PRD sections

## Current State

The codebase is in early development. The current code may be placeholder/example code. The PRD describes the target state. When implementing:
- **Follow PRD specifications**, not current code patterns
- **Replace placeholder code** with PRD-compliant implementations
- **Use PRD as source of truth**, not existing code

## Questions?

If requirements are unclear, refer to PRD.md. If PRD.md doesn't answer your question, ask the user for clarification rather than making assumptions.
