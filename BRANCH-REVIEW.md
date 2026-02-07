# Branch Review Report

This document summarizes the review of all feature branches created across multiple Claude Code sessions. The goal was to ensure no features were lost when consolidating everything into `main`.

## Current State of `main`

After merging `comprehensive-testing`, `main` contains:

- Setup wizard (`#/start`) for first-time admin configuration
- Admin roles and settings page (`#/settings`)
- Light/dark mode with floating toggle
- AI-powered spreadsheet intake (CSV/TSV import with Claude column mapping)
- Auto-detection of church domains via AI
- Server-side Claude API key storage via Google Apps Script proxy
- Google Sign-In for both parishioners and admins
- Top navigation bar with role badges
- Color theme picker with live preview
- Notification email templates
- 129 automated tests across 8 test suites
- 42+ bug fixes (XSS prevention, localStorage crashes, phone formatting, JWT decoding, etc.)
- Full ministry signup flow with qualifying questions
- Deep linking via `?m=ministry-id`
- Search across ministry name, description, and organizer

## What Was Added From Other Branches

These files were cherry-picked from other branches into `main`:

| File | Source Branch | Purpose |
|------|-------------|---------|
| `netlify.toml` | add-netlify-deployment-docs | Security headers, SPA routing, cache control |
| `SECURITY.md` | fix-exposed-api-key | Security documentation for handling API key alerts |
| `.gitignore` (expanded) | fix-exposed-api-key | Prevents accidental commits of secrets, env files, OS/IDE files |

## Bugs Found and Fixed

| Severity | Issue | Fix |
|----------|-------|-----|
| **HIGH** | Default `setupComplete: false` means every visitor sees the admin setup wizard instead of ministries | Set `setupComplete: true` and pre-filled St. Theresa config in DEFAULT_CONFIG |

## Features That Exist ONLY in Other Branches (Not in Main)

These features were built in other sessions but take a fundamentally different approach from what's in `main`. They can't be merged automatically — they'd need to be manually integrated as future enhancements.

### From `add-involvement-preferences` (Feb 5)

- **Involvement preference cards**: Users select categories (liturgy, service, socializing, etc.) and get matched to ministries by tags
- **AI-powered free-text suggestions**: User describes interests in plain English, AI matches them to ministries
- **Ministry tags**: Column K in the spreadsheet for tagging ministries with categories
- **QR code generation**: Generate and print QR codes for each ministry table (6-per-page layout)
- **Quick signup flow**: Streamlined registration for users arriving via QR code scan
- **Signup tracking views**: "My Signups" for volunteers, "All Signups" for admins
- **PDF bulletin upload**: Upload a parish bulletin PDF, extract text, feed to AI for suggestions
- **Firebase Auth**: Uses Firebase instead of Google Identity Services (different auth approach)

### From `add-admin-signin` (Feb 6)

- **Staff sign-in page** (`?admin` URL): Separate Google Sign-In for admins/leaders
- **Full admin dashboard**: Tabbed interface with searchable signups table, CSV export
- **Ministry CRUD from dashboard**: Add, edit, delete ministries without touching the spreadsheet
- **Ministry leader dashboard**: Filtered view showing only signups for their ministries
- **Server-side role verification**: `verifyUser` endpoint returns role (admin/leader/none)
- **Admins sheet**: New spreadsheet tab as single source of truth for admin access
- **User management UI**: Add/remove admin emails from the dashboard

### From `google-profile-picture-icon` (Feb 6)

- **Google profile photo**: Display user's Google profile picture (44px circle) instead of initials

### From `setup-firebase-config` (Feb 5)

- **`firebase-config.js`**: Standalone Firebase Auth module with email/password, Google popup sign-in, password reset
- (Redundant if involvement-preferences is integrated)

## Branches Safe to Delete

| Branch | Reason |
|--------|--------|
| `claude/deploy-ministry-subdomain-HptGF` | Our current session's work branch — merged |
| `claude/comprehensive-testing-QluT4` | Already merged into main via PR #4 |
| `claude/google-signin-admin-setup-DqGcq` | Was merged INTO comprehensive-testing before it was merged to main |
| `claude/setup-firebase-config-qtdjp` | Fully subsumed by add-involvement-preferences |

## Branches to Keep (for future reference)

| Branch | Reason |
|--------|--------|
| `claude/add-involvement-preferences-Yry5D` | Contains unique involvement preference UI, QR codes, AI suggestions |
| `claude/add-admin-signin-ElS8A` | Contains unique admin dashboard, ministry CRUD, leader views |
| `claude/google-profile-picture-icon-pPpiE` | Contains profile photo feature |
| `claude/add-netlify-deployment-docs-bZVE6` | netlify.toml already cherry-picked, but has expanded DEPLOY.md |
| `claude/fix-exposed-api-key-zGPEK` | SECURITY.md and .gitignore already cherry-picked |

## Recommended Next Steps

1. **Merge this PR** to get the bug fix (setupComplete) and new files live
2. **Test the live site** at ministry.st-theresa.org — should show all 26 ministries
3. **Future enhancements** can be built on top of current main using the other branches as reference:
   - QR code generation (from involvement-preferences)
   - Admin dashboard with ministry CRUD (from admin-signin)
   - Profile photos (from google-profile-picture-icon)
