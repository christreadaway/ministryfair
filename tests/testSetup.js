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
const SCRIPT_MATCH = RAW_HTML.match(/<script>([\s\S]*?)<\/script>/);
const RAW_SCRIPT = SCRIPT_MATCH ? SCRIPT_MATCH[1] : '';

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
    .replace(/<script>[\s\S]*?<\/script>/, '<script></script>');
}

/**
 * Create a JSDOM instance with the app HTML, configured mocks, and run the app script.
 */
function createTestDom(options = {}) {
  const {
    localStorage: localStorageData = {},
    urlParams = '',
    fetchMock = null,
    confirmMock = null,
    runScript = true,
  } = options;

  const url = urlParams ? `http://localhost?${urlParams}` : 'http://localhost';
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
    },
  });

  // Populate localStorage AFTER JSDOM creation (JSDOM v24 overrides beforeParse localStorage)
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
        showView: showView,
        showMinistriesList: showMinistriesList,
        showMinistryDetail: showMinistryDetail,
        showConfirmation: showConfirmation,
        renderMinistryList: renderMinistryList,
        formatPhoneNumber: formatPhoneNumber,
        loadMinistries: loadMinistries,
        initializeApp: initializeApp,
        CONFIG: CONFIG,
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
