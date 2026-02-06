/**
 * Tests for Google Apps Script backend logic (google-apps-script.js)
 *
 * Since we can't run Google Apps Script directly, we extract and test the pure logic
 * by mocking the Google Apps Script environment.
 */

// Mock Google Apps Script global objects
const mockSheet = {
  appendRow: jest.fn(),
  getDataRange: jest.fn(() => ({
    getValues: jest.fn(() => []),
  })),
  getRange: jest.fn(() => ({
    setFontWeight: jest.fn(),
    setBackground: jest.fn(),
    setFontColor: jest.fn(),
    getValues: jest.fn(() => [[]]),
    setValues: jest.fn(),
    setValue: jest.fn(),
  })),
  setFrozenRows: jest.fn(),
  autoResizeColumn: jest.fn(),
  setColumnWidth: jest.fn(),
  getLastRow: jest.fn(() => 1),
  insertColumnAfter: jest.fn(),
  insertColumnsAfter: jest.fn(),
};

const mockSpreadsheet = {
  getSheetByName: jest.fn((name) => {
    if (name === 'Ministries') return mockSheet;
    if (name === 'App Signups') return mockSheet;
    return null;
  }),
  insertSheet: jest.fn(() => mockSheet),
  getActiveSpreadsheet: jest.fn(),
};

// Mock global Google Apps Script services
global.SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => mockSpreadsheet),
};

global.ContentService = {
  createTextOutput: jest.fn((text) => ({
    setMimeType: jest.fn(() => text),
    _text: text,
  })),
  MimeType: {
    JSON: 'JSON',
  },
};

global.Utilities = {
  formatDate: jest.fn((date, tz, format) => {
    if (format === 'M/d/yy') return '1/15/26';
    if (format === 'h:mm a') return '10:00 AM';
    return '';
  }),
};

global.Logger = {
  log: jest.fn(),
};

// Load the backend script
const fs = require('fs');
const path = require('path');
const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'google-apps-script.js'), 'utf-8');

// Execute the script to define functions
eval(scriptContent);

describe('doPost - Signup Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpreadsheet.getSheetByName.mockImplementation((name) => {
      if (name === 'App Signups') return mockSheet;
      if (name === 'New Parishioners') return null; // Will trigger creation
      return null;
    });
    mockSheet.appendRow.mockClear();
    mockSheet.getDataRange.mockReturnValue({
      getValues: () => [['Date', 'Time', 'First', 'Last', 'Email', 'Phone']],
    });
  });

  test('appends signup row with correct data', () => {
    const event = {
      postData: {
        contents: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '(555) 123-4567',
          wantsToJoinParish: false,
          ministry: 'Music Ministry',
          action: 'Signup',
          q1: 'Alto',
          q2: 'Piano',
          q3: '',
        }),
      },
    };

    doPost(event);

    expect(mockSheet.appendRow).toHaveBeenCalledWith([
      '1/15/26',
      '10:00 AM',
      'John',
      'Doe',
      'john@test.com',
      '(555) 123-4567',
      'No',
      'Music Ministry',
      'Signup',
      'Alto',
      'Piano',
      '',
    ]);
  });

  test('defaults action to Signup for backward compatibility', () => {
    const event = {
      postData: {
        contents: JSON.stringify({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          phone: '',
          wantsToJoinParish: false,
          ministry: 'Youth Ministry',
          // action is intentionally omitted
        }),
      },
    };

    doPost(event);

    const appendedRow = mockSheet.appendRow.mock.calls[0][0];
    expect(appendedRow[8]).toBe('Signup'); // Action defaults to "Signup"
  });

  test('records Removed action correctly', () => {
    const event = {
      postData: {
        contents: JSON.stringify({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          phone: '',
          wantsToJoinParish: false,
          ministry: 'Music Ministry',
          action: 'Removed',
        }),
      },
    };

    doPost(event);

    const appendedRow = mockSheet.appendRow.mock.calls[0][0];
    expect(appendedRow[8]).toBe('Removed');
  });

  test('handles missing fields with empty strings', () => {
    const event = {
      postData: {
        contents: JSON.stringify({}),
      },
    };

    doPost(event);

    const appendedRow = mockSheet.appendRow.mock.calls[0][0];
    expect(appendedRow[2]).toBe(''); // firstName
    expect(appendedRow[3]).toBe(''); // lastName
    expect(appendedRow[4]).toBe(''); // email
    expect(appendedRow[5]).toBe(''); // phone
    expect(appendedRow[6]).toBe('No'); // wantsToJoinParish defaults to 'No'
    expect(appendedRow[7]).toBe(''); // ministry
    expect(appendedRow[8]).toBe('Signup'); // action defaults
    expect(appendedRow[9]).toBe(''); // q1
    expect(appendedRow[10]).toBe(''); // q2
    expect(appendedRow[11]).toBe(''); // q3
  });

  test('adds new parishioner on signup with wantsToJoinParish=true', () => {
    mockSpreadsheet.getSheetByName.mockImplementation((name) => {
      if (name === 'App Signups') return mockSheet;
      if (name === 'New Parishioners') return null;
      return null;
    });

    const event = {
      postData: {
        contents: JSON.stringify({
          firstName: 'New',
          lastName: 'Person',
          email: 'new@test.com',
          phone: '(555) 000-0000',
          wantsToJoinParish: true,
          ministry: 'Youth Ministry',
          action: 'Signup',
        }),
      },
    };

    doPost(event);

    // Should call appendRow at least twice - once for signup, once for new parishioner
    expect(mockSheet.appendRow.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('does NOT add new parishioner on removal even if wantsToJoinParish is true', () => {
    const newParishSheet = {
      ...mockSheet,
      appendRow: jest.fn(),
      getDataRange: jest.fn(() => ({
        getValues: () => [['Date', 'Time', 'First', 'Last', 'Email', 'Phone']],
      })),
    };

    mockSpreadsheet.getSheetByName.mockImplementation((name) => {
      if (name === 'App Signups') return mockSheet;
      if (name === 'New Parishioners') return newParishSheet;
      return null;
    });

    const event = {
      postData: {
        contents: JSON.stringify({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          phone: '',
          wantsToJoinParish: true,
          ministry: 'Music Ministry',
          action: 'Removed',
        }),
      },
    };

    doPost(event);

    // newParishSheet.appendRow should NOT be called for removal
    expect(newParishSheet.appendRow).not.toHaveBeenCalled();
  });

  test('handles malformed JSON in postData', () => {
    const event = {
      postData: {
        contents: 'not valid json',
      },
    };

    const result = doPost(event);
    // Should return error response, not crash
    expect(result).toBeDefined();
  });

  test('BUG: null postData is caught by try/catch but returns error instead of crashing', () => {
    const event = {
      postData: null,
    };

    // The try/catch in doPost means this doesn't throw - it returns an error response
    // But this is actually a bug because the error message will be opaque
    const result = doPost(event);
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});

describe('doGet - Ministry Data Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty array when no ministries exist', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'Organizer Name', 'Organizer Email', 'Organizer Phone', 'Q1', 'Q2', 'Q3'],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    expect(parsed.ministries).toEqual([]);
  });

  test('parses ministry data correctly', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'Organizer Name', 'Organizer Email', 'Organizer Phone', 'Q1', 'Q2', 'Q3'],
          ['music', 'Music Ministry', 'Choir and instruments', '🎵', 'Jane', 'jane@test.com', '5551234567', '', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    expect(parsed.ministries.length).toBe(1);
    expect(parsed.ministries[0].id).toBe('music');
    expect(parsed.ministries[0].name).toBe('Music Ministry');
    expect(parsed.ministries[0].organizerName).toBe('Jane');
  });

  test('parses select question format correctly', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'OrgName', 'OrgEmail', 'OrgPhone', 'Q1', 'Q2', 'Q3'],
          ['test', 'Test', 'Desc', '📋', '', '', '', 'select|Voice part|Soprano,Alto,Tenor,Bass', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    const q = parsed.ministries[0].questions[0];
    expect(q.type).toBe('select');
    expect(q.label).toBe('Voice part');
    expect(q.options).toEqual(['Soprano', 'Alto', 'Tenor', 'Bass']);
  });

  test('parses checkbox question format correctly', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'OrgName', 'OrgEmail', 'OrgPhone', 'Q1', 'Q2', 'Q3'],
          ['test', 'Test', 'Desc', '📋', '', '', '', 'checkbox|Mass times|Sat 5pm,Sun 9am,Sun 11am', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    const q = parsed.ministries[0].questions[0];
    expect(q.type).toBe('checkbox');
    expect(q.label).toBe('Mass times');
    expect(q.options).toEqual(['Sat 5pm', 'Sun 9am', 'Sun 11am']);
  });

  test('parses text question format correctly', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'OrgName', 'OrgEmail', 'OrgPhone', 'Q1', 'Q2', 'Q3'],
          ['test', 'Test', 'Desc', '📋', '', '', '', 'text|Your instrument', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    const q = parsed.ministries[0].questions[0];
    expect(q.type).toBe('text');
    expect(q.label).toBe('Your instrument');
    expect(q.options).toEqual([]);
  });

  test('defaults icon to clipboard emoji when empty', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'OrgName', 'OrgEmail', 'OrgPhone', 'Q1', 'Q2', 'Q3'],
          ['test', 'Test', 'Desc', '', '', '', '', '', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    expect(parsed.ministries[0].icon).toBe('📋');
  });

  test('skips rows with empty ID', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'OrgName', 'OrgEmail', 'OrgPhone', 'Q1', 'Q2', 'Q3'],
          ['music', 'Music', 'Desc', '🎵', '', '', '', '', '', ''],
          ['', '', '', '', '', '', '', '', '', ''], // Empty row should be skipped
          ['youth', 'Youth', 'Desc', '🌟', '', '', '', '', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    expect(parsed.ministries.length).toBe(2);
  });

  test('returns error when Ministries sheet does not exist', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue(null);

    const result = doGet({});
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe('Ministries sheet not found');
  });

  test('BUG: question with only type (no pipe separator) creates empty label', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'OrgName', 'OrgEmail', 'OrgPhone', 'Q1', 'Q2', 'Q3'],
          ['test', 'Test', 'Desc', '📋', '', '', '', 'text', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    const q = parsed.ministries[0].questions[0];
    expect(q.type).toBe('text');
    expect(q.label).toBe(''); // Empty label - renders an empty label in the UI
  });

  test('BUG: question with pipe but no type defaults to empty type, not "text"', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue({
      getDataRange: jest.fn(() => ({
        getValues: () => [
          ['ID', 'Name', 'Description', 'Icon', 'OrgName', 'OrgEmail', 'OrgPhone', 'Q1', 'Q2', 'Q3'],
          ['test', 'Test', 'Desc', '📋', '', '', '', '|Some question', '', ''],
        ],
      })),
    });

    const result = doGet({});
    const parsed = JSON.parse(result);
    const q = parsed.ministries[0].questions[0];
    // parts[0] is '' which is falsy, so type defaults to 'text' via || 'text'
    expect(q.type).toBe('text');
    expect(q.label).toBe('Some question');
  });
});

describe('New Parishioner De-duplication', () => {
  test('BUG: email column index is hardcoded to 4, brittle if headers change', () => {
    // In doPost line 40: const emailColumn = 4;
    // This assumes the "Email" is always at index 4 in the New Parishioners sheet
    // The getNewParishionersHeaders returns: ['Date', 'Time', 'First', 'Last', 'Email', 'Phone']
    // Index 4 is correct, but if anyone adds a column, this would break silently

    const headers = getNewParishionersHeaders();
    expect(headers[4]).toBe('Email'); // Currently correct
    // But this is fragile - should use headers.indexOf('Email')
  });
});

describe('Helper Functions', () => {
  test('getSignupsHeaders returns correct columns', () => {
    const headers = getSignupsHeaders();
    expect(headers).toEqual([
      'Date', 'Time', 'First', 'Last', 'Email', 'Phone',
      'New Parishioner', 'Ministry', 'Action', 'Q1', 'Q2', 'Q3',
    ]);
  });

  test('getNewParishionersHeaders returns correct columns', () => {
    const headers = getNewParishionersHeaders();
    expect(headers).toEqual(['Date', 'Time', 'First', 'Last', 'Email', 'Phone']);
  });

  test('getMinistriesHeaders returns correct columns', () => {
    const headers = getMinistriesHeaders();
    expect(headers).toEqual([
      'ID', 'Name', 'Description', 'Icon',
      'Organizer Name', 'Organizer Email', 'Organizer Phone',
      'Question 1', 'Question 2', 'Question 3',
    ]);
  });
});
