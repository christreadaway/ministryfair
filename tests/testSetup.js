/**
 * Shared test setup utilities.
 *
 * The key challenge: the app script uses `const`/`let` at top level.
 * When eval'd in jsdom, these are block-scoped and NOT accessible on `window`.
 * We fix this by rewriting `const`/`let` at the top-level to `var` and
 * exposing state via a `window._app` helper object with getters/setters.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAW_HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

// Extract the MAIN script (the large one, not the small theme script)
// Match the last <script>...</script> block in the file
const SCRIPT_MATCHES = [...RAW_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const RAW_SCRIPT = SCRIPT_MATCHES.length > 0
  ? SCRIPT_MATCHES[SCRIPT_MATCHES.length - 1][1]
  : '';

// Rewrite top-level const/let to var so they end up on `window`
function makeGlobalVars(script) {
  return script
    .replace(/^const /gm, 'var ')
    .replace(/^let /gm, 'var ');
}

const APP_SCRIPT = makeGlobalVars(RAW_SCRIPT);

function getCleanedHtml() {
  return RAW_HTML
    .replace(/<script src="https:\/\/accounts\.google\.com[^"]*"[^>]*><\/script>/, '')
    .replace(/<link rel="preconnect"[^>]*>/g, '')
    .replace(/<link href="https:\/\/fonts\.googleapis[^"]*"[^>]*>/g, '')
    // Remove ALL script tags (both theme script and main app script)
    .replace(/<script>[\s\S]*?<\/script>/g, '<script></script>');
}

/**
 * Create a JSDOM instance with the app HTML, configured mocks, and run the app script.
 */
function createTestDom(options = {}) {
  const {
    localStorage: localStorageData = {},
    urlParams = '',
    urlHash = '',
    fetchMock = null,
    confirmMock = null,
    runScript = true,
  } = options;

  let url = urlParams ? `http://localhost?${urlParams}` : 'http://localhost';
  if (urlHash) url += urlHash;
  const htmlNoScript = getCleanedHtml();

  const dom = new JSDOM(htmlNoScript, {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = fetchMock || jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ ministries: [] }),
      });
      window.alert = jest.fn();
      window.confirm = confirmMock || jest.fn(() => true);
      window.scrollTo = jest.fn();
      window.AbortController = class {
        constructor() { this.signal = {}; this.abort = jest.fn(); }
      };
      window.google = undefined;
      window.Set = Set; // Ensure Set is available for stale interest cleanup
    },
  });

  // Populate localStorage AFTER JSDOM creation (JSDOM v24 overrides beforeParse localStorage)
  // Must include default app config with setupComplete: true to skip wizard
  const defaultLocalStorage = {
    'mf-app-config': JSON.stringify({
      organizationName: 'Test Parish',
      appTitle: 'Ministry Fair',
      tagline: 'Find your place to serve',
      apiUrl: 'http://localhost/api',
      spreadsheetUrl: '',
      primaryColor: '#8B2635',
      primaryColorDark: '#6B1D29',
      googleClientId: 'test-client-id',
      setupComplete: true,
    }),
  };

  // Apply defaults first, then user-specified values override
  for (const [key, value] of Object.entries(defaultLocalStorage)) {
    if (!(key in localStorageData)) {
      dom.window.localStorage.setItem(key, value);
    }
  }
  for (const [key, value] of Object.entries(localStorageData)) {
    dom.window.localStorage.setItem(key, value);
  }

  if (runScript) {
    dom.window.eval(`
      window.google = undefined;
      ${APP_SCRIPT}
      // Expose app state via _app helper with live getters/setters
      window._app = {
        get MINISTRIES() { return MINISTRIES; },
        get FALLBACK_MINISTRIES() { return FALLBACK_MINISTRIES; },
        get interests() { return interests; },
        set interests(v) { interests = v; },
        get profile() { return profile; },
        get currentMinistry() { return currentMinistry; },
        set currentMinistry(v) { currentMinistry = v; },
        get showAll() { return showAll; },
        set showAll(v) { showAll = v; },
        get appConfig() { return appConfig; },
        set appConfig(v) { appConfig = v; },
        get appAdmins() { return appAdmins; },
        get currentSession() { return currentSession; },
        set currentSession(v) { currentSession = v; },
        get notificationSettings() { return notificationSettings; },
        get wizardStep() { return wizardStep; },
        get setupAdminData() { return setupAdminData; },
        showView: showView,
        showMinistriesList: showMinistriesList,
        showMinistryDetail: showMinistryDetail,
        showConfirmation: showConfirmation,
        renderMinistryList: renderMinistryList,
        formatPhoneNumber: formatPhoneNumber,
        escapeHtml: escapeHtml,
        isValidEmail: isValidEmail,
        loadMinistries: loadMinistries,
        initializeApp: initializeApp,
        applyConfig: applyConfig,
        showSettingsView: typeof showSettingsView === 'function' ? showSettingsView : undefined,
        showWizardStep: typeof showWizardStep === 'function' ? showWizardStep : undefined,
        decodeJwt: typeof decodeJwt === 'function' ? decodeJwt : undefined,
        boot: typeof boot === 'function' ? boot : undefined,
        hasSavedProfile: typeof hasSavedProfile === 'function' ? hasSavedProfile : undefined,
        loadAppConfig: typeof loadAppConfig === 'function' ? loadAppConfig : undefined,
        saveAppConfig: typeof saveAppConfig === 'function' ? saveAppConfig : undefined,
        loadAdmins: typeof loadAdmins === 'function' ? loadAdmins : undefined,
        saveAdmins: typeof saveAdmins === 'function' ? saveAdmins : undefined,
        isAdmin: typeof isAdmin === 'function' ? isAdmin : undefined,
        getUserRole: typeof getUserRole === 'function' ? getUserRole : undefined,
        DEFAULT_CONFIG: typeof DEFAULT_CONFIG !== 'undefined' ? DEFAULT_CONFIG : undefined,
        DEFAULT_NOTIFICATIONS: typeof DEFAULT_NOTIFICATIONS !== 'undefined' ? DEFAULT_NOTIFICATIONS : undefined,
        parseCSV: typeof parseCSV === 'function' ? parseCSV : undefined,
        parseTSV: typeof parseTSV === 'function' ? parseTSV : undefined,
        getApiKey: typeof getApiKey === 'function' ? getApiKey : undefined,
        setApiKey: typeof setApiKey === 'function' ? setApiKey : undefined,
        // Church registry
        loadChurchRegistry: typeof loadChurchRegistry === 'function' ? loadChurchRegistry : undefined,
        saveChurchRegistry: typeof saveChurchRegistry === 'function' ? saveChurchRegistry : undefined,
        registerChurch: typeof registerChurch === 'function' ? registerChurch : undefined,
        lookupChurchByDomain: typeof lookupChurchByDomain === 'function' ? lookupChurchByDomain : undefined,
        isChurchRegistered: typeof isChurchRegistered === 'function' ? isChurchRegistered : undefined,
        // Spreadsheet providers
        SpreadsheetProviders: typeof SpreadsheetProviders !== 'undefined' ? SpreadsheetProviders : undefined,
        getProvider: typeof getProvider === 'function' ? getProvider : undefined,
        // Platform selection
        get selectedProvider() { return selectedProvider; },
        set selectedProvider(v) { selectedProvider = v; },
        updatePlatformSelection: typeof updatePlatformSelection === 'function' ? updatePlatformSelection : undefined,
        // Gate
        processGateSignIn: typeof processGateSignIn === 'function' ? processGateSignIn : undefined,
      };
    `);
  }

  // Re-apply confirm mock AFTER script eval (jsdom may override during parsing)
  if (confirmMock) {
    dom.window.confirm = confirmMock;
  }

  return dom;
}

/**
 * Wait for async operations (loadMinistries, etc.)
 */
function waitForApp(ms = 150) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createTestDom,
  waitForApp,
  APP_SCRIPT,
  RAW_SCRIPT,
};
