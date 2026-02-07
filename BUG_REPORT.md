# Bug Report - Ministry Fair Application (Round 2)

Comprehensive test suite results: **160 tests passing** across 9 test suites covering frontend, backend, security, admin features, and edge cases.

This round covers bugs introduced by the new admin/wizard feature branches merged into the codebase.

---

## FIXED: XSS Regressions (CRITICAL)

The new feature branches completely removed the `escapeHtml()` function and all XSS protections from Round 1. All 14+ innerHTML injection points were unescaped.

| ID | Vector | Location | Status |
|---|---|---|---|
| XSS-R1 | Ministry name in list | `renderMinistryList()` | **FIXED** |
| XSS-R2 | Ministry description in list | `renderMinistryList()` | **FIXED** |
| XSS-R3 | Ministry icon in list | `renderMinistryList()` | **FIXED** |
| XSS-R4 | Search term in "no results" message | `renderMinistryList()` | **FIXED** |
| XSS-R5 | Organizer name in confirmation | `showConfirmation()` | **FIXED** |
| XSS-R6 | Organizer email javascript: protocol | `showConfirmation()` | **FIXED** (email validated before mailto link) |
| XSS-R7 | Question labels in detail view | `showMinistryDetail()` | **FIXED** |
| XSS-R8 | Question options in detail view | `showMinistryDetail()` | **FIXED** |
| XSS-R9 | Domain name in detection cards | `runDomainDetection()` | **FIXED** |
| XSS-R10 | AI detection org name/meta | `showDetectionResult()` | **FIXED** |
| XSS-R11 | Admin names/emails in wizard list | `renderAdminList()` | **FIXED** |
| XSS-R12 | Admin names/emails in settings | `showSettingsView()` | **FIXED** |
| XSS-R13 | Summary view (org, title, tagline, URL) | `renderSummary()` | **FIXED** |
| XSS-R14 | AI mapping column notes & suggestions | `renderMappingResults()` | **FIXED** |
| XSS-R15 | Data preview table values | `renderDataPreview()` | **FIXED** |
| XSS-R16 | Connection test error messages | test-connection handler | **FIXED** |
| XSS-R17 | AI analysis error messages | `analyzeWithAI()` | **FIXED** |
| XSS-R18 | Email template names/subjects/bodies | `renderEmailTemplates()` | **FIXED** |
| XSS-R19 | Interest ministry names in confirmation list | `showConfirmation()` | **FIXED** |

---

## FIXED: Security Regressions

| ID | Issue | Status |
|---|---|---|
| SEC-1 | `decodeJwt()` uses plain `atob()` without base64url conversion (regression) | **FIXED** |
| SEC-2 | `isValidEmail()` added to reject `javascript:` protocol in mailto links | **FIXED** |
| SEC-3 | `renderGoogleButton()` infinite retry loop if Google SDK never loads | **FIXED** (max 50 retries / ~10 seconds) |

---

## FIXED: Data Integrity Regressions

| ID | Issue | Status |
|---|---|---|
| DATA-R1 | Signup POST reverted to `mode: 'no-cors'` (can't verify server receipt) | **FIXED** (CORS with await + response check) |
| DATA-R2 | Removal POST also used `mode: 'no-cors'` | **FIXED** (removed `mode: 'no-cors'`) |

---

## FIXED: UI/UX Regressions

| ID | Issue | Status |
|---|---|---|
| UI-R1 | `formatPhoneNumber` regression: unclosed parenthesis at 3 digits | **FIXED** (`(555)` not `(555`) |
| UI-R2 | `formatPhoneNumber` regression: no +1 country code stripping | **FIXED** |
| UI-R3 | Interest button stays disabled after submission | **FIXED** (`btn.disabled = false` before `showConfirmation()`) |
| UI-R4 | No stale interest cleanup when ministries are deleted | **FIXED** (cleanup on load using Set of valid IDs) |

---

## FIXED: Logic Bugs

| ID | Issue | Status |
|---|---|---|
| LOGIC-1 | `savedProfile` is stale `const` reference from page load | **FIXED** (replaced with `hasSavedProfile()` function) |

---

## Remaining: Low-Severity / Design Issues (not fixed)

### API-KEY-1: Claude API key stored in plaintext in localStorage
**File:** `index.html` (line ~3219)
**Description:** `appConfig.claudeApiKey` is saved to localStorage in plain text. Anyone with access to the browser can read it. Settings view partially masks it (shows last 4 chars).
**Risk:** Medium - API key exposure could lead to unauthorized API usage.
**Recommendation:** Consider server-side proxy for API calls or encrypt the key before storage.

### DESIGN-1: Settings items appear clickable but have no edit handlers
**File:** `index.html` (settings view)
**Description:** Organization Name, App Title, Theme Color, API URL, etc. are styled as interactive items in settings but clicking them does nothing.
**Risk:** Low - UX confusion only.

### DESIGN-2: Admin added via email gets ugly firstName
**File:** `index.html` (line ~3154)
**Description:** When adding an admin by email, `firstName` is derived from the email local part (e.g., "john.doe"). This creates ugly display names.
**Recommendation:** Add a name field or prompt when adding admins.

### DESIGN-3: Hash navigation edge case with #/start
**File:** `index.html` (hashchange handler)
**Description:** If user navigates to `#/start` after setup is complete, the wizard is still shown via the hashchange handler (line ~3894), even though boot() would skip it. The hashchange handler doesn't check `appConfig.setupComplete`.
**Recommendation:** Add `setupComplete` guard to the hashchange handler for `#/start`.

---

## Test Coverage Summary

| Test Suite | Tests | Status |
|---|---|---|
| formatPhoneNumber.test.js | 24 | PASS |
| backendLogic.test.js | 22 | PASS |
| registration.test.js | 18 | PASS |
| ministryRendering.test.js | 17 | PASS |
| edgeCases.test.js | 24 | PASS |
| localStorage.test.js | 10 | PASS |
| xss.test.js | 8 | PASS |
| deepLinking.test.js | 5 | PASS |
| adminSetup.test.js | 31 | PASS |
| **Total** | **160** | **ALL PASS** |

### New Areas Covered (Round 2)
- Boot sequence routing (wizard vs register vs ministries based on setupComplete)
- Admin role system (isAdmin, getUserRole, case-insensitive matching)
- Admin session auto-creation for saved profiles
- Nav bar visibility for admin users
- App config persistence (load/save/apply)
- Dark mode (default, toggle, localStorage persistence)
- CSV/TSV parsing (simple, quoted, escaped quotes, CRLF, empty input)
- JWT base64url decoding
- escapeHtml utility function (all special chars, null/undefined)
- isValidEmail utility (valid emails, javascript: protocol, null/empty)
- XSS in admin wizard features (admin list rendering)

### Previous Coverage (Round 1, still passing)
- Phone number formatting (edge cases, boundary conditions)
- Registration flow (form validation, profile persistence, Google Sign-In)
- Ministry rendering (list, sorting, badges, search, detail with questions)
- Interest management (signup, update, removal, modal behavior)
- Deep linking via URL parameters (?m=ministry-id)
- localStorage persistence (save, restore, corrupted data, logout)
- API failure handling (empty, invalid JSON, network errors, fallbacks)
- XSS prevention (7 core injection vectors)
- Backend logic (doPost signup/removal, doGet ministry parsing, question formats)
- CONFIG application (title, tagline, consent text, organization name)
- View management (single view visible, scroll to top)
- Edge cases (stale data, disabled button, null ministry)
