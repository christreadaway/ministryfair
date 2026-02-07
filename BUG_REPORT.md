# Bug Report - Ministry Fair Application (Round 2)

Comprehensive test suite results: **176 tests passing** across 9 test suites covering frontend, backend, security, admin features, AI proxy, and edge cases.

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

## FIXED: Low-Severity & Design Issues

| ID | Issue | Status |
|---|---|---|
| API-KEY-1 | Claude API key in plaintext localStorage | **FIXED** - key removed from localStorage/appConfig; stored in sessionStorage during setup, then sent to GAS server-side Script Properties. GAS proxy routes all AI calls server-side after setup. |
| DESIGN-1 | Settings items clickable but no edit handlers | **FIXED** - all settings items (org name, app title, API URL, sheet URL, Claude API key) now editable via prompt() dialogs |
| DESIGN-2 | Admin email-only additions get ugly display names | **FIXED** - email local part split on dots/dashes/underscores, title-cased (e.g. "john.doe" -> "John Doe") |
| DESIGN-3 | `#/start` hash shows wizard after setup complete | **FIXED** - hashchange handler checks `appConfig.setupComplete` before showing wizard |

### Architecture: Claude API Key Security (API-KEY-1 detail)
**Before:** API key stored in `appConfig.claudeApiKey` in localStorage (plaintext, persisted, readable by DevTools/XSS).

**After (3-tier approach):**
1. **During setup wizard:** Key entered in password input, held temporarily in `sessionStorage` (cleared on tab close)
2. **On setup completion:** Key sent to Google Apps Script backend, stored as a **Script Property** (encrypted at rest by Google, never visible in the spreadsheet)
3. **After setup:** All AI calls (domain lookup, spreadsheet analysis) route through GAS server-side proxy. Browser never handles the key again.

**GAS endpoints added:**
- `store-api-key` - securely stores the key in Script Properties
- `check-api-key` - checks if a server-side key exists (returns boolean, not the key)
- `ai-lookup` - proxied domain detection via Claude
- `ai-analyze` - proxied spreadsheet analysis via Claude
- `setClaudeApiKey()` - manual GAS editor function as alternative setup method

---

## Test Coverage Summary

| Test Suite | Tests | Status |
|---|---|---|
| formatPhoneNumber.test.js | 24 | PASS |
| backendLogic.test.js | 34 | PASS |
| registration.test.js | 18 | PASS |
| ministryRendering.test.js | 17 | PASS |
| edgeCases.test.js | 24 | PASS |
| localStorage.test.js | 10 | PASS |
| xss.test.js | 8 | PASS |
| deepLinking.test.js | 5 | PASS |
| adminSetup.test.js | 35 | PASS |
| **Total** | **176** | **ALL PASS** |

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
- API key security (sessionStorage, not in localStorage, server-side storage)
- Hash navigation guarding (#/start blocked after setup)
- GAS proxy: store-api-key, check-api-key, ai-lookup, ai-analyze (12 tests)

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
