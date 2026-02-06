/**
 * XSS and Security Tests
 *
 * Tests verify that HTML in API data is properly escaped via escapeHtml().
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE } = require('./helpers');

function makeMinistriesFetch(ministries) {
  return jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ ministries }),
  });
}

describe('XSS Prevention', () => {
  test('ministry name with HTML is properly escaped in ministry list', async () => {
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
    // HTML should be escaped, not rendered as an element
    expect(listHtml).not.toContain('<img');
    expect(listHtml).toContain('&lt;img');
  });

  test('ministry description with HTML tags is properly escaped', async () => {
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
    expect(listHtml).not.toContain('<b>Bold</b>');
    expect(listHtml).toContain('&lt;b&gt;Bold&lt;/b&gt;');
  });

  test('search term with HTML is properly escaped in no-results message', async () => {
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
    expect(listHtml).not.toContain('<img');
    expect(listHtml).toContain('&lt;img');
  });

  test('organizer name with HTML is properly escaped in confirmation', async () => {
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
    await waitForApp(100);

    const organizerHtml = dom.window.document.getElementById('organizer-info').innerHTML;
    expect(organizerHtml).not.toContain('<img');
    expect(organizerHtml).toContain('&lt;img');
  });

  test('organizer email with javascript: protocol is not wrapped in mailto link', async () => {
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
    await waitForApp(100);

    const organizerHtml = dom.window.document.getElementById('organizer-info').innerHTML;
    // javascript: protocol should NOT be in a mailto: link
    expect(organizerHtml).not.toContain('href="mailto:javascript:');
    // The text should be escaped and shown as plain text
    expect(organizerHtml).toContain('javascript:alert(1)');
    expect(organizerHtml).not.toContain('<a');
  });

  test('ministry icon field with HTML is properly escaped', async () => {
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
    expect(listHtml).not.toContain('<img');
    expect(listHtml).toContain('&lt;img');
  });

  test('question label with HTML is properly escaped in detail view', async () => {
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
    expect(questionsHtml).not.toContain('<img');
    expect(questionsHtml).toContain('&lt;img');
  });
});

describe('Security: POST verification', () => {
  test('interest is still saved locally when POST fails (graceful degradation)', async () => {
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
    await waitForApp(100);

    // Interest saved locally despite network failure
    const savedInterests = JSON.parse(dom.window.localStorage.getItem('ministry-fair-interests'));
    expect(savedInterests.length).toBe(1);
  });
});
