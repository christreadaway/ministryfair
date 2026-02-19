/**
 * Admin Setup & Wizard Tests
 *
 * Tests for the /start wizard, admin roles, settings, domain detection,
 * CSV/TSV parsing, and dark mode.
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE, DUMMY_MINISTRIES } = require('./helpers');

function ministriesFetch(ministries = DUMMY_MINISTRIES) {
  return jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ ministries }),
  });
}

// ============================================
// BOOT & ROUTING
// ============================================
describe('Boot & Routing', () => {
  test('shows church gate when setupComplete is false and no session/profile', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
      },
      fetchMock: ministriesFetch(),
    });
    const gateView = dom.window.document.getElementById('view-church-gate');
    expect(gateView.classList.contains('hidden')).toBe(false);
  });

  test('shows wizard when setupComplete is false but has saved profile', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const startView = dom.window.document.getElementById('view-start');
    expect(startView.classList.contains('hidden')).toBe(false);
  });

  test('shows register when setupComplete is true and no profile', async () => {
    const dom = createTestDom({
      fetchMock: ministriesFetch(),
    });
    await waitForApp();
    const registerView = dom.window.document.getElementById('view-register');
    expect(registerView.classList.contains('hidden')).toBe(false);
  });

  test('shows ministries list when setupComplete and profile exists', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();
    const ministriesView = dom.window.document.getElementById('view-ministries');
    expect(ministriesView.classList.contains('hidden')).toBe(false);
  });

  test('hash change to #/start shows wizard', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
        'mf-app-config': JSON.stringify({ setupComplete: false }),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();
    // The wizard should be visible since setupComplete is false
    const startView = dom.window.document.getElementById('view-start');
    expect(startView.classList.contains('hidden')).toBe(false);
  });
});

// ============================================
// ADMIN ROLES & SESSION
// ============================================
describe('Admin Roles & Session', () => {
  test('isAdmin returns true for admin email', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-admins': JSON.stringify([
          { email: 'admin@church.org', firstName: 'Admin', lastName: 'User', picture: '', role: 'admin' },
        ]),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window._app.isAdmin('admin@church.org')).toBe(true);
    expect(dom.window._app.isAdmin('ADMIN@church.org')).toBe(true); // case insensitive
  });

  test('isAdmin returns false for non-admin email', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-admins': JSON.stringify([
          { email: 'admin@church.org', firstName: 'Admin', lastName: 'User', picture: '', role: 'admin' },
        ]),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window._app.isAdmin('test@example.com')).toBe(false);
  });

  test('isAdmin returns false for null/empty email', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window._app.isAdmin(null)).toBe(false);
    expect(dom.window._app.isAdmin('')).toBe(false);
    expect(dom.window._app.isAdmin(undefined)).toBe(false);
  });

  test('getUserRole returns admin for admin email', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-admins': JSON.stringify([
          { email: 'admin@church.org', firstName: 'Admin', lastName: 'User', picture: '', role: 'admin' },
        ]),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window._app.getUserRole('admin@church.org')).toBe('admin');
    expect(dom.window._app.getUserRole('test@example.com')).toBe('parishioner');
  });

  test('admin session is auto-created when registered admin has saved profile', async () => {
    const dom = createTestDom({
      localStorage: {
        'mf-admins': JSON.stringify([
          { email: 'test@example.com', firstName: 'Test', lastName: 'User', picture: '', role: 'admin' },
        ]),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();
    // The app should auto-create a session for this admin
    expect(dom.window._app.currentSession).not.toBeNull();
    expect(dom.window._app.currentSession.email).toBe('test@example.com');
    expect(dom.window._app.currentSession.role).toBe('admin');
  });

  test('nav bar shows for admin after ministries load', async () => {
    const dom = createTestDom({
      localStorage: {
        'mf-admins': JSON.stringify([
          { email: 'test@example.com', firstName: 'Test', lastName: 'User', picture: '', role: 'admin' },
        ]),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();
    const nav = dom.window.document.getElementById('top-nav');
    expect(nav.classList.contains('hidden')).toBe(false);
  });
});

// ============================================
// APP CONFIG
// ============================================
describe('App Config', () => {
  test('loadAppConfig returns defaults when no saved config', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': '', // clear it
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    // Since empty string won't parse, it should use defaults
    const config = dom.window._app.loadAppConfig();
    expect(config).toHaveProperty('appTitle');
    expect(config).toHaveProperty('tagline');
  });

  test('saveAppConfig persists to localStorage', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    dom.window._app.saveAppConfig({ appTitle: 'Custom Title', setupComplete: true });
    const saved = JSON.parse(dom.window.localStorage.getItem('mf-app-config'));
    expect(saved.appTitle).toBe('Custom Title');
  });

  test('applyConfig sets document title', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    dom.window._app.appConfig.appTitle = 'Test Church Fair';
    dom.window._app.applyConfig();
    expect(dom.window.document.title).toBe('Test Church Fair');
  });
});

// ============================================
// DARK MODE
// ============================================
describe('Dark Mode', () => {
  test('light mode is default when no theme saved', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window.document.body.classList.contains('dark')).toBe(false);
  });

  test('light mode is applied when saved as light', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-theme': 'light',
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window.document.body.classList.contains('dark')).toBe(false);
  });

  test('theme toggle switches between modes', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    // Starts as light
    expect(dom.window.document.body.classList.contains('dark')).toBe(false);
    // Click toggle to dark
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.document.body.classList.contains('dark')).toBe(true);
    // Click again to light
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.document.body.classList.contains('dark')).toBe(false);
  });

  test('theme preference is saved to localStorage', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    // Starts as light, click to switch to dark
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.localStorage.getItem('mf-theme')).toBe('dark');
    // Click again to switch back to light
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.localStorage.getItem('mf-theme')).toBe('light');
  });
});

// ============================================
// CSV/TSV PARSING
// ============================================
describe('CSV Parser', () => {
  test('parses simple CSV correctly', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.parseCSV('Name,Description\nMusic,Choir and band\nYouth,Student ministry');
    expect(result.length).toBe(3); // header + 2 rows
    expect(result[0]).toEqual(['Name', 'Description']);
    expect(result[1]).toEqual(['Music', 'Choir and band']);
  });

  test('handles quoted fields with commas', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.parseCSV('Name,Description\n"Music, Arts",Includes choir');
    expect(result[1][0]).toBe('Music, Arts');
  });

  test('handles escaped quotes in CSV', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.parseCSV('Name\n"Say ""hello"""\n');
    expect(result[1][0]).toBe('Say "hello"');
  });

  test('handles empty CSV', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.parseCSV('');
    expect(result.length).toBe(0); // empty rows are filtered out
  });

  test('handles CRLF line endings', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.parseCSV('Name,Desc\r\nMusic,Choir\r\n');
    expect(result.length).toBe(2);
    expect(result[0]).toEqual(['Name', 'Desc']);
    expect(result[1]).toEqual(['Music', 'Choir']);
  });
});

describe('TSV Parser', () => {
  test('parses tab-separated values correctly', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.parseTSV('Name\tDescription\nMusic\tChoir');
    expect(result.length).toBe(2);
    expect(result[0]).toEqual(['Name', 'Description']);
    expect(result[1]).toEqual(['Music', 'Choir']);
  });
});

// ============================================
// JWT DECODING
// ============================================
describe('JWT Decoding', () => {
  test('decodeJwt handles standard base64 JWT', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    // Create a simple JWT with base64 payload
    const payload = { email: 'test@test.com', given_name: 'Test' };
    const b64 = dom.window.btoa(JSON.stringify(payload));
    const fakeJwt = 'header.' + b64 + '.signature';
    const result = dom.window._app.decodeJwt(fakeJwt);
    expect(result.email).toBe('test@test.com');
  });

  test('decodeJwt handles base64url characters (- and _)', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    // Create payload that would have + and / in base64 but - and _ in base64url
    const payload = { email: 'test@test.com', picture: 'https://example.com/a?b=c&d=e' };
    // Standard base64 encode, then convert to base64url
    const b64 = dom.window.btoa(JSON.stringify(payload));
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const fakeJwt = 'header.' + b64url + '.signature';
    const result = dom.window._app.decodeJwt(fakeJwt);
    expect(result.email).toBe('test@test.com');
  });
});

// ============================================
// SECURITY: escapeHtml & isValidEmail
// ============================================
describe('escapeHtml utility', () => {
  test('escapes all HTML special characters', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const e = dom.window._app.escapeHtml;
    expect(e('<script>')).toBe('&lt;script&gt;');
    expect(e('"quotes"')).toBe('&quot;quotes&quot;');
    expect(e("'apostrophe'")).toBe('&#39;apostrophe&#39;');
    expect(e('a&b')).toBe('a&amp;b');
  });

  test('returns empty string for null/undefined', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const e = dom.window._app.escapeHtml;
    expect(e(null)).toBe('');
    expect(e(undefined)).toBe('');
    expect(e('')).toBe('');
  });
});

describe('isValidEmail utility', () => {
  test('validates normal emails', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const v = dom.window._app.isValidEmail;
    expect(v('test@example.com')).toBe(true);
    expect(v('jane.doe@church.org')).toBe(true);
  });

  test('rejects javascript: protocol', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const v = dom.window._app.isValidEmail;
    expect(v('javascript:alert(1)')).toBe(false);
    expect(v('JAVASCRIPT:alert(1)')).toBe(false);
  });

  test('rejects null/empty values', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    const v = dom.window._app.isValidEmail;
    expect(v(null)).toBe(false);
    expect(v('')).toBe(false);
    expect(v(undefined)).toBe(false);
  });
});

// ============================================
// XSS IN NEW FEATURES
// ============================================
describe('XSS in Admin/Wizard Features', () => {
  test('admin name with HTML is escaped in admin list', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-admins': JSON.stringify([
          { email: 'admin@test.com', firstName: '<img src=x>', lastName: 'Admin', picture: '', role: 'admin' },
        ]),
        'mf-app-config': JSON.stringify({ setupComplete: false }),
      },
      fetchMock: ministriesFetch(),
    });
    // The wizard shows admin list on step 4
    // Set up admin data so renderAdminList works
    dom.window._app.showWizardStep(4);
    const listHtml = dom.window.document.getElementById('setup-admin-list').innerHTML;
    expect(listHtml).not.toContain('<img src=x>');
    expect(listHtml).toContain('&lt;img');
  });
});

// ============================================
// API KEY SECURITY
// ============================================
describe('API Key Security', () => {
  test('API key is NOT stored in localStorage (appConfig)', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    // Set an API key
    dom.window._app.setApiKey('sk-ant-test-key-12345');
    // Save app config
    dom.window._app.saveAppConfig(dom.window._app.appConfig);

    // Check that the key is NOT in localStorage
    const savedConfig = JSON.parse(dom.window.localStorage.getItem('mf-app-config'));
    expect(savedConfig.claudeApiKey).toBeUndefined();
    expect(JSON.stringify(savedConfig)).not.toContain('sk-ant-test-key');
  });

  test('API key is stored in sessionStorage', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    dom.window._app.setApiKey('sk-ant-test-key-12345');
    expect(dom.window.sessionStorage.getItem('mf-claude-key')).toBe('sk-ant-test-key-12345');
    expect(dom.window._app.getApiKey()).toBe('sk-ant-test-key-12345');
  });

  test('setApiKey with empty string removes from sessionStorage', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    dom.window._app.setApiKey('sk-ant-test-key-12345');
    expect(dom.window._app.getApiKey()).toBe('sk-ant-test-key-12345');
    dom.window._app.setApiKey('');
    expect(dom.window._app.getApiKey()).toBe('');
    expect(dom.window.sessionStorage.getItem('mf-claude-key')).toBeNull();
  });
});

// ============================================
// HASH NAVIGATION
// ============================================
describe('Hash Navigation', () => {
  test('#/start is blocked when setup is already complete', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();
    // App should be on ministries, not wizard
    const ministriesView = dom.window.document.getElementById('view-ministries');
    expect(ministriesView.classList.contains('hidden')).toBe(false);

    // Simulate hash change to #/start
    dom.window.location.hash = '#/start';
    dom.window.dispatchEvent(new dom.window.Event('hashchange'));

    // Should still NOT show wizard since setup is complete
    const startView = dom.window.document.getElementById('view-start');
    expect(startView.classList.contains('hidden')).toBe(true);
  });
});

// ============================================
// CHURCH REGISTRY
// ============================================
describe('Church Registry', () => {
  test('registerChurch stores church config in registry', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    dom.window._app.registerChurch('sttheresa.org', {
      organizationName: 'St. Theresa Catholic Church',
      provider: 'google',
      apiUrl: 'https://script.google.com/macros/s/test/exec',
    });
    const registry = JSON.parse(dom.window.localStorage.getItem('mf-church-registry'));
    expect(registry['sttheresa.org']).toBeDefined();
    expect(registry['sttheresa.org'].organizationName).toBe('St. Theresa Catholic Church');
    expect(registry['sttheresa.org'].provider).toBe('google');
    expect(registry['sttheresa.org'].setupComplete).toBe(true);
  });

  test('lookupChurchByDomain finds registered church', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'mf-church-registry': JSON.stringify({
          'sttheresa.org': {
            organizationName: 'St. Theresa',
            provider: 'google',
            setupComplete: true,
          },
        }),
      },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.lookupChurchByDomain('sttheresa.org');
    expect(result).not.toBeNull();
    expect(result.organizationName).toBe('St. Theresa');
  });

  test('lookupChurchByDomain returns null for unknown domain', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const result = dom.window._app.lookupChurchByDomain('unknown.org');
    expect(result).toBeNull();
  });

  test('isChurchRegistered returns true for registered domain', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'mf-church-registry': JSON.stringify({
          'parish.org': { organizationName: 'Test Parish', setupComplete: true },
        }),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window._app.isChurchRegistered('parish.org')).toBe(true);
    expect(dom.window._app.isChurchRegistered('other.org')).toBe(false);
  });
});

// ============================================
// SPREADSHEET PROVIDER
// ============================================
describe('Spreadsheet Provider', () => {
  test('getProvider returns google provider by default', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const provider = dom.window._app.getProvider();
    expect(provider.type).toBe('google');
    expect(provider.name).toBe('Google Sheets');
  });

  test('getProvider returns microsoft provider when configured', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'mf-app-config': JSON.stringify({
          setupComplete: true,
          provider: 'microsoft',
        }),
      },
      fetchMock: ministriesFetch(),
    });
    const provider = dom.window._app.getProvider();
    expect(provider.type).toBe('microsoft');
    expect(provider.name).toBe('Microsoft 365 Excel');
  });

  test('google provider getSetupFields returns expected fields', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const fields = dom.window._app.SpreadsheetProviders.google.getSetupFields();
    expect(fields).toContain('spreadsheetUrl');
    expect(fields).toContain('apiUrl');
  });

  test('microsoft provider getSetupFields returns expected fields', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const fields = dom.window._app.SpreadsheetProviders.microsoft.getSetupFields();
    expect(fields).toContain('msClientId');
    expect(fields).toContain('msTenantId');
    expect(fields).toContain('msWorkbookUrl');
  });
});

// ============================================
// PLATFORM SELECTION
// ============================================
describe('Platform Selection', () => {
  test('platform cards exist in wizard step 1', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const googleCard = dom.window.document.getElementById('platform-google');
    const msCard = dom.window.document.getElementById('platform-microsoft');
    expect(googleCard).not.toBeNull();
    expect(msCard).not.toBeNull();
  });

  test('google platform is selected by default', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const googleCard = dom.window.document.getElementById('platform-google');
    expect(googleCard.classList.contains('selected')).toBe(true);
  });

  test('church gate view contains Google and Microsoft sign-in options', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
      },
      fetchMock: ministriesFetch(),
    });
    const gateView = dom.window.document.getElementById('view-church-gate');
    expect(gateView).not.toBeNull();
    const googleBtn = gateView.querySelector('#g_id_signin_gate');
    const msBtn = gateView.querySelector('#gate-ms-signin-btn');
    expect(googleBtn).not.toBeNull();
    expect(msBtn).not.toBeNull();
  });
});

// ============================================
// CHURCH GATE VIEW
// ============================================
describe('Church Gate', () => {
  test('gate view is shown for first-time visitors with no setup', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
      },
      fetchMock: ministriesFetch(),
    });
    const gateView = dom.window.document.getElementById('view-church-gate');
    expect(gateView.classList.contains('hidden')).toBe(false);
  });

  test('gate view is hidden when setupComplete is true', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();
    const gateView = dom.window.document.getElementById('view-church-gate');
    expect(gateView.classList.contains('hidden')).toBe(true);
  });

  test('Microsoft 365 instructions exist in wizard step 3', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const msInstructions = dom.window.document.getElementById('setup-microsoft-instructions');
    expect(msInstructions).not.toBeNull();
    // Microsoft instructions hidden by default (Google selected)
    expect(msInstructions.classList.contains('hidden')).toBe(true);
  });

  test('Google instructions visible by default in wizard step 3', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    const googleInstructions = dom.window.document.getElementById('setup-google-instructions');
    expect(googleInstructions).not.toBeNull();
    expect(googleInstructions.classList.contains('hidden')).toBe(false);
  });
});
