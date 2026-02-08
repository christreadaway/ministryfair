# Product Spec: Parish Ministry Fair App

**Version:** 3.0  
**Last Updated:** January 2026

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
| Manual entry | Admin tab to enter signups from physical paper sign-up sheets |
| Follow-up questionnaires | Ministry leads configure custom follow-up questions with shareable links |
| Browser navigation | Back/forward buttons work within the app using History API |

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

**To Google Sheet (Follow-Up Questions tab):**

| Field | Type | Example |
|-------|------|---------|
| Ministry ID | Text | music |
| Ministry Name | Text | Music Ministry |
| Q1-Q10 | Text | select\|Day availability\|Mon,Tue,Wed,Thu,Fri |

**To Google Sheet (Follow-Up Responses tab):**

| Field | Type | Example |
|-------|------|---------|
| Date | Date | 2/8/26 |
| Time | Time | 3:30 PM |
| First | Text | Maria |
| Last | Text | Garcia |
| Email | Email | maria@email.com |
| Phone | Phone | (512) 555-1234 |
| Ministry | Text | Music Ministry |
| Q1-Q10 | Text | Monday, Wednesday |

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

### Follow-Up Questionnaires
- URL parameter `?followup=ministry-id` opens a standalone follow-up form
- Ministry leads (or admins) configure up to 10 custom questions per ministry
- Questions support text, dropdown, and checkbox types (same format as qualifying questions)
- Responses saved to dedicated "Follow-Up Responses" sheet
- Follow-up form does not require prior registration (standalone)
- Pre-fills contact info from saved profile if available
- Designed for post-fair outreach: availability, preferences, scheduling, etc.

### Manual Entry (Physical Signup Sheets)
- Admins can enter signups from paper sheets via the "Manual Entry" tab
- Same data captured as digital signups: name, email, phone, ministry, questions
- Recorded with action type "Manual Entry" for audit trail distinction
- New parishioner flag respected (triggers New Parishioners sheet entry)

### Browser Navigation
- All view transitions push state to browser history
- Back/forward buttons navigate between app views (not away from app)
- Clicking the app title in nav bar returns to ministries list

---

## Data Requirements

### Local Storage (Browser)
| Key | Content |
|-----|---------|
| `ministry-fair-profile` | JSON: firstName, lastName, email, phone, wantsToJoinParish |
| `ministry-fair-interests` | JSON array: ministryId, ministryName, answers, timestamp |

### Google Sheets

**Ministries Tab (read by app):**
- ID, Name, Description, Icon, Organizer Name, Organizer Email, Organizer Phone, Question 1-3

**App Signups Tab (written by app):**
- Date, Time, First, Last, Email, Phone, New Parishioner, Ministry, Action, Q1-Q3

**New Parishioners Tab (written by app):**
- Date, Time, First, Last, Email, Phone

---

## Integrations and Dependencies

| Dependency | Purpose | Required |
|------------|---------|----------|
| Google Sheets | Data storage | Yes |
| Google Apps Script | API backend | Yes |
| Google Fonts | Typography (Crimson Pro, Inter) | No (fallback fonts work) |
| localStorage | Client-side persistence | Yes |

### External Services
- No authentication required
- No payment processing
- No email sending (manual follow-up by ministry leaders)

---

## Out of Scope (v3)

The following are explicitly NOT included in this version:

- User accounts / authentication
- Email notifications to ministry leaders
- SMS notifications
- Admin dashboard
- Analytics / reporting
- Multi-language support
- Offline mode (requires internet for initial load + signups)
- Photo upload
- Calendar integration
- Ministry leader login to view signups

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
| 4.0 | Feb 2026 | Added physical signup manual entry, follow-up questionnaire links, browser back button support, parishioner nav bar |

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
│  │  doGet()  - Returns ministry list as JSON       │   │
│  │  doPost() - Writes signup/removal to sheet      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Google Sheets                         │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │  Ministries  │ │  App Signups │ │New Parishioners│  │
│  │    (config)  │ │    (data)    │ │     (data)     │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
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
- [ ] Add ministries to sheet
- [ ] Generate QR codes
- [ ] Print QR codes for tables
