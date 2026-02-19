# Claude Code Instructions - MinistryFair

## About This Project
Parish ministry signup system for Catholic churches. Parishioners scan QR codes at ministry fair tables, browse ministries, and sign up. Includes admin setup wizard, ministry leader views, Google Sign-In with Firebase auth, and Google Sheets backend. Live on Netlify.

## About Me (Chris Treadaway)
Product builder, not a coder. MBA, 25 years in product dev. I bring requirements and vision — you handle implementation.

**Working with me:**
- Bias toward action — just do it, don't argue
- Make terminal commands dummy-proof (always start with `cd ~/ministryfair`)
- Minimize questions — make judgment calls and tell me what you chose
- I get interrupted frequently — always end sessions with clear handoff
- Match my writing style: conversational, direct, uses em-dashes and numbered lists

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (single-page app)
- **Backend:** Google Apps Script
- **Database:** Google Sheets (tabs: Ministries, Signups, Roles)
- **Auth:** Firebase + Google Sign-In
- **Hosting:** Netlify (deploy from main branch, static site)
- **QR Codes:** Generated via api.qrserver.com

## File Paths
- **Always use:** `~/ministryfair/`
- **Never use:** `/Users/christreadaway/...`
- **Always start commands with:** `cd ~/ministryfair`

## PII Rules (CRITICAL — Real parish data)
❌ NEVER include: real church names → use [Parish Name], staff names → [Staff Name], volunteer names → [Volunteer Name], email addresses → user@example.com, phone numbers, addresses, file paths with /Users/christreadaway → use ~/
✅ ALWAYS use placeholders in square brackets

## Key Features
- **Parishioner Flow:** QR scan → browse ministries → sign up → confirmation
- **Ministry Discovery:** Three paths — quiz suggestions, full browse, free-text matching with keyword-to-tag engine
- **Admin Setup:** /start route → Google Sign-In → domain match check → Google Sheet config wizard
- **Ministry Leader View:** See signups, manage events, get QR codes
- **QR Code Export:** Print 6 per page (2×3 grid) with ministry name and URL
- **Tags System:** Column K in Ministries sheet, auto-inferred from descriptions when not set

## Deployment
- Hosted on Netlify
- `_redirects` file handles SPA routing (serves index.html for all paths)
- Path-to-hash normalization rewrites /start to /#/start
- Deploy from main branch, no build step

## Integration Note
Features from the ministrylife repo were merged into this repo (Feb 2025). This is the unified codebase for both parishioner-facing and admin/leader features.

## Git Branch Strategy
- Claude Code creates a new branch per session
- At session end: tell me if we should merge to main
- Delete merged branches immediately

## Common Issues
- **Google Sheets API quota:** Limited to 100 requests/100 seconds
- **localStorage config:** Admin setup wizard checks `setupComplete` flag
- **Branch confusion:** I often don't know what branch I'm on — always tell me
- **Firebase config:** Never commit firebase-config.js — it's in .gitignore
- **Netlify SPA routing:** Needs `_redirects` file, otherwise deep links 404

## Session End Routine

At the end of EVERY session — or when I say "end session" — do ALL of the following:

### A. Update SESSION_NOTES.md
Append a detailed entry at the TOP of SESSION_NOTES.md (most recent first) with: What We Built, Technical Details, Current Status (✅/❌/🚧), Branch Info, Decisions Made, Next Steps, Questions/Blockers.

### B. Update PROJECT_STATUS.md
Overwrite PROJECT_STATUS.md with the CURRENT state of the project — progress %, what's working, what's broken, what's in progress, next steps, last session date/summary. This is a snapshot, not a log.

### C. Commit Both Files
```
git add SESSION_NOTES.md PROJECT_STATUS.md
git commit -m "Session end: [brief description of what was done]"
git push
```

### D. Tell the User
- What branch you're on
- Whether it's ready to merge to main (and if not, why)
- Top 3 next steps for the next session

---
Last Updated: February 16, 2026


## Branch Rules
Always work on the main branch. Do not create new branches unless explicitly asked. Commit and push all changes directly to main.

