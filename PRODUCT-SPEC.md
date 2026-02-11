# Product Spec: Ministry Fair

**Version:** 6.0
**Date:** February 11, 2026

---

## What It Is

Ministry Fair is a hosted web app that lets churches digitize their ministry signup process. A church admin signs in, connects their own Google Sheet (or Microsoft Excel workbook), and gets a fully branded signup app for parishioners — no technical skills required.

**We host the front-end. The church owns all the data.** Member PII lives exclusively in the church's own spreadsheet. We never store or have access to it.

---

## How It Works

### The Church Gate (New in v6.0)

The app starts with a **domain-recognition gate**. When someone visits:

```
Visitor arrives
      │
      ▼
┌──────────────┐
│  Church Gate │  ← Sign in with Google or Microsoft
└──────┬───────┘
       │
       ▼
  Email domain
  recognized?
   ╱        ╲
  Yes        No
  │           │
  ▼           ▼
Load       Setup
church     Wizard
config     (new church)
  │           │
  ▼           ▼
Normal     5-step
app flow   onboarding
```

- **Recognized domain** → Loads that church's saved configuration and proceeds directly to the app
- **Unrecognized domain** → Kicks off the setup wizard to onboard the church

### Church Registry

A domain-to-config mapping that tracks which churches are set up. Currently browser-local (localStorage). Designed for migration to a central API when we're ready for true multi-tenancy.

```
{
  "sttheresa.org": {
    organizationName: "St. Theresa Catholic Church",
    provider: "google",         // or "microsoft"
    apiUrl: "https://script.google.com/...",
    setupComplete: true,
    ...
  }
}
```

---

## Spreadsheet Provider Architecture (New in v6.0)

The app abstracts all data operations behind a `SpreadsheetProvider` interface. Each provider implements the same contract:

| Method | Purpose |
|--------|---------|
| `testConnection(config)` | Validate the connection to the spreadsheet |
| `getMinistries(config)` | Fetch ministry list |
| `submitSignup(config, data)` | Record a signup |
| `post(config, payload)` | Generic write operation |
| `get(config, params)` | Generic read operation |
| `getSetupFields()` | Return which config fields this provider needs |

### Google Sheets Provider — **Ready**

The church creates a Google Sheet, attaches the Apps Script backend, deploys it as a web app, and pastes the URL into the setup wizard. All existing functionality (ministry CRUD, signups, follow-ups, AI parsing, admin management) works through this provider.

### Microsoft 365 Excel Provider — **Preview / Scaffolding**

For churches on the Microsoft platform. Uses MSAL.js for authentication and Microsoft Graph API for Excel workbook operations. The scaffolding is in place:

- MSAL initialization and token management (silent + interactive popup)
- Graph API client wrapper
- Azure AD app registration setup instructions in wizard
- Configuration fields: Client ID, Tenant ID, Workbook URL
- All data operation methods stubbed with TODO markers

**What's needed to ship Microsoft:** Implement the Graph API calls in each stub (`getMinistries`, `submitSignup`, etc.) to read/write Excel ranges and table rows.

---

## Setup Wizard (5 Steps)

When a new church is detected:

| Step | What Happens |
|------|-------------|
| **1. Welcome + Platform** | Shows admin identity (from gate sign-in). Choose data platform: Google Sheets or Microsoft 365. Enter Claude API key (optional). |
| **2. Organization** | Name, app title, tagline, color theme (12 options). AI auto-fills org name from domain if possible. |
| **3. Connect Spreadsheet** | Platform-specific: upload an existing ministry list (AI-mapped), then follow instructions to create and connect a spreadsheet. Test connection button. |
| **4. Add Admins** | Add other admin email addresses. |
| **5. Review + Launch** | Summary of all settings, provider badge, then launch. Church is registered in the registry. |

---

## User Roles

| Role | Access |
|------|--------|
| **Parishioner** | Register, browse/search ministries, express interest, view my signups, complete follow-up questionnaires |
| **Ministry Leader** | + view signups for their ministries, configure follow-up questions |
| **Super Admin** | + full admin dashboard, ministry CRUD, manage admins, manual entry, QR codes, settings |

---

## Parishioner Flow

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
│ Browse / Search │
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
└─────────────────┘
```

---

## Features

### Parishioner

| Feature | Description |
|---------|-------------|
| One-time registration | Enter contact info once, sign up everywhere |
| Google Sign-In | OAuth alternative to manual form |
| Phone auto-formatting | (xxx) xxx-xxxx as user types |
| New parishioner flag | "I'd like to join" checkbox |
| Ministry search | Real-time, case-insensitive |
| Interest sorting | Signed-up ministries float to top |
| Qualifying questions | Per-ministry text, select, or checkbox questions |
| Organizer contact | Shows leader's name/email/phone after signup |
| Remove interest | With confirmation prompt |
| My Signups | Dedicated view of all interests |
| Follow-up questionnaires | Complete post-fair forms via shareable links |
| Deep linking | `?m=ministry-id` links to a specific ministry |
| Browser navigation | Back/forward work within the app |
| Light/dark mode | Toggle, persisted |
| Logout | Clears local data (shared device support) |

### Admin

| Feature | Description |
|---------|-------------|
| Admin dashboard | 6 tabs: Signups, New Parishioners, Ministries, Users, Manual Entry, QR Codes |
| Signups tab | View, search, filter by ministry, export CSV |
| New Parishioners tab | View/search/export visitors who want to join |
| Ministries tab | Full CRUD: name, description, icon, organizer, questions, tags |
| Manage Users tab | Add/remove admin emails |
| Manual Entry tab | Upload CSV or image (AI-parsed), or manual single entry |
| QR Codes tab | Generate and print per-ministry QR codes |
| Follow-up editor | Multi-round questionnaires, 3 questions per round |
| CSV export | Timestamped downloads |
| Role-based access | Super admins vs. ministry leaders |
| Settings | Edit org, colors, API connection, Claude key, notifications |

---

## Data Architecture

### Spreadsheet Structure (6 Tabs)

Identical whether Google Sheets or Microsoft Excel:

**Ministries**
| Column | Example |
|--------|---------|
| ID | music-ministry |
| Name | Music Ministry |
| Description | Join our choir... |
| Icon | 🎵 |
| Organizer Name | John Smith |
| Organizer Email | john@church.org |
| Organizer Phone | (512) 555-1234 |
| Question 1-3 | select\|Voice part\|Soprano,Alto,Tenor,Bass |
| Tags | music, worship |

**App Signups** (append-only audit log)
| Column | Example |
|--------|---------|
| Date / Time | 2/11/26 2:15 PM |
| First, Last, Email, Phone | Maria Garcia maria@email.com |
| New Parishioner | Yes / No |
| Ministry | Music Ministry |
| Action | Signup / Removed / Manual Entry |
| Q1-Q3 answers | Soprano |

**New Parishioners** (deduplicated by email)

**Admins** (email, name, date added)

**Follow-Up Questions** (ministry ID, round, 3 pipe-delimited questions)

**Follow-Up Responses** (submission log with round + answers)

### Browser Storage

| Key | Content |
|-----|---------|
| `ministry-fair-profile` | User contact info |
| `ministry-fair-interests` | Array of ministry interests |
| `mf-app-config` | Church configuration (org name, provider, URLs, colors, setup state) |
| `mf-church-registry` | Domain → church config mapping |
| `mf-admins` | Admin email list (synced from sheet) |
| `mf-session` | Current admin session |
| `mf-theme` | "dark" or "light" |
| `mf-notifications` | Notification settings + templates |
| `mf-claude-key` (sessionStorage) | Claude API key (session-only) |

---

## Application Views (11)

| View | ID | Purpose |
|------|----|---------|
| Church Gate | view-church-gate | Domain recognition entry point |
| Loading | view-loading | Splash during init |
| Setup Wizard | view-start | 5-step church onboarding |
| Register | view-register | Parishioner registration |
| Ministries | view-ministries | Browse/search all ministries |
| Detail | view-detail | Single ministry + signup |
| Confirmed | view-confirmed | Post-signup confirmation |
| Admin | view-admin | Admin dashboard (6 tabs) |
| My Signups | view-my-signups | Parishioner interest history |
| Follow-Up | view-followup | Follow-up questionnaire |
| Settings | view-settings | App configuration |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │      index.html (Single-File SPA, ~7500 lines)      │    │
│  │                                                      │    │
│  │  Church Gate → Domain Check → Setup Wizard or App    │    │
│  │                                                      │    │
│  │  SpreadsheetProvider Abstraction Layer                │    │
│  │  ├── GoogleSheetsProvider (fetch → GAS)              │    │
│  │  └── MicrosoftExcelProvider (MSAL → Graph API)       │    │
│  │                                                      │    │
│  │  Church Registry (domain → config)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│       │                    │                 │               │
│       ▼                    ▼                 ▼               │
│  localStorage        sessionStorage     MSAL cache          │
│  (profile, config,   (API key)          (MS tokens)         │
│   registry, admins)                                         │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         │ Google path                        │ Microsoft path
         ▼                                    ▼
┌────────────────────┐          ┌──────────────────────────┐
│ Google Apps Script  │          │ Microsoft Graph API       │
│ (church-deployed)   │          │ (direct from browser)     │
│                     │          │                           │
│ doGet: 9 endpoints  │          │ Excel REST endpoints      │
│ doPost: 12 actions  │          │ (scaffolding — stubs)     │
│ Claude API proxy    │          │                           │
└─────────┬──────────┘          └────────────┬─────────────┘
          ▼                                  ▼
┌────────────────────┐          ┌──────────────────────────┐
│   Google Sheets     │          │ Excel in OneDrive /       │
│   (6 tabs)          │          │ SharePoint (6 sheets)     │
│   Church-owned      │          │ Church-owned              │
└────────────────────┘          └──────────────────────────┘
```

### Key Design Decisions

- **Single-file SPA**: No build step, no framework. Ships as `index.html`. Deploy by dragging a folder.
- **Church owns all PII**: We host the UI; the church hosts the data. No member info touches our servers.
- **Provider abstraction**: Same app, two data backends. Churches choose based on their existing platform.
- **Domain-first onboarding**: Email domain is the key. Sign in → check registry → either load config or start setup.

---

## Integrations

| Dependency | Purpose | Required |
|------------|---------|----------|
| Google Sheets + Apps Script | Data storage + API (Google path) | Yes (if Google) |
| Microsoft Graph API + MSAL.js | Data storage + auth (Microsoft path) | Yes (if Microsoft) |
| Google Identity Services | Google Sign-In at gate + registration | Yes |
| MSAL.js | Microsoft Sign-In at gate + Graph auth | Yes (if Microsoft) |
| Claude API (Anthropic) | Domain detection, spreadsheet mapping, image parsing | No (manual fallbacks) |
| Google Fonts | Crimson Pro + Inter | No (system fallback) |
| qrcode.js | QR code generation | Yes (for QR feature) |

---

## API Endpoints (Google Apps Script)

### GET

| Action | Purpose |
|--------|---------|
| getMinistries | Return all ministries |
| verifyAdmin / verifyUser | Check role |
| getSignups / getLeaderSignups | Get signup data |
| getNewParishioners | Get new parishioner list |
| getAdmins | Get admin list |
| getFollowupQuestions / getFollowupResponses | Follow-up data |

### POST

| Action | Purpose |
|--------|---------|
| (default) | Record signup / removal / manual entry |
| store-api-key / check-api-key | Claude key management |
| ai-lookup / ai-analyze / ai-parse-signups | Claude AI features |
| submitFollowupResponse | Save follow-up response |
| adminAction: add/update/deleteMinistry | Ministry CRUD |
| adminAction: add/removeAdmin | Admin management |
| adminAction: saveFollowupQuestions | Follow-up config |

---

## Deep Linking

| Parameter | Example |
|-----------|---------|
| `?m=ministry-id` | Direct to ministry detail |
| `?followup=ministry-id` | Follow-up form (round 1) |
| `?followup=ministry-id&round=2` | Specific follow-up round |

---

## Security

- XSS protection via `escapeHtml()` on all user content
- Claude API key stored server-side in GAS Script Properties
- Admin actions validated against Admins sheet
- Ministry leaders scoped to their own ministries
- MSAL tokens in sessionStorage (Microsoft path)
- No PII stored on hosting server — ever
- Security headers via `netlify.toml` (X-Frame-Options, CSP, etc.)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial: registration, browsing, signup |
| 2.0 | Jan 2026 | Search, organizer info, phone display |
| 3.0 | Jan 2026 | Logout, remove interest, audit trail, phone formatting, branding |
| 3.5 | Jan 2026 | Setup wizard, admin dashboard, Google Sign-In, ministry CRUD, QR codes, dark mode, settings, AI intake, domain detection |
| 4.0 | Feb 2026 | Manual entry (CSV/image + AI), follow-up questionnaires, browser navigation |
| 5.0 | Feb 2026 | Consolidated spec |
| **6.0** | **Feb 11, 2026** | **Church domain gate, church registry, spreadsheet provider abstraction (Google ready + Microsoft 365 scaffolding), platform selection in wizard, clean-slate defaults for fresh deployments** |

---

## Open Items

1. **Microsoft 365 provider** — Scaffolding complete; Graph API calls need implementation
2. **Central registry API** — Currently localStorage; needs a hosted service for true multi-tenancy
3. **Notification delivery** — Email/SMS templates configured but not yet sent
4. **Offline mode** — Service worker for offline queueing
5. **Accessibility** — Full WCAG audit pending
6. **Multi-language** — English only; i18n not yet built
7. **Fully hosted alternative** — Potential future: we host the database too (no spreadsheet needed)
