# Product Spec: Parish Ministry Fair App

**Version:** 5.0
**Last Updated:** February 2026

---

## Product Overview

### Name
Parish Ministry Fair App

### Problem It Solves
Parish ministry fairs traditionally use paper sign-up sheets, which create several problems:
- Illegible handwriting leads to lost contacts
- Paper sheets get lost or damaged
- Ministry leaders must manually transcribe data
- No way to track who's interested in multiple ministries
- Attendees must re-enter their contact info at every table
- No structured follow-up process after the fair

This app digitizes the entire signup-to-follow-up pipeline: parishioners register once and express interest with a single tap, ministry leaders get clean contact lists with custom follow-up questionnaires, and admins can import physical signup sheets via AI-powered parsing.

---

## User Roles

| Role | Access | Identified By |
|------|--------|---------------|
| **Parishioner** | Register, browse ministries, express interest, view my signups, complete follow-up questionnaires | localStorage profile |
| **Ministry Leader** | Everything a parishioner can do, plus: view signups for their ministries, configure follow-up questions for their ministries | `organizerEmail` match in Ministries sheet |
| **Super Admin** | Full access: all admin tabs, manage ministries, manage admins, manual entry, QR codes, settings, follow-up questions for any ministry | Listed in Admins sheet |

---

## User Stories

### Parishioner
> "As a parishioner at the ministry fair, I want to quickly sign up for ministries I'm interested in without writing my contact info over and over, so I can explore more tables and ministry leaders get accurate contact information."

### Ministry Leader
> "As a ministry leader, I want a clean list of interested parishioners with their contact info and any qualifying details, and I want to send follow-up questionnaires to learn about their availability and preferences."

### Parish Staff / Admin
> "As parish staff, I want to manage the fair digitally — set up ministries, import physical signup sheets, identify visitors who want to become parishioners, and give ministry leaders the tools they need for follow-up."

---

## Core User Flows

### Parishioner Flow
```
Scan QR Code or Open Link
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  First Visit?   │─Yes─▶│    Register     │
└────────┬────────┘     │ (or Google SSO) │
         │ No           └────────┬────────┘
         ▼                       ▼
┌─────────────────┐
│ Browse/Search   │
│   Ministries    │
└────────┬────────┘
         ▼
┌─────────────────┐
│  View Details   │
│  + Questions    │
└────────┬────────┘
         ▼
┌─────────────────┐
│Express Interest │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Confirmation   │
│ + Organizer Info│
└────────┬────────┘
         ▼
     [Repeat]
```

### Admin Setup Flow
```
Open App (first time)
         │
         ▼
┌─────────────────┐
│ Step 1: Sign In │  ← Google SSO + optional Claude API key
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 2: Org Info│  ← Name, title, tagline, color theme
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 3: Upload  │  ← CSV/TSV/image of ministry list
│   Ministries    │     AI-powered column mapping
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 4: Admins  │  ← Add admin emails
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 5: Review  │  ← Summary + deploy
└─────────────────┘
```

### Follow-Up Flow
```
Ministry Leader creates follow-up round (3 questions max)
         │
         ▼
Shareable link generated: ?followup=ministry-id&round=N
         │
         ▼
Parishioner opens link → form pre-fills from saved profile
         │
         ▼
Responses saved to Follow-Up Responses sheet
         │
         ▼
Leader can add additional rounds as needed
```

---

## Features

### Parishioner Features

| Feature | Description |
|---------|-------------|
| One-time registration | Contact info stored locally; enter once, sign up everywhere |
| Google Sign-In | OAuth-based registration as alternative to manual form |
| Phone auto-formatting | Formats as (xxx) xxx-xxxx as user types |
| New parishioner flag | Optional checkbox for visitors wanting to join the parish |
| Ministry search | Real-time filter by ministry name (case-insensitive) |
| Interest sorting | Ministries user has signed up for appear at top of list |
| Qualifying questions | Optional per-ministry questions (text, select, or checkbox) |
| Organizer contact | Shows ministry leader's name/email/phone after signup |
| Remove interest | Remove interest with confirmation prompt |
| My Signups | Dedicated view listing all expressed interests |
| Follow-up questionnaires | Complete post-fair questionnaires via shareable links |
| Deep linking | QR codes link directly to a specific ministry via `?m=` parameter |
| Browser navigation | Back/forward buttons navigate within the app |
| Logout | Clears local data to start fresh (useful for shared devices) |

### Admin Features

| Feature | Description |
|---------|-------------|
| Admin dashboard | Tabbed interface: Signups, New Parishioners, Ministries, Manage Users, Manual Entry, QR Codes |
| Signups tab | View all signups with search, filter by ministry, export CSV |
| New Parishioners tab | View/search/export people who want to join the parish |
| Ministries tab | Add, edit, delete ministries (name, description, icon, organizer info, questions, tags) |
| Manage Users tab | Add/remove admin users by email |
| Manual Entry tab | Upload CSV or image for AI-parsed bulk entry, or manual single-entry form |
| QR Codes tab | Generate and print ministry-specific QR codes |
| Follow-up editor | Configure multi-round questionnaires (3 questions per round) per ministry |
| CSV export | Download signups or new parishioners as timestamped CSV |
| Role-based access | Super admins have full access; ministry leaders manage their own ministries |

### Setup & Configuration

| Feature | Description |
|---------|-------------|
| 5-step setup wizard | Guided first-time configuration (/start route) |
| AI domain detection | Auto-detects organization name from admin email domain |
| Heuristic detection | Recognizes 50+ church-related keywords in email domains |
| Color theme picker | 12 pre-defined color themes (Burgundy, Navy, Forest, Purple, etc.) |
| Settings page | Edit org name, title, theme, API URL, Sheet URL, API key |
| API key management | Session-only or secure server-side storage via GAS Script Properties |
| Light/dark mode | Toggle with sun/moon button, persisted in localStorage |

---

## Data Architecture

### Google Sheets (6 Tabs)

**Ministries** (read/write by app)

| Column | Type | Example |
|--------|------|---------|
| ID | Text | music-ministry |
| Name | Text | Music Ministry |
| Description | Text | Join our choir... |
| Icon | Emoji | 🎵 |
| Organizer Name | Text | John Smith |
| Organizer Email | Email | john@church.org |
| Organizer Phone | Phone | (512) 555-1234 |
| Question 1-3 | Pipe-delimited | select\|Voice part\|Soprano,Alto,Tenor,Bass |
| Tags | Text | music, worship |

**App Signups** (append-only log)

| Column | Type | Example |
|--------|------|---------|
| Date | Date | 2/11/26 |
| Time | Time | 2:15 PM |
| First | Text | Maria |
| Last | Text | Garcia |
| Email | Email | maria@email.com |
| Phone | Phone | (512) 555-1234 |
| New Parishioner | Yes/No | No |
| Ministry | Text | Music Ministry |
| Action | Text | Signup / Removed / Manual Entry |
| Q1-Q3 | Text | Soprano |

**New Parishioners** (de-duplicated by email)

| Column | Type | Example |
|--------|------|---------|
| Date | Date | 2/11/26 |
| Time | Time | 2:15 PM |
| First | Text | Maria |
| Last | Text | Garcia |
| Email | Email | maria@email.com |
| Phone | Phone | (512) 555-1234 |

**Admins**

| Column | Type | Example |
|--------|------|---------|
| Email | Email | admin@church.org |
| Name | Text | Fr. Michael |
| Date Added | Date | 1/15/26 |

**Follow-Up Questions** (one row per round per ministry)

| Column | Type | Example |
|--------|------|---------|
| Ministry ID | Text | music-ministry |
| Ministry Name | Text | Music Ministry |
| Round | Number | 1 |
| Q1 | Pipe-delimited | select\|Day availability\|Mon,Tue,Wed,Thu,Fri |
| Q2 | Pipe-delimited | select\|Time preference\|Morning,Afternoon,Evening |
| Q3 | Pipe-delimited | text\|Any special skills?\| |

**Follow-Up Responses** (one row per submission)

| Column | Type | Example |
|--------|------|---------|
| Date | Date | 2/11/26 |
| Time | Time | 3:30 PM |
| First | Text | Maria |
| Last | Text | Garcia |
| Email | Email | maria@email.com |
| Phone | Phone | (512) 555-1234 |
| Ministry | Text | Music Ministry |
| Round | Number | 1 |
| Q1-Q3 | Text | Monday, Wednesday |

### Local Storage (Browser)

| Key | Content |
|-----|---------|
| `ministry-fair-profile` | JSON: firstName, lastName, email, phone, wantsToJoinParish |
| `ministry-fair-interests` | JSON array: ministryId, ministryName, answers, timestamp |
| `mf-app-config` | JSON: organizationName, appTitle, tagline, primaryColor, apiUrl, spreadsheetUrl, orgDomain, setupComplete |
| `mf-theme` | "dark" or "light" |
| `mf-notifications` | JSON: emailEnabled, textEnabled, templates |

---

## API Endpoints (Google Apps Script)

### GET Endpoints

| Action | Purpose |
|--------|---------|
| getMinistries | Return all ministries (default) |
| verifyAdmin | Check if email is an admin |
| verifyUser | Check if email is a registered user |
| getSignups | Get all signups (admin) or filtered by email |
| getLeaderSignups | Get signups for a ministry leader's ministries only |
| getNewParishioners | Get new parishioner list |
| getAdmins | Get admin user list |
| getFollowupQuestions | Get follow-up questions for a ministry (all rounds or specific round) |
| getFollowupResponses | Get follow-up responses for a user/ministry/round |

### POST Endpoints

| Action | Purpose |
|--------|---------|
| (default) | Record signup, removal, or manual entry to App Signups sheet |
| store-api-key | Save Claude API key to GAS Script Properties |
| check-api-key | Check if server-side API key exists |
| ai-lookup | Claude API: detect organization from email domain |
| ai-analyze | Claude API: analyze sample ministry data for column mapping |
| ai-parse-signups | Claude Vision API: extract signups from uploaded image |
| submitFollowupResponse | Save follow-up questionnaire response |
| adminAction: addMinistry | Create a new ministry |
| adminAction: updateMinistry | Edit an existing ministry |
| adminAction: deleteMinistry | Remove a ministry |
| adminAction: addAdmin | Add an admin user |
| adminAction: removeAdmin | Remove an admin user |
| adminAction: saveFollowupQuestions | Save multi-round follow-up questions for a ministry |

---

## Deep Linking & URL Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `?m=ministry-id` | Direct link to ministry detail page | `?m=music-ministry` |
| `?followup=ministry-id` | Open follow-up questionnaire (round 1) | `?followup=music-ministry` |
| `?followup=ministry-id&round=N` | Open specific follow-up round | `?followup=music-ministry&round=2` |

---

## Business Rules

### Registration
- All fields required except "Join Parish" checkbox
- Phone number auto-formats as user types: (xxx) xxx-xxxx
- Profile saved to localStorage after successful registration
- Returning users skip registration (profile loaded from localStorage)
- Google Sign-In available as alternative to manual form

### Ministry Browsing
- Ministries load from Google Sheets API on page load
- 10-second timeout falls back to hardcoded list if API fails
- Search is real-time, case-insensitive, matches ministry name
- Signed-up ministries sorted to top of list

### Interest Signup
- Tapping "I'm Interested" submits to Google Sheets API
- Local state updated immediately for responsive UI
- Action column set to "Signup"

### Interest Removal
- Requires confirmation modal
- Submits removal record to Google Sheets (action = "Removed")
- Original signup row preserved for audit trail
- Local state updated immediately

### Follow-Up Questionnaires
- Max 3 questions per round (learned best practice: short surveys get better response rates)
- Multiple rounds supported per ministry, each with its own shareable link
- Ministry leads (or admins) configure questions from the admin dashboard
- Questions support text, dropdown (select), and checkbox types
- Pipe-delimited format: `type|label|options`
- Follow-up form is standalone — does not require prior registration
- Pre-fills contact info from saved profile if available
- Designed for post-fair outreach: availability, preferences, scheduling

### Manual Entry (Physical Signup Sheets)
- **Upload mode** (primary): Upload CSV or image (JPG/PNG/PDF)
- CSV files parsed client-side with automatic column header mapping
- Images sent to Claude Vision API for AI extraction of names, emails, phones
- Parsed entries shown in editable review table before bulk submission
- Default ministry can be pre-selected for files without a ministry column
- **Manual mode** (fallback): Single-entry form for one-off additions
- All entries recorded with action type "Manual Entry" for audit trail

### Browser Navigation
- All view transitions push state to browser history
- Back/forward buttons navigate between app views (not away from the app)
- Clicking the app title in nav bar returns to ministries list

### Security
- XSS protection via `escapeHtml()` on all user-generated content
- Claude API key stored server-side in GAS Script Properties (not exposed to client)
- Admin actions require email verification against Admins sheet
- Ministry leaders can only manage their own ministries

---

## Application Views

| View | Route/ID | Purpose |
|------|----------|---------|
| Loading | view-loading | Splash screen during initialization |
| Setup Wizard | view-start | 5-step first-time admin configuration |
| Register | view-register | Parishioner registration form |
| Ministries | view-ministries | Browse and search all ministries |
| Detail | view-detail | Single ministry detail + express interest |
| Confirmed | view-confirmed | Confirmation page after signup |
| Admin | view-admin | Admin dashboard (6 tabs) |
| My Signups | view-my-signups | Parishioner's interest history |
| Follow-Up | view-followup | Follow-up questionnaire form |
| Settings | view-settings | App configuration |

---

## Integrations & Dependencies

| Dependency | Purpose | Required |
|------------|---------|----------|
| Google Sheets | Data storage (6 tabs) | Yes |
| Google Apps Script | API backend + Claude proxy | Yes |
| Google Identity Services | Google Sign-In OAuth | No (manual registration available) |
| Claude API (Anthropic) | AI features: domain detection, ministry data mapping, signup sheet parsing | No (manual fallback for all AI features) |
| Google Fonts | Typography (Crimson Pro, Inter) | No (system fonts as fallback) |
| qrcode.js | QR code generation | Yes (for QR feature) |
| localStorage | Client-side persistence | Yes |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User's Browser                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │           index.html (Single File ~7000 lines)   │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │    │
│  │  │  HTML   │ │   CSS   │ │   JavaScript    │   │    │
│  │  │(10 views│ │(Styles +│ │ (App Logic +    │   │    │
│  │  │ + admin │ │ light/  │ │  History API +  │   │    │
│  │  │  tabs)  │ │ dark)   │ │  CSV parsing)   │   │    │
│  │  └─────────┘ └─────────┘ └─────────────────┘   │    │
│  └─────────────────────────────────────────────────┘    │
│       │                    │                             │
│       ▼                    ▼                             │
│  ┌─────────────┐    ┌──────────────┐                    │
│  │ localStorage│    │sessionStorage│                    │
│  │ (Profile,   │    │ (API Key)    │                    │
│  │  Interests, │    └──────────────┘                    │
│  │  Config)    │                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS (fetch)
                          ▼
┌─────────────────────────────────────────────────────────┐
│               Google Apps Script Backend                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │  doGet()  - 9 endpoints (ministries, signups,   │    │
│  │             admins, follow-up, verification)     │    │
│  │  doPost() - 12 actions (signup, admin CRUD,     │    │
│  │             AI proxy, follow-up, API key mgmt)  │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Claude API Proxy (3 use cases)                  │    │
│  │  • Domain/org detection from email               │    │
│  │  • Ministry data column mapping                  │    │
│  │  • Signup sheet image parsing (Vision API)       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Google Sheets                          │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐   │
│  │  Ministries  │ │  App Signups │ │New Parishioners│   │
│  │   (config)   │ │  (audit log) │ │    (leads)     │   │
│  └──────────────┘ └──────────────┘ └────────────────┘   │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐   │
│  │    Admins    │ │  Follow-Up   │ │   Follow-Up    │   │
│  │   (access)   │ │  Questions   │ │   Responses    │   │
│  └──────────────┘ └──────────────┘ └────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Deployment Checklist

- [ ] Create Google Sheet with 6 tabs
- [ ] Add Apps Script code (google-apps-script.js)
- [ ] Run `testSetup` function to initialize sheet headers
- [ ] Deploy Apps Script as web app (execute as: me, access: anyone)
- [ ] Copy deployment URL
- [ ] Update CONFIG in index.html with API URL
- [ ] Update organization name/branding in CONFIG
- [ ] Upload index.html to hosting (Netlify, eCatholic, etc.)
- [ ] Set up Google Sign-In client ID (optional)
- [ ] Store Claude API key via Settings page (optional, enables AI features)
- [ ] Add ministries to sheet (via wizard upload or admin tab)
- [ ] Add admin users
- [ ] Generate and print QR codes for ministry tables
- [ ] Test: registration → browse → signup → confirmation
- [ ] Test: follow-up questionnaire link
- [ ] Test: manual entry upload (CSV and/or image)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial release: registration, browsing, signup |
| 2.0 | Jan 2026 | Added search, organizer info, phone display |
| 3.0 | Jan 2026 | Added logout, remove interest, audit trail, phone formatting, configurable branding |
| 3.5 | Jan 2026 | Added setup wizard, admin dashboard (6 tabs), Google Sign-In, ministry CRUD, QR codes, light/dark mode, settings page, AI-powered spreadsheet intake, domain detection |
| 4.0 | Feb 2026 | Added manual entry with CSV/image upload and AI parsing, follow-up questionnaires (3 questions per round, multi-round), browser back/forward navigation, parishioner nav bar |
| 5.0 | Feb 2026 | Consolidated product spec to reflect full feature set |

---

## Open Design Questions

1. **Notification delivery** — Email/SMS templates are configurable in settings but not yet sent by the backend. Integration with SendGrid, Twilio, or similar would be needed.

2. **Offline mode** — App requires internet for initial load and all signups. A service worker could enable offline queueing.

3. **Data retention** — How long should signup data be kept? (Currently: indefinite)

4. **Privacy** — Should there be a privacy policy link? (Currently: consent text only)

5. **Accessibility** — Full WCAG audit not yet completed.

6. **Multi-language** — Single language only; would need refactor for i18n.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Registration completion | >90% of users who start registration |
| Signup success | >95% of interest submissions reach Google Sheet |
| Page load time | <3 seconds on mobile |
| Follow-up response rate | >50% of contacted parishioners respond |
| AI parsing accuracy | >90% correct extraction from legible signup sheets |
| Ministry leader satisfaction | Positive qualitative feedback |
| Data accuracy | 100% (no transcription errors vs. paper) |
