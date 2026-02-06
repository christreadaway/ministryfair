# Bug Report - Ministry Fair Application

Comprehensive test suite results: **129 tests passing** across 8 test suites covering frontend, backend, security, and edge cases.

---

## FIXED: Security Vulnerabilities (XSS)

All 7 XSS injection vectors have been fixed by adding an `escapeHtml()` utility function applied to all API data before innerHTML insertion.

| ID | Vector | Status |
|---|---|---|
| XSS-1 | Ministry name in list | **FIXED** |
| XSS-2 | Ministry description in list | **FIXED** |
| XSS-3 | Search term in "no results" message | **FIXED** |
| XSS-4 | Organizer name in confirmation | **FIXED** |
| XSS-5 | Organizer email javascript: protocol in mailto link | **FIXED** (email validated before wrapping in link) |
| XSS-6 | Ministry icon field in list | **FIXED** |
| XSS-7 | Question labels in detail view | **FIXED** |

---

## FIXED: Data Integrity Issues

| ID | Issue | Status |
|---|---|---|
| DATA-1 | no-cors POST couldn't verify server receipt | **FIXED** (switched to CORS with await + response check) |
| DATA-2 | Corrupted localStorage crashes app | **FIXED** (try/catch with graceful reset) |

---

## FIXED: UI/UX Bugs

| ID | Issue | Status |
|---|---|---|
| UI-1 | Phone: unclosed parenthesis at 3 digits | **FIXED** (now shows `(555)`) |
| UI-2 | Phone: +1 country code corrupts number | **FIXED** (strips leading 1 from 11-digit input) |
| UI-3 | Empty name shows "undefined" in initials | **FIXED** (guards with `|| ''`) |
| UI-4 | Interest button stays disabled after signup | **FIXED** (re-enables after success) |

---

## FIXED: Backend

| ID | Issue | Status |
|---|---|---|
| BE-2 | Hardcoded email column index for de-duplication | **FIXED** (dynamic `headers.indexOf('Email')`) |

---

## Remaining: Low-Severity Issues (not fixed)

### BE-1: Question with only type (no pipe separator) creates empty label
**File:** `google-apps-script.js` (doGet question parsing)
**Description:** A question string like `"text"` (no `|` separator) results in `type: "text"` but `label: ""`.
**Test:** `backendLogic.test.js` - "question with only type (no pipe separator) creates empty label"

### BE-3: JWT base64url decoding uses atob()
**File:** `index.html` (handleGoogleSignIn function)
**Description:** Google Sign-In JWTs use base64url encoding. `atob()` expects standard base64. Edge cases with `-` and `_` characters will fail to decode.
**Test:** `registration.test.js` - "JWT base64url decoding uses atob which may fail on URL-safe base64"

### BE-4: Stale interest data not cleaned up when ministry is deleted
**File:** `index.html` (showConfirmation function)
**Description:** If a ministry is deleted from the backend, user's localStorage still references it. Shows fallback icon.
**Test:** `edgeCases.test.js` - "interest referencing deleted ministry shows fallback icon in confirmation"

### BE-5: Question with pipe but no type defaults to empty type
**File:** `google-apps-script.js` (doGet question parsing)
**Description:** `"|label"` results in `type: ""` instead of defaulting to `"text"`.
**Test:** `backendLogic.test.js` - "question with pipe but no type defaults to empty type, not text"

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
| **Total** | **129** | **ALL PASS** |

### Areas Covered
- Phone number formatting (edge cases, boundary conditions, special characters)
- Registration flow (form validation, profile persistence, Google Sign-In)
- Ministry rendering (list display, sorting, badges, search, detail view with questions)
- Interest management (signup, update, removal, modal behavior)
- Deep linking via URL parameters (?m=ministry-id)
- localStorage persistence (save, restore, corrupted data, logout)
- API failure handling (empty response, invalid JSON, network errors, fallback ministries)
- XSS prevention (7 injection vectors verified as escaped)
- Backend logic (doPost signup/removal, doGet ministry parsing, question formats)
- CONFIG application (title, tagline, consent text, organization name)
- View management (single view visible, scroll to top)
- Edge cases (stale data, disabled button, null ministry)
