# Product Spec: Parish Ministry Fair App

**Version:** 4.1
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

This app digitizes the signup process, allowing parishioners to register once and express interest in any ministry with a single tap.

---

## User Stories

### Primary User: Parishioner attending a ministry fair

> "As a parishioner at the ministry fair, I want to quickly sign up for ministries I'm interested in without writing my contact info over and over, so I can explore more tables and ministry leaders get accurate contact information."

### Secondary User: Ministry leader/organizer

> "As a ministry leader, I want a clean list of interested parishioners with their contact info and any qualifying details, so I can follow up efficiently after the fair."

### Tertiary User: Parish staff

> "As parish staff, I want to identify visitors who want to become parishioners, so I can follow up with registration information."

---

## Core Functionality

### User Flow

```
┌─────────────────┐
│   Scan QR Code  │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐
│  First Visit?   │─Yes─▶│    Register     │
└────────┬────────┘     └────────┬────────┘
         │ No                    │
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

### Features

| Feature | Description |
|---------|-------------|
| One-time registration | Contact info stored locally; user doesn't re-enter at each table |
| Phone auto-formatting | Formats as (xxx) xxx-xxxx as user types |
| New parishioner flag | Optional checkbox for visitors wanting to join the parish |
| Ministry search | Filters by ministry name, description, or organizer name |
| Interest sorting | Ministries user has signed up for appear at top of list |
| Qualifying questions | Optional per-ministry questions (text, select, or checkbox) |
| Organizer contact | Shows ministry leader's name/email/phone after signup |
| Remove interest | User can remove interest with confirmation prompt |
| Logout | Clears local data to start fresh (useful for shared devices) |
| Deep linking | QR codes can link directly to a specific ministry via `?m=` parameter |
| Audit trail | All signups AND removals logged with timestamps |

---

## Inputs and Outputs

### User Inputs

| Field | Required | Format | Validation |
|-------|----------|--------|------------|
| First Name | Yes | Text | Non-empty |
| Last Name | Yes | Text | Non-empty |
| Email | Yes | Email | Valid email format |
| Phone | Yes | (xxx) xxx-xxxx | Auto-formatted, 10 digits |
| Join Parish | No | Checkbox | Boolean |
| Ministry Interest | Per ministry | Button tap | — |
| Qualifying Questions | No | Text/Select/Checkbox | Varies by ministry |

### System Outputs

**To User:**
- Confirmation screen with ministry name
- Organizer contact info (name, email, phone) if available
- Running list of all expressed interests
- Visual "Interested" badges on ministries already signed up for
- Formatted phone number display

**To Google Sheet (App Signups tab):**

| Field | Type | Example |
|-------|------|---------|
| Date | Date | 1/26/26 |
| Time | Time | 2:15 PM |
| First | Text | Maria |
| Last | Text | Garcia |
| Email | Email | maria@email.com |
| Phone | Phone | (512) 555-1234 |
| New Parishioner | Yes/No | No |
| Ministry | Text | Music Ministry |
| Action | Text | Signup / Removed |
| Q1 | Text | Soprano |
| Q2 | Text | |
| Q3 | Text | |

**To Google Sheet (New Parishioners tab):**
- Automatically populated when user checks "I'd like to join"
- De-duplicated by email address

---

## Business Rules and Logic

### Registration
- All fields required except "Join Parish" checkbox
- Phone number auto-formats as user types
- Profile saved to localStorage after successful registration
- Returning users skip registration (profile loaded from localStorage)

### Ministry Browsing
- Ministries load from Google Sheets API on page load
- 10-second timeout falls back to hardcoded list if API fails
- Search is case-insensitive
- Search matches: ministry name, description, OR organizer name
- Signed-up ministries sorted to top of list
- First 5 ministries shown by default; "Show All" reveals rest

### Interest Signup
- Tapping "I'm Interested" submits to Google Sheets API
- Submission uses `no-cors` mode (fire and forget)
- Local state updated immediately for responsive UI
- Duplicate signups for same ministry = update (not new row)
- Action column set to "Signup"

### Interest Removal
- Requires confirmation modal ("Are you sure?")
- Submits removal record to Google Sheets API
- Action column set to "Removed"
- Original signup row preserved (audit trail)
- Local state updated immediately

### Logout
- Requires confirmation
- Clears localStorage (profile + interests)
- Returns to registration screen
- Does NOT delete data from Google Sheet

### Deep Linking
- URL parameter `?m=ministry-id` jumps directly to ministry detail
- If user not registered, shows registration first, then ministry
- Invalid ministry ID falls back to ministry list

---

## Data Requirements

### Local Storage (Browser)
| Key | Content |
|-----|---------|
| `ministry-fair-profile` | JSON: firstName, lastName, email, phone, wantsToJoinParish |
| `ministry-fair-interests` | JSON array: ministryId, ministryName, answers, timestamp |
| `ministry-fair-admin` | JSON: email, name (admin session) |

### Google Sheets

**Ministries Tab (read by app):**
- ID, Name, Description, Icon, Organizer Name, Organizer Email, Organizer Phone, Question 1-3

**App Signups Tab (written by app):**
- Date, Time, First, Last, Email, Phone, New Parishioner, Ministry, Action, Q1-Q3

**New Parishioners Tab (written by app):**
- Date, Time, First, Last, Email, Phone

**Admins Tab (manual configuration):**
- Email, Name, Added Date

---

## Integrations and Dependencies

| Dependency | Purpose | Required |
|------------|---------|----------|
| Google Sheets | Data storage | Yes |
| Google Apps Script | API backend | Yes |
| Google Fonts | Typography (Crimson Pro, Inter) | No (fallback fonts work) |
| localStorage | Client-side persistence | Yes |

### External Services
- Google Sign-In for admin authentication (verified against Admins sheet)
- No payment processing
- No email sending (manual follow-up by ministry leaders)

---

## Staff Sign-In & Dashboards (v4)

### User Roles
| Role | Identification | Access |
|------|---------------|--------|
| **Admin** | Email in Admins sheet | Full dashboard: all signups, all parishioners, ministry CRUD, user management |
| **Ministry Leader** | Email matches Organizer Email on any ministry | Leader dashboard: signups for their ministry/ministries only, CSV export |
| **Parishioner** | No sign-in required | Browse ministries, register, express interest |

### Sign-In Flow
- Accessed via `?admin` URL parameter or the subtle "Admin" link at the bottom-right of the app
- All staff (admins and leaders) sign in via Google Sign-In on the same page
- The `verifyUser` endpoint checks: is this email an admin? A ministry organizer? Neither?
- Admins are routed to the **Admin Dashboard** (blue header)
- Ministry leaders are routed to the **Leader Dashboard** (green header)
- Unrecognized emails see an access-denied message
- Session persisted in localStorage (`ministry-fair-admin`) with role info

### Admin Dashboard Features
| Feature | Description |
|---------|-------------|
| Summary stats | Total signups, unique people, new parishioners, ministry count |
| Signups tab | Searchable table of all signups/removals, newest first, with CSV export |
| New Parishioners tab | Searchable table of new parishioner leads, with CSV export |
| Ministries tab | Full CRUD: add, edit, and delete ministries from the dashboard |
| Manage Users tab | Add/remove admins; view ministry leaders (linked to organizer emails) |
| Data refresh | Manual refresh button to pull latest data from Google Sheets |
| Admin logout | Clears admin session; separate from parishioner logout |

### Ministry Leader Dashboard Features
| Feature | Description |
|---------|-------------|
| Leader stats | Total signups and unique people for their ministry/ministries |
| Ministry signups | Table per ministry showing interested parishioners with contact info and qualifying answers |
| CSV export | Per-ministry CSV export including qualifying question answers |
| Data refresh | Manual refresh button |

### Admin API Endpoints (Google Apps Script)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `?action=verifyUser&email=` | GET | None | Returns role (admin/leader/none) + leader ministries |
| `?action=verifyAdmin&email=` | GET | None (returns boolean) | Legacy: checks if email is in Admins sheet |
| `?action=getSignups&email=` | GET | Admin email | Returns all signup rows |
| `?action=getLeaderSignups&email=` | GET | Leader email | Returns signups filtered to leader's ministries |
| `?action=getNewParishioners&email=` | GET | Admin email | Returns all new parishioner rows |
| `?action=getAdmins&email=` | GET | Admin email | Returns list of all admins |
| POST `adminAction=addMinistry` | POST | Admin email | Adds a new ministry row |
| POST `adminAction=updateMinistry` | POST | Admin email | Updates an existing ministry by ID |
| POST `adminAction=deleteMinistry` | POST | Admin email | Deletes a ministry row by ID |
| POST `adminAction=addAdmin` | POST | Admin email | Adds a new admin to Admins sheet |
| POST `adminAction=removeAdmin` | POST | Admin email | Removes an admin from Admins sheet |

### Google Sheets: Admins Tab
| Column | Description |
|--------|-------------|
| Email | Google account email (used for access control) |
| Name | Display name (informational) |
| Added Date | When the admin was added (informational) |

### Ministry Leader Identification
- Leaders are identified by the **Organizer Email** field on each ministry in the Ministries sheet
- A leader can be organizer of multiple ministries and will see all of them
- To add/change a leader, edit the ministry's Organizer Email (via admin dashboard or Google Sheets)
- No separate "Leaders" sheet is needed

---

## Out of Scope (v4)

The following are explicitly NOT included in this version:

- Email notifications to ministry leaders
- SMS notifications
- Multi-language support
- Offline mode (requires internet for initial load + signups)
- Photo upload
- Calendar integration

---

## Open Design Questions

1. **Duplicate handling** — Should signing up again for the same ministry create a new row or update existing? (Currently: new row with audit trail)

2. **Data retention** — How long should signup data be kept? (Currently: indefinite)

3. **Privacy** — Should there be a privacy policy link? (Currently: consent text only)

4. **Accessibility** — Full WCAG audit not yet completed

5. **Internationalization** — Single language only; would need refactor for multi-language

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Registration completion | >90% | Users who start registration and finish |
| Signup success | >95% | Interest submissions that reach Google Sheet |
| Page load time | <3 seconds | Time to interactive on mobile |
| Ministry leader satisfaction | Positive | Qualitative feedback |
| Data accuracy | 100% | No transcription errors (vs. paper) |

### Qualitative Success
- Ministry leaders receive clean, accurate contact lists
- Parishioners can explore more tables in less time
- Parish staff get automatic new parishioner leads
- Zero paper sign-up sheets needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial release: registration, browsing, signup |
| 2.0 | Jan 2026 | Added search, organizer info, phone display |
| 3.0 | Jan 2026 | Added logout, remove interest, audit trail, phone formatting, organizer search, configurable branding |
| 4.0 | Feb 2026 | Added admin sign-in, admin dashboard, CSV export, Admins sheet |
| 4.1 | Feb 2026 | Added ministry leader dashboard, role-based sign-in (admin vs leader), admin user management (add/remove admins), per-ministry leader signups with qualifying answers |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User's Browser                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              index.html (Single File)            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │   │
│  │  │  HTML   │ │   CSS   │ │   JavaScript    │   │   │
│  │  │ (Views) │ │(Styles) │ │ (App Logic)     │   │   │
│  │  └─────────┘ └─────────┘ └─────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│                   ┌─────────────┐                       │
│                   │ localStorage│                       │
│                   │  (Profile)  │                       │
│                   └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS (fetch)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Google Apps Script                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  doGet()  - Returns ministries, signups, admin   │   │
│  │  doPost() - Writes signups + admin CRUD         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Google Sheets                         │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │    Admins     │ │  App Signups │ │New Parishioners│  │
│  │  (access ctl) │ │    (data)    │ │     (data)     │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
│  ┌──────────────┐                                      │
│  │  Ministries  │                                      │
│  │    (config)  │                                      │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Deployment Checklist

- [ ] Create Google Sheet
- [ ] Add Apps Script code
- [ ] Run testSetup function
- [ ] Deploy Apps Script as web app
- [ ] Copy deployment URL
- [ ] Update CONFIG in index.html
- [ ] Update organization name in CONFIG
- [ ] Update colors in CONFIG (optional)
- [ ] Upload index.html to hosting
- [ ] Test registration flow
- [ ] Test ministry signup
- [ ] Test interest removal
- [ ] Add admin emails to Admins tab
- [ ] Test admin sign-in (?admin)
- [ ] Test admin dashboard (signups, parishioners, ministry CRUD)
- [ ] Add ministries to sheet
- [ ] Generate QR codes
- [ ] Print QR codes for tables
