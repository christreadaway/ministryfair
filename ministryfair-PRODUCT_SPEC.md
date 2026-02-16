# Ministry Fair - Product Specification

**Repository:** `ministryfair`  
**Filename:** `ministryfair-PRODUCT_SPEC.md`  
**Last Updated:** 2026-02-16 at 15:10 UTC

---

## What This Is

**Ministry Fair** - Catholic ministry signup system for parish events

## Who It's For

**Primary Users:** Parish staff, ministry leaders, parishioners

## Tech Stack

HTML/CSS/JavaScript, Google Sheets backend, Netlify deployment

---

## Core Features

The following features have been implemented based on development sessions:

1. * Firebase SDK - Added Firebase Auth scripts
2. * No Google Auth implemented - The app uses a simple local registration form (name, email, phone) stored in localStorage
3. - Added Google Sign-In to the post-deployment checklist
4. - Added content moderation to enrichment prompts
5. - Added escapeHtml() utility, applied to every innerHTML insertion
6. - Added netlify.toml and DEPLOY.md to the Files table
7. - App Signups tab â€” has test data from January, so the Apps Script backend is already deployed
8. - Signups in one "App Signups" audit log tab with built-in filtering by ministry for leader views
9. - Tags column (K) added to the Ministries sheet in google-apps-script.js -- comma-separated values like liturgy, service
10. 1. Created SECURITY.md (your security guide)
11. 2. Added .gitignore (prevents future accidents)
12. 2. Google Apps Script URL â€” You still need to set the apiUrl in the CONFIG to your deployed Apps Script URL before the app will fetch real ministry data
13. 3. Updated README.md (added security section)
14. Added a clear explanation that this app doesn't need Google Cloud API keys - just a Google Apps Script URL (which is safe to share).
15. Added comments explaining that the Google Apps Script URL is SAFE to put in your code.
16. All done and pushed. Here's a summary of what was implemented:
17. All done. Here's a summary of everything implemented:
18. All done. Here's what was created and updated:
19. Check the SECURITY.md file I created - it has step-by-step instructions
20. Claude: Created Ministry Fair HTML webpage with responsive design
21. Claude: Got it â€” go get some sleep. I'll do a thorough review of every branch, figure out what features you built across all sessions, and make sure nothing is missing from main.
22. Claude: The user wants the admin and ministry leader features built out instead of just "Coming soon" alerts. Let me build those views.
23. Claude: [Built comprehensive GAS proxy implementation]
24. Claude: [Implemented PDF upload and AI configuration]
25. Claude: [Implemented QR code generation with print layout]

---

## Technical Implementation

Key technical details from implementation:

- - Tags are parsed and sent to the frontend as arrays
- - Frontend auto-infers tags from ministry descriptions when not provided, so it works even without explicit tags in the sheet
- - google-apps-script.js -- Google Sheets backend with tags support
- 4. Now when any volunteer uses "Tell Us In Your Own Words", the AI receives the ministry list + PDF context + the volunteer's text, and returns personalized suggestions
- Parish Ministry Fair App - a single-page web application that digitizes ministry signup workflows for parishes. Vanilla JavaScript with no build step, using Google Apps Script as serverless backend.
- What this project is: Single-page web app for parish ministry fair signups. No build step - single index.html file (6,485 lines) with Google Apps Script backend.
- Yes, sorry for the delay! I've finished exploring the codebase and read the Google Apps Script backend. Let me now read the main index.html and then get to building.
- * No Google Auth implemented - The app uses a simple local registration form (name, email, phone) stored in localStorage
- Currently the app uses a manual registration form (first name, last name, email, phone) saved to localStorage - there's no Google Sign-In integration.
- - GAS backend validates admin auth before writes
- - Google Sheets + Apps Script backend setup
- - Update instructions â€” separate steps for updating the frontend (index.html via Netlify) vs the backend (google-apps-script.js via Apps Script editor)
- - Recent session history â€” documents what was changed across PRs #1-3 (backend connection, Google Sign-In, Sign-In button fix) and the test suite branch
- That's it. The backend (Google Apps Script) is already deployed and the apiUrl is set in CONFIG, so you just need to get the latest index.html onto Netlify.
- [Created comprehensive test infrastructure with 8 test suites covering formatPhoneNumber, backendLogic, edgeCases, registration, ministryRendering, localStorage, XSS, and deepLinking]
- backendLogic | 22 | doPost/doGet, question parsing, helpers
- - Email de-duplication now uses headers.indexOf('Email') instead of hardcoded column 4
- 1. Server-side proxy (most secure) - API key lives on backend
- 2. Set up the Google Sheets backend (create sheet, add Apps Script, deploy as web app, update index.html with URL)
- - App Signups tab â€” has test data from January, so the Apps Script backend is already deployed

---

## Architecture & Design Decisions

Key decisions made during development:

- Want me to start thinking about that split, or is the current single-app approach working for what you need?
- Explored ministrylife codebase structure and architecture
- [Explored ministryfair codebase structure and architecture]
- Great product thinking. Yes, all of that is doable. Here's the approach:
- Claude: Yes, the architecture keeps PII on the church's own infrastructure:
- Let me start by exploring the codebase to understand the current architecture before planning the implementation.
- [Explored codebase structure and analyzed project architecture comprehensively]
- Explored ministry fair codebase structure and architecture
- Claude: The pattern you want is a server-side proxy where the API key lives on the server and the browser never touches it. For your architecture, use Google Apps Script as the proxy:


---

## Development History

Full session-by-session development history is maintained in `SESSION_NOTES.md`.

This specification is automatically updated alongside session notes to reflect:
- New features implemented
- Technical decisions made
- Architecture changes
- Integration updates

---

## Updating This Spec

At the end of each Claude Code session, this spec is updated automatically when you say:
> "Append session notes to SESSION_NOTES.md"

Claude will:
1. Update `SESSION_NOTES.md` with detailed session history
2. Update `ministryfair-PRODUCT_SPEC.md` with new features/decisions
3. Commit both files together

**Never manually edit this file** - it's maintained automatically from session notes.

