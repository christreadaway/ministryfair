# Parish Ministry Fair App — Business Product Spec
**Version:** 6.1 | **Date:** 2026-02-16 | **Repo:** github.com/christreadaway/ministryfair

---

## 1. Problem Statement
Catholic parishes run ministry fairs once or twice a year to recruit volunteers. The process is entirely analog — paper signup sheets at folding tables, handwritten rosters, and no follow-up system. Ministry leaders lose signups, can't track interest over time, and have no way to match parishioners to ministries that fit their skills and availability. New parishioners feel overwhelmed by 30+ tables and often leave without signing up for anything.

## 2. Solution
A single-page web application that digitizes the entire ministry fair experience — from volunteer discovery and signup to ministry leader management and admin oversight. Parishioners scan a QR code or visit a URL, answer a few questions or describe their interests in free text, and get AI-matched to relevant ministries. Ministry leaders see real-time signups and can send follow-up questionnaires. Admins configure everything through a setup wizard.

## 3. Target Users
- **Parishioners / Volunteers** — Browse ministries, get AI-matched, sign up with one tap
- **Ministry Leaders** — View signups for their ministry, send follow-up questionnaires, manage rosters
- **Parish Administrators** — Full system configuration, AI provider setup, QR code generation, signup analytics
- **Super Admins** — Manage site admins, approve roles, oversee multi-parish deployments

## 4. Core Features

### Volunteer Experience
- **AI-Powered Matching** — Parishioner describes interests in free text; AI (Anthropic or OpenAI) maps to relevant ministries using the parish's ministry book PDF as context
- **Preference-Based Suggestions** — Tag-matching system for structured preference selection
- **Browse All Ministries** — Full catalog with search, descriptions, and icons
- **QR Code Quick Signup** — Scan at a table → see ministry details → one-tap signup (no choice screen)
- **Returning User Recognition** — Google sign-in remembers returning volunteers

### Ministry Leader Tools
- **My Ministry Signups** — Filtered view of all signups for their assigned ministry
- **Follow-Up Questionnaires** — Configurable 3-question rounds (max 3 per round, multiple rounds supported) with shareable links
- **Follow-Up Response Collection** — Responses saved to dedicated Google Sheets tab

### Admin Dashboard
- **Setup Wizard** — 5-step onboarding: platform selection (Google Sheets or Microsoft 365), org details, spreadsheet connection, admin assignment, review & launch
- **Google Sheet Scanner** — Scans all tabs, scores each for ministry-like content, admin selects the best match
- **Ministry Enrichment** — Import PDF booklets or supplemental spreadsheets; AI extracts descriptions, times, locations with fuzzy matching
- **Auto Icon Assignment** — AI assigns appropriate emoji icons to each ministry based on description
- **Physical Signup Integration** — Upload CSV/image files; AI (Claude Vision) parses handwritten sheets; editable review table before bulk import
- **Manual Entry Fallback** — Single-entry form for one-off additions
- **QR Code Generator** — Printable 6-per-sheet layout with dashed cut guides, checkbox selection for any/all ministries
- **All Signups View** — Cross-ministry signup activity with color-coded action tags and filtering
- **Role-Based Access** — Automatic role detection via email domain; role picker for users with multiple roles

### Platform & Authentication
- **Google Sign-In** via Firebase Authentication
- **Domain-Based Role Detection** — Email domain matches trigger admin/leader role offers
- **Multi-Platform Backend** — Google Sheets (production) and Microsoft 365 (preview) support
- **Church Gate View** — Domain recognition routes new vs. returning organizations

## 5. Tech Stack
- **Frontend:** Vanilla JavaScript, single index.html (~6,500 lines), no build step
- **Backend:** Google Apps Script (serverless), deployed as Web App
- **Auth:** Firebase Authentication (Google Sign-In)
- **Data:** Google Sheets (primary), Microsoft 365/Excel (preview)
- **AI:** Anthropic Claude or OpenAI (admin-configurable), Claude Vision for image parsing
- **Hosting:** Netlify (static site), live at ministry.st-theresa.org
- **Libraries:** PDF.js (client-side PDF extraction), QRCode.js

## 6. Data & Privacy
- All PII stays on the church's own Google Sheets infrastructure
- Image data for signup sheet parsing goes direct to AI API via GAS proxy — not persisted in app
- GAS backend validates admin auth before any writes
- API keys stored in browser localStorage (admin-only)
- No server-side PII storage

## 7. Current Status
- **Deployed:** Live on Netlify at ministry.st-theresa.org
- **Tests:** 192 tests passing across 9 test suites
- **Branch:** Main branch is production; feature branches merged via PR
- **Known Issues:** Need to merge physical signup + follow-up feature branch; Apps Script redeployment needed after each backend change

## 8. Business Model
- **Phase 1:** Free tool for St. Theresa parish (dogfooding)
- **Phase 2:** Multi-parish SaaS — each parish sets up via wizard, connects own spreadsheet
- **Freemium consideration:** Basic keyword matching free; AI features require admin-provided API key (or future hosted tier)

## 9. Success Metrics
- Signups captured digitally vs. paper at ministry fair events
- Ministry leader follow-up completion rate
- Time from signup to first ministry leader contact
- Number of parishes onboarded through setup wizard

## 10. Open Questions / Next Steps
- Microsoft 365 backend completion (currently "Preview" status)
- Hosted AI tier vs. BYOK (bring your own key) model for scaling
- Multi-language support for Hispanic parishes
- Integration with ministrylife admin features (originally separate repo, now consolidated)
- Push notification or email follow-up automation
