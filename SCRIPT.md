# Linky Demo Script - Hackathon Presentation

**Target Duration: 1-2 minutes**

---

## Opening (10 seconds)

> "Hi judges! I'm presenting **Linky** - a Chrome extension that solves a real problem many of us face: the anxiety of crafting the perfect LinkedIn message. Whether it's responding to a recruiter, reaching out to a colleague, or asking for advice, we often spend too much time overthinking our messages."

---

## Problem Statement (15 seconds)

> "Linky automatically generates contextually appropriate message drafts by analyzing your LinkedIn conversations. It extracts recipient information, reads chat history, categorizes the interaction type, and creates personalized drafts that you can edit and send - saving time and reducing messaging anxiety."

---

## Demo Flow (60-75 seconds)

### Step 1: Show Extension Icon & Settings (10 seconds)
**Action:** Click the extension icon in Chrome toolbar
**Say:** 
> "First, let me show you the preferences panel where users can customize their message style - tone, length, formality level - for different interaction types like recruiter messages, colleague chats, or advice requests."

**Action:** Briefly show the preferences UI, then navigate to LinkedIn

### Step 2: Navigate to LinkedIn Chat (5 seconds)
**Action:** Open LinkedIn and navigate to a chat conversation
**Say:**
> "Now, let's see Linky in action on an actual LinkedIn conversation."

### Step 3: Demonstrate Auto-Draft Generation (30-40 seconds)
**Action:** Open a LinkedIn chat (preferably one with some message history)
**Say:**
> "When I open this chat, Linky automatically:
> - Extracts the recipient's information from the chat interface
> - Analyzes the conversation history to understand the context
> - Categorizes this as a [recruiter/colleague/advice request] interaction
> - And generates a contextually appropriate draft message"

**Action:** Show the draft appearing in the message input field
**Say:**
> "The draft is automatically inserted into the message field - but notice it's NOT sent automatically. Users can review, edit, and send when they're ready. This gives them a starting point without the pressure of a blank message box."

### Step 4: Show Different Interaction Types (15-20 seconds)
**Action:** (If time permits) Open a different type of conversation
**Say:**
> "Linky adapts to different scenarios. For example, a recruiter message gets a professional, brief response, while a colleague chat might be more casual and friendly - all based on the user's preferences."

---

## Closing (10-15 seconds)

> "Linky uses AI to understand context and user preferences, making LinkedIn messaging faster and less stressful. It's built with Manifest V3, uses DOM parsing instead of API calls, and respects user privacy by storing everything locally. Thank you!"

---

## Key Points to Emphasize

1. **Problem-Solution Fit**: Addresses real anxiety around LinkedIn messaging
2. **Smart Context Awareness**: Extracts info, analyzes history, categorizes interactions
3. **User Control**: Drafts are inserted but NOT auto-sent - users review and edit
4. **Customizable**: Preferences per interaction type
5. **Privacy-Focused**: No LinkedIn API, local storage, DOM parsing only
6. **Technical**: Manifest V3, Chrome extension, AI-powered

---

## Tips for Live Demo

- **Prepare test conversations**: Have 2-3 LinkedIn chats ready (different types: recruiter, colleague, advice request)
- **Practice timing**: Rehearse to stay within 1-2 minutes
- **Have backup screenshots**: In case of technical issues, show screenshots of the extension in action
- **Highlight the "magic moment"**: The auto-insert of the draft message is the key visual moment
- **Keep it conversational**: Speak naturally, don't rush through the script
- **Show, don't tell**: Let the demo speak for itself when possible

---

## Troubleshooting Notes

If the extension doesn't work during demo:
- Have screenshots/video ready as backup
- Explain the technical implementation instead
- Focus on the problem-solution fit and user value

---

## Optional: Extended Version (if judges ask questions)

**Technical Details:**
- Built with Manifest V3 Chrome Extension
- Uses OpenAI API for message generation
- DOM parsing for data extraction (no LinkedIn API needed)
- Local storage for user preferences
- Works on desktop Chrome only

**Future Enhancements:**
- Support for more interaction categories
- Learning from user edits to improve suggestions
- Integration with other professional platforms
