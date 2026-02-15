# Claude Code Instructions - MinistryFair

## About This Project
Ministry signup and volunteer management system for Catholic parishes. Allows parishioners to browse ministries, sign up, and volunteer. Includes admin dashboard for ministry leaders to manage signups, events, and volunteers.

## About Me (Chris Treadaway)
Product builder, not a coder. I bring requirements and vision — you handle implementation.

**Working with me:**
- Bias toward action - just do it, don't argue
- Make terminal commands dummy-proof (always start with `cd ~/ministryfair`)
- Minimize questions - make judgment calls and tell me what you chose
- I get interrupted frequently - always end sessions with a handoff note
- Match my writing style: conversational, grounded in experience, uses em-dashes and numbered lists

## Tech Stack
- **Frontend:** HTML, JavaScript, Tailwind CSS
- **Backend:** Google Apps Script + Google Sheets (as database)
- **Auth:** Firebase + Google Sign-In
- **Deployment:** Netlify
- **Data Storage:** Google Sheets with tabs for Ministries, Signups, Events, Tasks, Ministry Leads

## Firebase Setup
I use Firebase + Google Sign-In:
- Firebase project already configured
- Google Auth enabled
- Config in `firebase-config.js` (never commit this file)
- Google Sign-In button in login UI
- Sign-out on logout

## File Paths
- **Always use:** `~/ministryfair/path/to/file`
- **Never use:** `/Users/christreadaway/...`
- **Always start commands with:** `cd ~/ministryfair`

## PII Rules (CRITICAL - I'm Catholic, these are real communities)
❌ NEVER include:
- Real church names → use [Parish Name]
- Staff/volunteer names → use [Staff Name], [Pastor Name]
- Email addresses → use user@example.com
- Phone numbers, addresses
- Children's names
- File paths with /Users/christreadaway → use ~/

✅ ALWAYS use placeholders in square brackets

## Key Features
- Ministry browsing with cards and search
- Signup forms with qualifying questions
- Admin dashboard for ministry leads
- Event creation and volunteer signup
- Task assignment for events
- Google Sign-In authentication
- Mobile-responsive design

## Known Integration
This project merged features from the ministrylife repo:
- Ministry lead dashboard
- Event management
- Task assignments
- All now in one codebase (ministryfair)

## Session End Routine
Before ending EVERY session, provide this:

```markdown
## Session Handoff - [Date]

### What We Built
- [Feature 1]: [files modified]
- [Feature 2]: [files modified]

### Current Status
✅ Working: [what's tested and works]
❌ Broken: [known issues]
🚧 In Progress: [incomplete features]

### Files Changed
- path/to/file1.js
- path/to/file2.html

### Current Branch
Branch: [branch-name]
Ready to merge: [Yes/No]

### Next Steps
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]
```

## Git Branch Strategy
- Claude Code browser creates a new branch every session
- At session end: Tell me if we should merge to main
- If merging:
  ```bash
  cd ~/ministryfair
  git checkout main
  git merge [feature-branch]
  git push origin main
  git branch -d [feature-branch]
  ```
- Delete merged branches immediately to keep repo clean

## Testing Approach
- Test incrementally, not after hours of work
- Give me exact terminal commands to run on my Mac
- Don't assume dependencies are installed - tell me what to install
- Flag any assumptions ("This assumes Firebase is configured")

## Deployment
- Hosted on Netlify
- Domain: [configured in Netlify]
- Deploy from main branch
- Build command: (none - static site)
- Publish directory: `.` (root)

## Common Issues
- **Google Sheets API quota**: Limited to 100 requests/100 seconds
- **localStorage config**: Admin setup wizard checks `setupComplete` flag
- **Branch confusion**: I often don't know what branch I'm on - always tell me
- **Firebase config**: Never commit firebase-config.js - it's in .gitignore

## Project-Specific Context
- Started Jan 29, 2025
- Heavy development through Feb 14
- Multiple feature branches merged (Firebase auth, profile photos, admin features)
- Currently live and being tested
- Real users at [Parish Name] are using this

---
Last Updated: February 15, 2026
