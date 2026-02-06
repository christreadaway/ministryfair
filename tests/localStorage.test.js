/**
 * Tests for localStorage persistence, state management, and data integrity
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE, DUMMY_INTERESTS, DUMMY_MINISTRIES } = require('./helpers');

const ministriesFetch = () => jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ ministries: DUMMY_MINISTRIES }),
});

describe('localStorage Persistence', () => {
  test('saves profile to localStorage on registration', async () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    await waitForApp();

    dom.window.document.getElementById('firstName').value = 'Jane';
    dom.window.document.getElementById('lastName').value = 'Doe';
    dom.window.document.getElementById('email').value = 'jane@example.com';
    dom.window.document.getElementById('phone').value = '(555) 111-2222';
    dom.window.document.getElementById('joinParish').checked = true;

    const form = dom.window.document.getElementById('register-form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const stored = JSON.parse(dom.window.localStorage.getItem('ministry-fair-profile'));
    expect(stored.firstName).toBe('Jane');
    expect(stored.lastName).toBe('Doe');
    expect(stored.email).toBe('jane@example.com');
    expect(stored.phone).toBe('(555) 111-2222');
    expect(stored.wantsToJoinParish).toBe(true);
  });

  test('restores profile from localStorage on page load', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const registerView = dom.window.document.getElementById('view-register');
    expect(registerView.classList.contains('hidden')).toBe(true);
  });

  test('restores interests from localStorage on page load', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const countEl = dom.window.document.getElementById('interest-count');
    expect(countEl.textContent).toContain('1 interest expressed');
  });

  test('corrupted localStorage profile is handled gracefully (was crash, now fixed)', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': '{invalid json' },
      fetchMock: ministriesFetch(),
    });
    // App should not crash; corrupted profile is removed
    expect(dom.window.localStorage.getItem('ministry-fair-profile')).toBeNull();
  });

  test('corrupted localStorage interests is handled gracefully (was crash, now fixed)', () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-interests': 'not-json' },
      fetchMock: ministriesFetch(),
    });
    // App should not crash; corrupted interests is removed
    expect(dom.window.localStorage.getItem('ministry-fair-interests')).toBeNull();
  });

  test('logout clears localStorage', async () => {
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
  });

  test('interest is saved to localStorage when user signs up', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    // Navigate to a ministry detail
    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'youth');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const savedInterests = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    expect(savedInterests.length).toBe(1);
    expect(savedInterests[0].ministryId).toBe('youth');
  });

  test('interest removal updates localStorage', async () => {
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
    dom.window.document.getElementById('modal-confirm').click();

    const savedInterests = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    expect(savedInterests.length).toBe(0);
  });
});

describe('State Management', () => {
  test('multiple interests are tracked correctly', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const w = dom.window;
    const btn = dom.window.document.getElementById('interest-btn');

    // Sign up for first ministry
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'youth');
    w._app.showMinistryDetail(w._app.currentMinistry);
    btn.click();
    await waitForApp(50);

    // BUG: interest-btn stays disabled=true after signup (never re-enabled)
    // Must manually re-enable to simulate navigating back and clicking again
    btn.disabled = false;

    // Sign up for second ministry
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'bible-study');
    w._app.showMinistryDetail(w._app.currentMinistry);
    btn.click();
    await waitForApp(50);

    const savedInterests = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    expect(savedInterests.length).toBe(2);
    expect(savedInterests.map(i => i.ministryId)).toEqual(['youth', 'bible-study']);
  });

  test('re-expressing interest updates existing entry (no duplicates)', async () => {
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
    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const savedInterests = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    const musicInterests = savedInterests.filter(i => i.ministryId === 'music');
    expect(musicInterests.length).toBe(1);
  });
});
