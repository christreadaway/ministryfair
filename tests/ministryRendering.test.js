/**
 * Tests for ministry rendering, search, filtering, and sorting
 */
const { createTestDom, waitForApp } = require('./testSetup');
const { DUMMY_PROFILE, DUMMY_INTERESTS, DUMMY_MINISTRIES } = require('./helpers');

const ministriesFetch = () => jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ ministries: DUMMY_MINISTRIES }),
});

describe('Ministry List Rendering', () => {
  test('renders all ministries when show all is clicked', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    let cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(5);

    const showAllBtn = dom.window.document.getElementById('show-all-btn');
    expect(showAllBtn.classList.contains('hidden')).toBe(false);

    showAllBtn.click();

    cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(6);
  });

  test('initially limits display to 5 ministries', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(5);
  });

  test('interested ministries appear first in the list', async () => {
    const interests = [{
      ministryId: 'youth',
      ministryName: 'Youth Ministry',
      answers: {},
      timestamp: '2026-01-15T10:00:00.000Z',
    }];

    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(interests),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const firstCard = dom.window.document.querySelector('.ministry-card');
    expect(firstCard.classList.contains('interested')).toBe(true);
    const firstName = firstCard.querySelector('.ministry-name').textContent;
    expect(firstName).toBe('Youth Ministry');
  });

  test('non-interested ministries are sorted alphabetically', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    dom.window.document.getElementById('show-all-btn').click();

    const cards = dom.window.document.querySelectorAll('.ministry-card');
    const names = Array.from(cards).map(c => c.querySelector('.ministry-name').textContent);

    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test('interested ministry shows "Interested" badge', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify(DUMMY_INTERESTS),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const interestedCard = dom.window.document.querySelector('.ministry-card.interested');
    expect(interestedCard).not.toBeNull();
    const badge = interestedCard.querySelector('.badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('Interested');
  });
});

describe('Ministry Search', () => {
  test('search filters by ministry name', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const searchInput = dom.window.document.getElementById('ministry-search');
    searchInput.value = 'music';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    const cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.ministry-name').textContent).toBe('Music Ministry');
  });

  test('search filters by description', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const searchInput = dom.window.document.getElementById('ministry-search');
    searchInput.value = 'scripture';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    const cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.ministry-name').textContent).toBe('Bible Study');
  });

  test('search filters by organizer name', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const searchInput = dom.window.document.getElementById('ministry-search');
    searchInput.value = 'jane smith';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    const cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.ministry-name').textContent).toBe('Music Ministry');
  });

  test('search is case-insensitive', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const searchInput = dom.window.document.getElementById('ministry-search');
    searchInput.value = 'MUSIC';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    const cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(1);
  });

  test('search shows "no results" message when nothing matches', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    const searchInput = dom.window.document.getElementById('ministry-search');
    searchInput.value = 'zzzznonexistent';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    const noResults = dom.window.document.querySelector('.no-results');
    expect(noResults).not.toBeNull();
    expect(noResults.textContent).toContain('zzzznonexistent');
  });

  test('search bypasses the 5-ministry display limit', async () => {
    const dom = createTestDom({
      localStorage: {
        'ministry-fair-profile': JSON.stringify(DUMMY_PROFILE),
        'ministry-fair-interests': JSON.stringify([]),
      },
      fetchMock: ministriesFetch(),
    });
    await waitForApp();

    let cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBe(5);

    const searchInput = dom.window.document.getElementById('ministry-search');
    searchInput.value = 'ministry';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    cards = dom.window.document.querySelectorAll('.ministry-card');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('Ministry Detail View', () => {
  test('renders select question type correctly', async () => {
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

    const selects = dom.window.document.querySelectorAll('#detail-questions select');
    expect(selects.length).toBe(1);
    const options = selects[0].querySelectorAll('option');
    expect(options.length).toBe(6); // "Select..." + 5 voice parts
  });

  test('renders text question type correctly', async () => {
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

    const textInputs = dom.window.document.querySelectorAll('#detail-questions input[type="text"]');
    expect(textInputs.length).toBe(1);
    expect(textInputs[0].getAttribute('placeholder')).toBe('Your answer');
  });

  test('renders checkbox question type correctly', async () => {
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
    expect(checkboxes.length).toBe(3);
  });

  test('shows "I\'m Interested!" button for non-interested ministry', async () => {
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

    const interestBtn = dom.window.document.getElementById('interest-btn');
    expect(interestBtn.textContent).toBe("I'm Interested!");
  });

  test('shows update and remove buttons for already-interested ministry', async () => {
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

    const interestBtn = dom.window.document.getElementById('interest-btn');
    expect(interestBtn.textContent).toContain('Update Interest');

    const removeBtn = dom.window.document.getElementById('remove-btn');
    expect(removeBtn.classList.contains('hidden')).toBe(false);
  });

  test('ministry with no questions shows no question form', async () => {
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

    const questionsDiv = dom.window.document.getElementById('detail-questions');
    expect(questionsDiv.innerHTML).toBe('');
  });
});
