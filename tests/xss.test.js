/**
 * XSS and Security Tests
 *
 * The app uses innerHTML extensively with data from the API.
 * These tests verify that unsanitized data creates XSS vulnerabilities.
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE } = require('./helpers');

function makeMinistriesFetch(ministries) {
  return jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ ministries }),
  });
}

describe('XSS Vulnerabilities', () => {
  test('BUG: ministry name with HTML is rendered unsanitized in ministry list', async () => {
    const xssMinistries = [{
      id: 'xss-test',
      name: '<img src=x onerror="window._xssTriggered=true">',
      description: 'Normal description',
      icon: '📋',
      organizerName: '',
      organizerEmail: '',
      organizerPhone: '',
      questions: [],
    }];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: makeMinistriesFetch(xssMinistries),
    });
    await waitForApp();

    const listHtml = dom.window.document.getElementById('ministry-list').innerHTML;
    // JSDOM normalizes attributes with quotes; XSS still present as injected <img> tag
    expect(listHtml).toContain('<img src="x"');
  });

  test('BUG: ministry description with HTML tags is rendered unsanitized', async () => {
    const xssMinistries = [{
      id: 'xss-desc',
      name: 'Safe Name',
      description: '<b>Bold</b> injected HTML',
      icon: '📋',
      organizerName: '',
      organizerEmail: '',
      organizerPhone: '',
      questions: [],
    }];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: makeMinistriesFetch(xssMinistries),
    });
    await waitForApp();

    const listHtml = dom.window.document.getElementById('ministry-list').innerHTML;
    expect(listHtml).toContain('<b>Bold</b>');
  });

  test('BUG: search term with HTML is rendered unsanitized in no-results message', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: makeMinistriesFetch([{
        id: 'safe', name: 'Safe Ministry', description: 'Normal',
        icon: '📋', organizerName: '', organizerEmail: '', organizerPhone: '', questions: [],
      }]),
    });
    await waitForApp();

    const searchInput = dom.window.document.getElementById('ministry-search');
    searchInput.value = '<img src=x onerror=alert(1)>';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    const listHtml = dom.window.document.getElementById('ministry-list').innerHTML;
    // JSDOM normalizes attribute quotes; XSS payload present as parsed <img> element
    expect(listHtml).toContain('<img src="x"');
  });

  test('BUG: organizer name with HTML is rendered unsanitized in confirmation', async () => {
    const xssMinistries = [{
      id: 'xss-org',
      name: 'Test Ministry',
      description: 'Normal',
      icon: '📋',
      organizerName: '<img src=x onerror="window._orgXss=true">',
      organizerEmail: 'safe@email.com',
      organizerPhone: '',
      questions: [],
    }];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: makeMinistriesFetch(xssMinistries),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'xss-org');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const organizerHtml = dom.window.document.getElementById('organizer-info').innerHTML;
    expect(organizerHtml).toContain('<img src="x"');
  });

  test('BUG: organizer email with javascript: protocol creates unsafe mailto link', async () => {
    const xssMinistries = [{
      id: 'xss-email',
      name: 'Test Ministry',
      description: 'Normal',
      icon: '📋',
      organizerName: 'Evil Organizer',
      organizerEmail: 'javascript:alert(1)',
      organizerPhone: '',
      questions: [],
    }];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: makeMinistriesFetch(xssMinistries),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'xss-email');
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    const organizerHtml = dom.window.document.getElementById('organizer-info').innerHTML;
    expect(organizerHtml).toContain('javascript:alert(1)');
  });

  test('BUG: ministry icon field with HTML is rendered unsanitized', async () => {
    const xssMinistries = [{
      id: 'xss-icon',
      name: 'Test Ministry',
      description: 'Normal',
      icon: '<img src=x onerror="window._iconXss=true">',
      organizerName: '',
      organizerEmail: '',
      organizerPhone: '',
      questions: [],
    }];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: makeMinistriesFetch(xssMinistries),
    });
    await waitForApp();

    const listHtml = dom.window.document.getElementById('ministry-list').innerHTML;
    expect(listHtml).toContain('<img src="x"');
  });

  test('BUG: question label with HTML is rendered unsanitized in detail view', async () => {
    const xssMinistries = [{
      id: 'xss-qlabel',
      name: 'Test Ministry',
      description: 'Normal',
      icon: '📋',
      organizerName: '',
      organizerEmail: '',
      organizerPhone: '',
      questions: [{ id: 'q1', type: 'text', label: '<img src=x onerror=alert(1)>', options: [] }],
    }];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: makeMinistriesFetch(xssMinistries),
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES.find(m => m.id === 'xss-qlabel');
    w._app.showMinistryDetail(w._app.currentMinistry);

    const questionsHtml = dom.window.document.getElementById('detail-questions').innerHTML;
    expect(questionsHtml).toContain('<img src="x"');
  });
});

describe('Security: no-cors mode', () => {
  test('BUG: no-cors POST means app cannot verify signup success - data loss risk', async () => {
    const ministries = [{
      id: 'test', name: 'Test', description: 'Test', icon: '📋',
      organizerName: '', organizerEmail: '', organizerPhone: '', questions: [],
    }];

    const failingFetch = jest.fn().mockImplementation((url, opts) => {
      if (opts && opts.method === 'POST') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        json: () => Promise.resolve({ ministries }),
      });
    });

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: failingFetch,
    });
    await waitForApp();

    const w = dom.window;
    w._app.currentMinistry = w._app.MINISTRIES[0];
    w._app.showMinistryDetail(w._app.currentMinistry);

    dom.window.document.getElementById('interest-btn').click();
    await waitForApp(50);

    // Interest saved locally despite network failure
    const savedInterests = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    expect(savedInterests.length).toBe(1);
    // User sees success even though server never received it
  });
});
