/**
 * Tests for edge cases and error handling
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE, DUMMY_MINISTRIES, DUMMY_INTERESTS } = require('./helpers');

const ministriesFetch = () => jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ ministries: DUMMY_MINISTRIES }),
});

describe('API Failure Handling', () => {
  test('falls back to fallback ministries when API returns empty array', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ ministries: [] }),
      }),
    });
    await waitForApp(500);

    // FALLBACK_MINISTRIES has 2 entries
    expect(dom.window._app.MINISTRIES.length).toBe(2);
    expect(dom.window._app.MINISTRIES[0].id).toBe('music');
    expect(dom.window._app.MINISTRIES[1].id).toBe('hospitality');
  });

  test('falls back to fallback ministries when API returns non-JSON', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: jest.fn().mockResolvedValue({
        json: () => Promise.reject(new Error('Invalid JSON')),
      }),
    });
    await waitForApp(500);

    expect(dom.window._app.MINISTRIES.length).toBe(2);
  });

  test('falls back to fallback ministries when fetch throws (network error)', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: jest.fn().mockRejectedValue(new Error('Network error')),
    });
    await waitForApp(500);

    expect(dom.window._app.MINISTRIES.length).toBe(2);
  });

  test('falls back when API response has no ministries key', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: 'Something went wrong' }),
      }),
    });
    await waitForApp(500);

    expect(dom.window._app.MINISTRIES.length).toBe(2);
  });
});

describe('Confirmation View', () => {
  test('shows organizer info when available', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'music');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const organizerDiv = dom.window.document.getElementById('organizer-info');
    expect(organizerDiv.innerHTML).toContain('Jane Smith');
    expect(organizerDiv.innerHTML).toContain('jane@parish.org');
  });

  test('hides organizer info when not available', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'youth');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const organizerDiv = dom.window.document.getElementById('organizer-info');
    expect(organizerDiv.innerHTML).toBe('');
  });

  test('shows list of all interests on confirmation page', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    // Verify interests were loaded
    expect(w._app.interests.length).toBe(1);

    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'youth');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(100);

    // After clicking, interests should have 2 entries
    expect(w._app.interests.length).toBe(2);

    const interestsList = dom.window.document.getElementById('interests-list');
    const cards = interestsList.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(2);
  });

  test('showConfirmation with no currentMinistry redirects to list', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = null;
    w._app.showConfirmation();
    await waitForApp(50);

    const ministriesView = dom.window.document.getElementById('view-ministries');
    expect(ministriesView.classList.contains('hidden')).toBe(false);
  });
});

describe('Modal Behavior', () => {
  test('remove button opens confirmation modal', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'music');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('remove-btn').click();

    const modal = dom.window.document.getElementById('confirm-modal');
    expect(modal.classList.contains('hidden')).toBe(false);
  });

  test('cancel button closes modal without removing', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'music');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('remove-btn').click();
    dom.window.document.getElementById('modal-cancel').click();

    const modal = dom.window.document.getElementById('confirm-modal');
    expect(modal.classList.contains('hidden')).toBe(true);

    // Interests should still be in memory
    expect(w._app.interests.length).toBe(1);
    expect(w._app.interests[0].ministryId).toBe('music');
  });

  test('backdrop click closes modal', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'music');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('remove-btn').click();
    dom.window.document.querySelector('.modal-backdrop').click();

    const modal = dom.window.document.getElementById('confirm-modal');
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  test('modal shows correct ministry name', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'music');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('remove-btn').click();

    expect(dom.window.document.getElementById('modal-ministry-name').textContent).toBe('Music Ministry');
  });
});

describe('CONFIG Application', () => {
  test('applies organization name to page title', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    expect(dom.window.document.title).toBe('Ministry Fair');
  });

  test('applies app title to all .app-title elements', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    dom.window.document.querySelectorAll('.app-title').forEach(t => {
      expect(t.textContent).toBe('Ministry Fair');
    });
  });

  test('applies tagline to all .app-tagline elements', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    dom.window.document.querySelectorAll('.app-tagline').forEach(t => {
      expect(t.textContent).toBe('Find your place to serve');
    });
  });

  test('applies consent text with organization name', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    const consent = dom.window.document.getElementById('consentText').textContent;
    expect(consent).toContain('Test Parish');
    expect(consent).toContain('permission to contact you');
  });

  test('applies join parish label with organization name', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    const label = dom.window.document.getElementById('joinParishLabel').textContent;
    expect(label).toContain('Test Parish');
  });
});

describe('View Management', () => {
  test('only one view is visible at a time', async () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    await waitForApp();

    const viewIds = ['view-loading', 'view-register', 'view-ministries', 'view-detail', 'view-confirmed'];
    const visibleViews = viewIds.filter(id => {
      return !dom.window.document.getElementById(id).classList.contains('hidden');
    });
    expect(visibleViews.length).toBe(1);
  });

  test('scrolls to top when changing views', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    expect(dom.window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe('Interest with Question Answers', () => {
  test('collects select answer correctly', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'music');
    w._app.showMinistryDetail(w._app.currentMinistry);

    // Fill in select answer
    dom.window.document.querySelector('#detail-questions select').value = 'Alto';
    // Fill in text answer
    dom.window.document.querySelector('#detail-questions input[type="text"]').value = 'Piano';

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const saved = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    const musicInterest = saved.find(i => i.ministryId === 'music');
    expect(musicInterest.answers.q1).toBe('Alto');
    expect(musicInterest.answers.q2).toBe('Piano');
  });

  test('collects checkbox answers correctly (comma-separated)', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'hospitality');
    w._app.showMinistryDetail(w._app.currentMinistry);

    const checkboxes = dom.window.document.querySelectorAll('#detail-questions input[type="checkbox"]');
    checkboxes[0].checked = true;
    checkboxes[2].checked = true;

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const saved = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    const hospInterest = saved.find(i => i.ministryId === 'hospitality');
    expect(hospInterest.answers.q1).toBe('Saturday 5pm, Sunday 11am');
  });

  test('sends empty question answers for ministry with no questions', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'youth');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const fetchCalls = dom.window.fetch.mock.calls;
    const postCall = fetchCalls.find(c => c[1] && c[1].method === 'POST');
    expect(postCall).toBeDefined();

    const payload = JSON.parse(postCall[1].body);
    expect(payload.q1).toBe('');
    expect(payload.q2).toBe('');
    expect(payload.q3).toBe('');
  });
});

describe('Stale Interest Cleanup', () => {
  test('interests referencing deleted ministries are removed on load', async () => {
    const staleInterests = [
      {
        ministryId: 'deleted-ministry',
        ministryName: 'Deleted Ministry',
        answers: {},
        timestamp: '2026-01-15T10:00:00.000Z',
      },
      {
        ministryId: 'music',
        ministryName: 'Music Ministry',
        answers: {},
        timestamp: '2026-01-15T10:00:00.000Z',
      },
    ];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(staleInterests),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    // Stale interest for deleted ministry should be cleaned up; valid one kept
    expect(w._app.interests.length).toBe(1);
    expect(w._app.interests[0].ministryId).toBe('music');

    // localStorage should also be updated
    const stored = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    expect(stored.length).toBe(1);
    expect(stored[0].ministryId).toBe('music');
  });
});

describe('Logout Flow', () => {
  test('logout resets all state', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    dom.window.document.getElementById('logout-btn').click();

    expect(dom.window.localStorage.getItem('ministry-fair-profile')).toBeNull();
    expect(dom.window.localStorage.getItem('ministry-fair-interests')).toBeNull();

    const registerView = dom.window.document.getElementById('view-register');
    expect(registerView.classList.contains('hidden')).toBe(false);
  });

  test('logout cancelled preserves state', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
      confirmMock: jest.fn(() => false),
    });
    await waitForApp();

    dom.window.document.getElementById('logout-btn').click();

    // State should be preserved since user cancelled
    expect(dom.window.localStorage.getItem('ministry-fair-profile')).not.toBeNull();
    expect(dom.window.localStorage.getItem('ministry-fair-interests')).not.toBeNull();
  });
});
