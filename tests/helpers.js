/**
 * Test helpers - extracts JS from index.html and provides DOM setup utilities
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/**
 * Extract the HTML body content (without script) from index.html
 */
function getHtmlBody() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  // Extract everything between <body> and </body>, minus the <script> tag
  const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
  return bodyMatch ? bodyMatch[1] : '';
}

/**
 * Extract the JavaScript from index.html
 */
function getScriptContent() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  return scriptMatch ? scriptMatch[1] : '';
}

/**
 * Create a full JSDOM environment with the app loaded
 */
function createAppEnvironment(options = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

  // Strip the Google Sign-In external script to avoid network requests
  const cleanedHtml = html
    .replace(/<script src="https:\/\/accounts\.google\.com[^"]*"[^>]*><\/script>/, '')
    .replace(/<link rel="preconnect"[^>]*>/g, '')
    .replace(/<link href="https:\/\/fonts\.googleapis[^"]*"[^>]*>/g, '');

  // Remove the inline <script> so we can control execution
  const htmlWithoutScript = cleanedHtml.replace(/<script>[\s\S]*?<\/script>/, '<script>/* removed for testing */</script>');

  const dom = new JSDOM(htmlWithoutScript, {
    url: options.url || 'http://localhost',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
    resources: 'usable',
    beforeParse(window) {
      // Mock localStorage
      const store = options.localStorage || {};
      window.localStorage = {
        _store: { ...store },
        getItem(key) { return this._store[key] || null; },
        setItem(key, value) { this._store[key] = String(value); },
        removeItem(key) { delete this._store[key]; },
        clear() { this._store = {}; },
      };

      // Mock fetch
      window.fetch = options.fetchMock || jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ ministries: [] }),
      });

      // Mock alert/confirm
      window.alert = options.alertMock || jest.fn();
      window.confirm = options.confirmMock || jest.fn(() => true);

      // Mock scrollTo
      window.scrollTo = jest.fn();

      // Mock AbortController
      window.AbortController = class {
        constructor() {
          this.signal = {};
          this.abort = jest.fn();
        }
      };
    },
  });

  return dom;
}

/**
 * Execute the app's JavaScript in a JSDOM window context
 */
function executeAppScript(window) {
  const script = getScriptContent();

  // Wrap in a function to avoid polluting and handle google undefined
  const wrappedScript = `
    // Mock google object
    window.google = undefined;
    ${script}
  `;

  window.eval(wrappedScript);
}

/**
 * Dummy ministry data for testing
 */
const DUMMY_MINISTRIES = [
  {
    id: 'music',
    name: 'Music Ministry',
    description: 'Supports parish liturgies through choirs, cantors, and instrumentalists.',
    icon: '🎵',
    organizerName: 'Jane Smith',
    organizerEmail: 'jane@parish.org',
    organizerPhone: '5125551234',
    questions: [
      { id: 'q1', type: 'select', label: 'Voice part (if known)', options: ['Not sure', 'Soprano', 'Alto', 'Tenor', 'Bass'] },
      { id: 'q2', type: 'text', label: 'Do you play an instrument? Which one(s)?', options: [] },
    ],
  },
  {
    id: 'hospitality',
    name: 'Hospitality Ministers',
    description: 'Welcomes parishioners and assists during Masses and parish events.',
    icon: '🚪',
    organizerName: 'John Doe',
    organizerEmail: 'john@parish.org',
    organizerPhone: '5125555678',
    questions: [
      { id: 'q1', type: 'checkbox', label: 'Which Mass times work for you?', options: ['Saturday 5pm', 'Sunday 9am', 'Sunday 11am'] },
    ],
  },
  {
    id: 'youth',
    name: 'Youth Ministry',
    description: 'Faith formation and fellowship for middle and high school students.',
    icon: '🌟',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    questions: [],
  },
  {
    id: 'svdp',
    name: 'St. Vincent de Paul Society',
    description: 'Assists individuals and families in need through direct support and resources.',
    icon: '💚',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    questions: [],
  },
  {
    id: 'bible-study',
    name: 'Bible Study',
    description: 'Offers structured Scripture study with group discussion.',
    icon: '📖',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    questions: [],
  },
  {
    id: 'lectors',
    name: 'Lectors',
    description: 'Proclaims the Word of God at liturgical celebrations.',
    icon: '📜',
    organizerName: 'Mary Johnson',
    organizerEmail: 'mary@parish.org',
    organizerPhone: '5125559999',
    questions: [],
  },
];

const DUMMY_PROFILE = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '(555) 123-4567',
  wantsToJoinParish: false,
};

const DUMMY_INTERESTS = [
  {
    ministryId: 'music',
    ministryName: 'Music Ministry',
    answers: { q1: 'Alto', q2: 'Piano' },
    timestamp: '2026-01-15T10:00:00.000Z',
  },
];

module.exports = {
  getHtmlBody,
  getScriptContent,
  createAppEnvironment,
  executeAppScript,
  DUMMY_MINISTRIES,
  DUMMY_PROFILE,
  DUMMY_INTERESTS,
};
