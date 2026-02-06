/**
 * Tests for deep linking via URL parameters (?m=ministry-id)
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE, DUMMY_MINISTRIES } = require('./helpers');

const ministriesFetch = () => jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ ministries: DUMMY_MINISTRIES }),
});

describe('Deep Linking', () => {
  test('navigates directly to ministry detail when ?m=ministry-id is set (returning user)', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      urlParams: 'm=music',
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const detailView = dom.window.document.getElementById('view-detail');
    expect(detailView.classList.contains('hidden')).toBe(false);

    const detailName = dom.window.document.getElementById('detail-name').textContent;
    expect(detailName).toBe('Music Ministry');
  });

  test('shows registration first then navigates to ministry for new user with ?m param', async () => {
    const dom = createTestDom({
      urlParams: 'm=music',
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    // New user should see registration first
    const registerView = dom.window.document.getElementById('view-register');
    expect(registerView.classList.contains('hidden')).toBe(false);

    // Fill form and submit
    dom.window.document.getElementById('firstName').value = 'Test';
    dom.window.document.getElementById('lastName').value = 'User';
    dom.window.document.getElementById('email').value = 'test@test.com';
    dom.window.document.getElementById('phone').value = '(555) 123-4567';

    const form = dom.window.document.getElementById('register-form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await waitForApp(50);

    const detailView = dom.window.document.getElementById('view-detail');
    expect(detailView.classList.contains('hidden')).toBe(false);
  });

  test('falls back to ministries list when ?m=invalid-id', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      urlParams: 'm=nonexistent-ministry',
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const ministriesView = dom.window.document.getElementById('view-ministries');
    expect(ministriesView.classList.contains('hidden')).toBe(false);
  });

  test('handles empty ?m parameter', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      urlParams: 'm=',
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const ministriesView = dom.window.document.getElementById('view-ministries');
    expect(ministriesView.classList.contains('hidden')).toBe(false);
  });

  test('handles ?m with special characters', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      urlParams: 'm=test%20ministry',
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const ministriesView = dom.window.document.getElementById('view-ministries');
    expect(ministriesView.classList.contains('hidden')).toBe(false);
  });
});
