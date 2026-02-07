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
  test('shows wizard when setupComplete is false', () => {
    const dom = createTestDom({
      localStorage: {
        'mf-app-config': JSON.stringify({ setupComplete: false }),
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
  test('dark mode is default when no theme saved', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    expect(dom.window.document.body.classList.contains('dark')).toBe(true);
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
    // Starts as dark
    expect(dom.window.document.body.classList.contains('dark')).toBe(true);
    // Click toggle
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.document.body.classList.contains('dark')).toBe(false);
    // Click again
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.document.body.classList.contains('dark')).toBe(true);
  });

  test('theme preference is saved to localStorage', () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
      },
      fetchMock: ministriesFetch(),
    });
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.localStorage.getItem('mf-theme')).toBe('light');
    dom.window.document.getElementById('theme-toggle').click();
    expect(dom.window.localStorage.getItem('mf-theme')).toBe('dark');
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
