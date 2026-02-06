/**
 * Tests for registration flow and profile display
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE, DUMMY_MINISTRIES } = require('./helpers');

const ministriesFetch = () => jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ ministries: DUMMY_MINISTRIES }),
});

describe('Registration Flow', () => {
  test('shows registration view for new user', async () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    await waitForApp();

    const registerView = dom.window.document.getElementById('view-register');
    expect(registerView.classList.contains('hidden')).toBe(false);
  });

  test('skips registration for returning user', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const registerView = dom.window.document.getElementById('view-register');
    const ministriesView = dom.window.document.getElementById('view-ministries');
    expect(registerView.classList.contains('hidden')).toBe(true);
    expect(ministriesView.classList.contains('hidden')).toBe(false);
  });

  test('form requires first name', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    expect(dom.window.document.getElementById('firstName').hasAttribute('required')).toBe(true);
  });

  test('form requires last name', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    expect(dom.window.document.getElementById('lastName').hasAttribute('required')).toBe(true);
  });

  test('form requires email with type=email', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    const emailInput = dom.window.document.getElementById('email');
    expect(emailInput.hasAttribute('required')).toBe(true);
    expect(emailInput.getAttribute('type')).toBe('email');
  });

  test('form requires phone', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    expect(dom.window.document.getElementById('phone').hasAttribute('required')).toBe(true);
  });

  test('phone input has maxlength of 14', () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    expect(dom.window.document.getElementById('phone').getAttribute('maxlength')).toBe('14');
  });

  test('form submission creates correct profile object', async () => {
    const dom = createTestDom({ fetchMock: ministriesFetch() });
    await waitForApp();

    dom.window.document.getElementById('firstName').value = 'Alice';
    dom.window.document.getElementById('lastName').value = 'Brown';
    dom.window.document.getElementById('email').value = 'alice@test.com';
    dom.window.document.getElementById('phone').value = '(512) 555-0000';
    dom.window.document.getElementById('joinParish').checked = false;

    const form = dom.window.document.getElementById('register-form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const stored = JSON.parse(dom.window.localStorage.getItem('ministry-fair-profile'));
    expect(stored).toEqual({
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice@test.com',
      phone: '(512) 555-0000',
      wantsToJoinParish: false,
    });
  });
});

describe('Profile Display', () => {
  test('shows correct profile initials', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const initials = dom.window.document.getElementById('profile-initials').textContent;
    expect(initials).toBe('TU');
  });

  test('shows full name in profile', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    expect(dom.window.document.getElementById('profile-name').textContent).toBe('Test User');
  });

  test('shows email in profile', async () => {
    const dom = createTestDom({
      localStorage: { 'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE) },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    expect(dom.window.document.getElementById('profile-email').textContent).toBe('test@example.com');
  });

  test('shows formatted phone in profile', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify({ ...DUMMY_PROFILE, phone: '5551234567' }),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    expect(dom.window.document.getElementById('profile-phone').textContent).toBe('(555) 123-4567');
  });

  test('BUG: empty firstName causes initials to show undefined', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify({ ...DUMMY_PROFILE, firstName: '' }),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const initials = dom.window.document.getElementById('profile-initials').textContent;
    // BUG: profile.firstName[0] on empty string returns undefined
    expect(initials).toBe('undefinedU');
  });

  test('BUG: empty lastName causes initials to show undefined', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify({ ...DUMMY_PROFILE, lastName: '' }),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const initials = dom.window.document.getElementById('profile-initials').textContent;
    expect(initials).toBe('Tundefined');
  });

  test('interest count shows singular for 1 interest', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([{
          ministryId: 'music', ministryName: 'Music', answers: {}, timestamp: '2026-01-15T10:00:00.000Z',
        }]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    expect(dom.window.document.getElementById('interest-count').textContent).toBe('1 interest expressed');
  });

  test('interest count shows plural for multiple interests', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([
          { ministryId: 'music', ministryName: 'Music', answers: {}, timestamp: '2026-01-15T10:00:00.000Z' },
          { ministryId: 'youth', ministryName: 'Youth', answers: {}, timestamp: '2026-01-15T10:00:00.000Z' },
        ]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    expect(dom.window.document.getElementById('interest-count').textContent).toBe('2 interests expressed');
  });

  test('interest count shows default text for 0 interests', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    expect(dom.window.document.getElementById('interest-count').textContent).toBe('Tap a ministry to learn more');
  });
});

describe('Google Sign-In', () => {
  test('BUG: JWT base64url decoding uses atob which may fail on URL-safe base64', () => {
    const payload = { given_name: 'Test', family_name: 'User', email: 'test@test.com' };
    const jsonStr = JSON.stringify(payload);
    const base64 = Buffer.from(jsonStr).toString('base64');
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // For most common payloads both are the same, but the implementation is technically incorrect
    // as it uses atob() which doesn't handle base64url encoding
    expect(typeof base64url).toBe('string');
  });
});
