# Bug Report - Ministry Fair Application

Comprehensive test suite results: **129 tests passing** across 8 test suites covering frontend, backend, security, and edge cases.

---

## Critical: Security Vulnerabilities

### XSS-1: Ministry name rendered unsanitized via innerHTML
**File:** `index.html` (renderMinistryList function)
**Severity:** Critical
**Description:** Ministry names from the API are inserted into the DOM via `innerHTML` without sanitization. An attacker who can modify the Google Sheet data could inject arbitrary HTML/JavaScript.
**Test:** `xss.test.js` - "ministry name with HTML is rendered unsanitized in ministry list"

### XSS-2: Ministry description rendered unsanitized
**File:** `index.html` (renderMinistryList function)
**Severity:** Critical
**Description:** Ministry descriptions are rendered via innerHTML without escaping, allowing HTML injection.
**Test:** `xss.test.js` - "ministry description with HTML tags is rendered unsanitized"

### XSS-3: Search term reflected unsanitized in "no results" message
**File:** `index.html` (renderMinistryList function)
**Severity:** High
**Description:** User-typed search text is inserted into the "no results" message via innerHTML. A reflected XSS if the search term is pre-populated or shared.
**Test:** `xss.test.js` - "search term with HTML is rendered unsanitized in no-results message"

### XSS-4: Organizer name rendered unsanitized in confirmation view
**File:** `index.html` (showConfirmation function)
**Severity:** Critical
**Description:** Organizer name from API data is placed into the DOM unsanitized.
**Test:** `xss.test.js` - "organizer name with HTML is rendered unsanitized in confirmation"

### XSS-5: Organizer email with javascript: protocol creates unsafe mailto link
**File:** `index.html` (showConfirmation function)
**Severity:** High
**Description:** The organizer email is placed into an `href="mailto:..."` without validating the protocol. A `javascript:` URI in the email field creates a clickable XSS link.
**Test:** `xss.test.js` - "organizer email with javascript: protocol creates unsafe mailto link"

### XSS-6: Ministry icon field rendered unsanitized
**File:** `index.html` (renderMinistryList function)
**Severity:** Critical
**Description:** The icon field (expected to be an emoji) is inserted via innerHTML. Arbitrary HTML can be injected.
**Test:** `xss.test.js` - "ministry icon field with HTML is rendered unsanitized"

### XSS-7: Question labels rendered unsanitized in detail view
**File:** `index.html` (showMinistryDetail function)
**Severity:** Critical
**Description:** Question labels from the API are rendered via innerHTML template literals without escaping.
**Test:** `xss.test.js` - "question label with HTML is rendered unsanitized in detail view"

**Recommendation:** Replace all `innerHTML` assignments with `textContent` for user-visible text, or implement an HTML escaping utility function applied to all API data before DOM insertion.

---

## High: Data Integrity Issues

### DATA-1: no-cors POST means app cannot verify signup success
**File:** `index.html:1004`
**Severity:** High
**Description:** The app uses `mode: 'no-cors'` for POST requests, which returns opaque responses. The app cannot verify if the server actually received the signup. Combined with fire-and-forget (no await), the user sees a success confirmation even if the POST fails or the server rejects it. Data loss risk.
**Test:** `xss.test.js` - "no-cors POST means app cannot verify signup success - data loss risk"

### DATA-2: Corrupted localStorage crashes the app entirely
**File:** `index.html:599-600`
**Severity:** High
**Description:** `JSON.parse()` on corrupted localStorage data (e.g., `'{invalid json'`) throws an uncaught exception that crashes the entire app. No try/catch around the localStorage read. Users with corrupted storage cannot use the app at all.
**Tests:** `localStorage.test.js` - "corrupted localStorage profile crashes the app", "corrupted localStorage interests crashes the app"

### DATA-3: Backend null postData returns opaque error
**File:** `google-apps-script.js` (doPost)
**Severity:** Medium
**Description:** When `postData` is null (malformed request), the try/catch returns a generic error response (`success: false`) without meaningful diagnostics. Makes debugging production issues difficult.
**Test:** `backendLogic.test.js` - "null postData is caught by try/catch but returns error instead of crashing"

---

## Medium: UI/UX Bugs

### UI-1: Phone formatting shows unclosed parenthesis at 3 digits
**File:** `index.html` (formatPhoneNumber function)
**Severity:** Low
**Description:** When exactly 3 digits are entered, the formatted output is `(555` with an unclosed parenthesis. Expected: `(555)`.
**Test:** `formatPhoneNumber.test.js` - "BUG: 3 digits has unclosed parenthesis"

### UI-2: Country code +1 prefix corrupts phone number formatting
**File:** `index.html` (formatPhoneNumber function)
**Severity:** Medium
**Description:** Input like `+15551234567` strips only digits to get `15551234567` (11 digits), then truncates to 10 (`1555123456`), producing wrong output `(155) 512-3456` instead of `(555) 123-4567`.
**Test:** `formatPhoneNumber.test.js` - "country code +1 prefix is not stripped, corrupts number"

### UI-3: Empty firstName/lastName causes "undefined" in profile initials
**File:** `index.html` (showMinistriesList function)
**Severity:** Medium
**Description:** `profile.firstName[0]` on an empty string returns `undefined`, which gets concatenated into the initials display as the literal string "undefined". Displays "undefinedU" or "Tundefined".
**Tests:** `registration.test.js` - "empty firstName causes initials to show undefined", "empty lastName causes initials to show undefined"

### UI-4: Interest button stays disabled after signup (prevents multiple signups in session)
**File:** `index.html:967`
**Severity:** Medium
**Description:** The interest-btn click handler sets `btn.disabled = true` at the start but never re-enables it on success. After signing up for one ministry, the button remains disabled. If the user navigates to another ministry without a full page reload, they cannot sign up.
**Test:** `localStorage.test.js` - "multiple interests are tracked correctly" (required workaround)

---

## Low: Backend Data Handling

### BE-1: Question with only type (no pipe separator) creates empty label
**File:** `google-apps-script.js` (doGet question parsing)
**Severity:** Low
**Description:** A question string like `"text"` (no `|` separator) results in `type: "text"` but `label: ""`, rendering an empty label in the UI.
**Test:** `backendLogic.test.js` - "question with only type (no pipe separator) creates empty label"

### BE-2: Email column index hardcoded in de-duplication logic
**File:** `google-apps-script.js:40`
**Severity:** Low
**Description:** `const emailColumn = 4` assumes the "Email" column is always at index 4 in the New Parishioners sheet. If headers are reordered or columns added, de-duplication silently breaks.
**Test:** `backendLogic.test.js` - "email column index is hardcoded to 4, brittle if headers change"

### BE-3: JWT base64url decoding uses atob() which doesn't handle URL-safe encoding
**File:** `index.html` (handleGoogleSignIn function)
**Severity:** Low
**Description:** Google Sign-In JWTs use base64url encoding (with `-` and `_` instead of `+` and `/`). The code uses `atob()` which expects standard base64. For most typical payloads the characters don't differ, but edge cases with certain character values will fail to decode.
**Test:** `registration.test.js` - "JWT base64url decoding uses atob which may fail on URL-safe base64"

### BE-4: Stale interest data not cleaned up when ministry is deleted
**File:** `index.html` (showConfirmation function)
**Severity:** Low
**Description:** If a ministry is deleted from the backend but the user still has it in localStorage interests, the confirmation page shows the stale ministry with a fallback icon. No mechanism to clean up orphaned interests.
**Test:** `edgeCases.test.js` - "interest referencing deleted ministry shows fallback icon in confirmation"

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
- XSS vulnerabilities (7 distinct injection vectors)
- Backend logic (doPost signup/removal, doGet ministry parsing, question formats)
- CONFIG application (title, tagline, consent text, organization name)
- View management (single view visible, scroll to top)
- Edge cases (stale data, disabled button, null ministry)
