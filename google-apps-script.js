const SIGNUPS_SHEET_NAME = 'App Signups';
const NEW_PARISHIONERS_SHEET_NAME = 'New Parishioners';
const MINISTRIES_SHEET_NAME = 'Ministries';
const ADMINS_SHEET_NAME = 'Admins';
const TIMEZONE = 'America/Chicago'; // Change to your timezone

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Route admin actions
    if (data.adminAction) {
      return handleAdminPost(ss, data);
    }

    const signupsSheet = getOrCreateSheet(ss, SIGNUPS_SHEET_NAME, getSignupsHeaders());

    const now = new Date();
    const date = Utilities.formatDate(now, TIMEZONE, "M/d/yy");
    const time = Utilities.formatDate(now, TIMEZONE, "h:mm a");

    // Determine action type (default to "Signup" for backward compatibility)
    const action = data.action || 'Signup';

    const row = [
      date,
      time,
      data.firstName || '',
      data.lastName || '',
      data.email || '',
      data.phone || '',
      data.wantsToJoinParish ? 'Yes' : 'No',
      data.ministry || '',
      action,
      data.q1 || '',
      data.q2 || '',
      data.q3 || ''
    ];

    signupsSheet.appendRow(row);

    // Only add to New Parishioners on signup (not removal)
    if (action === 'Signup' && data.wantsToJoinParish) {
      const newParishionersSheet = getOrCreateSheet(ss, NEW_PARISHIONERS_SHEET_NAME, getNewParishionersHeaders());
      const existingData = newParishionersSheet.getDataRange().getValues();
      const emailColumn = 4;
      const alreadyExists = existingData.some(row => row[emailColumn] === data.email);

      if (!alreadyExists) {
        const newParishionerRow = [
          date,
          time,
          data.firstName || '',
          data.lastName || '',
          data.email || '',
          data.phone || ''
        ];
        newParishionersSheet.appendRow(newParishionerRow);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAdminPost(ss, data) {
  const isAdminUser = isAdmin(ss, data.adminEmail);

  // Admin-only actions
  const adminOnlyActions = ['addMinistry', 'updateMinistry', 'deleteMinistry', 'addAdmin', 'removeAdmin'];
  if (adminOnlyActions.includes(data.adminAction) && !isAdminUser) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  switch (data.adminAction) {
    case 'addMinistry':
      return addMinistry(ss, data);
    case 'updateMinistry':
      return updateMinistry(ss, data);
    case 'deleteMinistry':
      return deleteMinistry(ss, data);
    case 'addAdmin':
      return addAdminUser(ss, data);
    case 'removeAdmin':
      return removeAdminUser(ss, data);
    default:
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Unknown admin action' }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

function addMinistry(ss, data) {
  const sheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Ministries sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const row = [
    data.id || '',
    data.name || '',
    data.description || '',
    data.icon || '📋',
    data.organizerName || '',
    data.organizerEmail || '',
    data.organizerPhone || '',
    data.question1 || '',
    data.question2 || '',
    data.question3 || ''
  ];

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateMinistry(ss, data) {
  const sheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Ministries sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      rowIndex = i + 1; // 1-based
      break;
    }
  }

  if (rowIndex === -1) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Ministry not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const updatedRow = [
    data.id,
    data.name || '',
    data.description || '',
    data.icon || '📋',
    data.organizerName || '',
    data.organizerEmail || '',
    data.organizerPhone || '',
    data.question1 || '',
    data.question2 || '',
    data.question3 || ''
  ];

  sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteMinistry(ss, data) {
  const sheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Ministries sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: 'Ministry not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function addAdminUser(ss, data) {
  const sheet = getOrCreateSheet(ss, ADMINS_SHEET_NAME, getAdminsHeaders());
  const email = (data.email || '').toLowerCase().trim();
  if (!email) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Email is required' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Check if already exists
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][0] && existing[i][0].toString().toLowerCase().trim() === email) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Admin already exists' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  const now = new Date();
  const date = Utilities.formatDate(now, TIMEZONE, "M/d/yy");
  sheet.appendRow([email, data.name || '', date]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function removeAdminUser(ss, data) {
  const sheet = ss.getSheetByName(ADMINS_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Admins sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const email = (data.email || '').toLowerCase().trim();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toString().toLowerCase().trim() === email) {
      sheet.deleteRow(i + 1);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: 'Admin not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function isAdmin(ss, email) {
  if (!email) return false;
  const sheet = ss.getSheetByName(ADMINS_SHEET_NAME);
  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();
  const normalizedEmail = email.toLowerCase().trim();
  // Column A is email, skip header row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase().trim() === normalizedEmail) {
      return true;
    }
  }
  return false;
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'getMinistries';

    switch (action) {
      case 'verifyAdmin':
        return handleVerifyAdmin(ss, e.parameter.email);
      case 'verifyUser':
        return handleVerifyUser(ss, e.parameter.email);
      case 'getSignups':
        return handleGetSignups(ss, e.parameter.email);
      case 'getLeaderSignups':
        return handleGetLeaderSignups(ss, e.parameter.email);
      case 'getNewParishioners':
        return handleGetNewParishioners(ss, e.parameter.email);
      case 'getAdmins':
        return handleGetAdmins(ss, e.parameter.email);
      case 'getMinistries':
      default:
        return handleGetMinistries(ss);
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleVerifyAdmin(ss, email) {
  const admin = isAdmin(ss, email);
  return ContentService
    .createTextOutput(JSON.stringify({ isAdmin: admin }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleVerifyUser(ss, email) {
  const admin = isAdmin(ss, email);
  const leaderMinistries = getLeaderMinistries(ss, email);
  const role = admin ? 'admin' : (leaderMinistries.length > 0 ? 'leader' : 'none');

  return ContentService
    .createTextOutput(JSON.stringify({
      role: role,
      isAdmin: admin,
      isLeader: leaderMinistries.length > 0,
      ministries: leaderMinistries
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getLeaderMinistries(ss, email) {
  if (!email) return [];
  const normalizedEmail = email.toLowerCase().trim();
  const sheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const ministries = [];
  for (let i = 1; i < data.length; i++) {
    const orgEmail = (data[i][5] || '').toString().toLowerCase().trim();
    if (orgEmail && orgEmail === normalizedEmail) {
      ministries.push({
        id: data[i][0],
        name: data[i][1]
      });
    }
  }
  return ministries;
}

function handleGetLeaderSignups(ss, email) {
  if (!email) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Verify this email is actually a leader
  const leaderMinistries = getLeaderMinistries(ss, email);
  if (leaderMinistries.length === 0 && !isAdmin(ss, email)) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(SIGNUPS_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ signups: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ministryNames = leaderMinistries.map(m => m.name);
  const data = sheet.getDataRange().getValues();
  const signups = [];
  for (let i = 1; i < data.length; i++) {
    if (ministryNames.includes(data[i][7])) {
      signups.push({
        date: data[i][0],
        time: data[i][1],
        firstName: data[i][2],
        lastName: data[i][3],
        email: data[i][4],
        phone: data[i][5],
        newParishioner: data[i][6],
        ministry: data[i][7],
        action: data[i][8],
        q1: data[i][9],
        q2: data[i][10],
        q3: data[i][11]
      });
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ signups: signups }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetAdmins(ss, email) {
  if (!isAdmin(ss, email)) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(ADMINS_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ admins: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const admins = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      admins.push({
        email: data[i][0],
        name: data[i][1] || '',
        addedDate: data[i][2] || ''
      });
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ admins: admins }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetSignups(ss, email) {
  if (!isAdmin(ss, email)) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(SIGNUPS_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ signups: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const signups = [];
  for (let i = 1; i < data.length; i++) {
    signups.push({
      date: data[i][0],
      time: data[i][1],
      firstName: data[i][2],
      lastName: data[i][3],
      email: data[i][4],
      phone: data[i][5],
      newParishioner: data[i][6],
      ministry: data[i][7],
      action: data[i][8],
      q1: data[i][9],
      q2: data[i][10],
      q3: data[i][11]
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ signups: signups }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetNewParishioners(ss, email) {
  if (!isAdmin(ss, email)) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(NEW_PARISHIONERS_SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ newParishioners: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const newParishioners = [];
  for (let i = 1; i < data.length; i++) {
    newParishioners.push({
      date: data[i][0],
      time: data[i][1],
      firstName: data[i][2],
      lastName: data[i][3],
      email: data[i][4],
      phone: data[i][5]
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ newParishioners: newParishioners }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetMinistries(ss) {
  const ministriesSheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);

  if (!ministriesSheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Ministries sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = ministriesSheet.getDataRange().getValues();
  const ministries = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const ministry = {
      id: row[0],
      name: row[1],
      description: row[2],
      icon: row[3] || '📋',
      organizerName: row[4] || '',
      organizerEmail: row[5] || '',
      organizerPhone: row[6] || '',
      questions: []
    };

    // Questions are in columns H, I, J (index 7, 8, 9)
    for (let q = 0; q < 3; q++) {
      const questionData = row[7 + q];
      if (questionData) {
        const parts = questionData.split('|');
        const question = {
          id: 'q' + (q + 1),
          type: parts[0] || 'text',
          label: parts[1] || '',
          options: parts[2] ? parts[2].split(',').map(s => s.trim()) : []
        };
        ministry.questions.push(question);
      }
    }

    ministries.push(ministry);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ministries: ministries }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(headers);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#8B2635');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);

    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }

  return sheet;
}

function getSignupsHeaders() {
  return ['Date', 'Time', 'First', 'Last', 'Email', 'Phone', 'New Parishioner', 'Ministry', 'Action', 'Q1', 'Q2', 'Q3'];
}

function getNewParishionersHeaders() {
  return ['Date', 'Time', 'First', 'Last', 'Email', 'Phone'];
}

function getMinistriesHeaders() {
  return ['ID', 'Name', 'Description', 'Icon', 'Organizer Name', 'Organizer Email', 'Organizer Phone', 'Question 1', 'Question 2', 'Question 3'];
}

function getAdminsHeaders() {
  return ['Email', 'Name', 'Added Date'];
}

// Run this to add Action column to existing App Signups sheet
function addActionColumn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const signupsSheet = ss.getSheetByName(SIGNUPS_SHEET_NAME);

  if (!signupsSheet) {
    Logger.log('App Signups sheet not found.');
    return;
  }

  // Get current headers
  const currentHeaders = signupsSheet.getRange(1, 1, 1, 12).getValues()[0];

  // Check if already has Action column
  if (currentHeaders[8] === 'Action') {
    Logger.log('Action column already exists.');
    return;
  }

  // Insert new column after Ministry (column H, index 8)
  signupsSheet.insertColumnAfter(8);

  // Set new header
  signupsSheet.getRange(1, 9).setValue('Action');

  // Format header cell
  const headerCell = signupsSheet.getRange(1, 9);
  headerCell.setFontWeight('bold');
  headerCell.setBackground('#8B2635');
  headerCell.setFontColor('#FFFFFF');

  // Fill existing rows with "Signup" as default
  const lastRow = signupsSheet.getLastRow();
  if (lastRow > 1) {
    const actionRange = signupsSheet.getRange(2, 9, lastRow - 1, 1);
    const values = [];
    for (let i = 0; i < lastRow - 1; i++) {
      values.push(['Signup']);
    }
    actionRange.setValues(values);
  }

  signupsSheet.autoResizeColumn(9);

  Logger.log('Action column added successfully! Existing rows marked as "Signup".');
}

// Run this to add organizer columns to existing Ministries sheet
function addOrganizerColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ministriesSheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);

  if (!ministriesSheet) {
    Logger.log('Ministries sheet not found. Run testSetup first.');
    return;
  }

  // Get current headers
  const currentHeaders = ministriesSheet.getRange(1, 1, 1, 10).getValues()[0];

  // Check if already has organizer columns
  if (currentHeaders[4] === 'Organizer Name') {
    Logger.log('Organizer columns already exist.');
    return;
  }

  // Insert 3 new columns after Icon (column D, index 4)
  ministriesSheet.insertColumnsAfter(4, 3);

  // Set new headers
  ministriesSheet.getRange(1, 5).setValue('Organizer Name');
  ministriesSheet.getRange(1, 6).setValue('Organizer Email');
  ministriesSheet.getRange(1, 7).setValue('Organizer Phone');

  // Format new header cells
  const newHeaderRange = ministriesSheet.getRange(1, 5, 1, 3);
  newHeaderRange.setFontWeight('bold');
  newHeaderRange.setBackground('#8B2635');
  newHeaderRange.setFontColor('#FFFFFF');

  // Auto-resize columns
  ministriesSheet.autoResizeColumn(5);
  ministriesSheet.autoResizeColumn(6);
  ministriesSheet.autoResizeColumn(7);

  Logger.log('Organizer columns added successfully!');
}

// Run this first to create all sheets with example data
function testSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, SIGNUPS_SHEET_NAME, getSignupsHeaders());
  getOrCreateSheet(ss, NEW_PARISHIONERS_SHEET_NAME, getNewParishionersHeaders());

  // Create Admins sheet
  let adminsSheet = ss.getSheetByName(ADMINS_SHEET_NAME);
  if (!adminsSheet) {
    adminsSheet = ss.insertSheet(ADMINS_SHEET_NAME);
    const headers = getAdminsHeaders();
    adminsSheet.appendRow(headers);

    const headerRange = adminsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#8B2635');
    headerRange.setFontColor('#FFFFFF');
    adminsSheet.setFrozenRows(1);

    for (let i = 1; i <= headers.length; i++) {
      adminsSheet.autoResizeColumn(i);
    }

    Logger.log('Admins sheet created. Add admin email addresses to grant dashboard access.');
  }

  let ministriesSheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);
  if (!ministriesSheet) {
    ministriesSheet = ss.insertSheet(MINISTRIES_SHEET_NAME);

    const headers = getMinistriesHeaders();
    ministriesSheet.appendRow(headers);

    const headerRange = ministriesSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#8B2635');
    headerRange.setFontColor('#FFFFFF');
    ministriesSheet.setFrozenRows(1);

    // Example ministries - replace with your own!
    const ministries = [
      ['music', 'Music Ministry', 'Supports parish liturgies through choirs, cantors, and instrumentalists.', '🎵', 'Jane Smith', 'jane@parish.org', '5125551234', 'select|Voice part (if known)|Not sure,Soprano,Alto,Tenor,Bass', 'text|Do you play an instrument? Which one(s)?', ''],
      ['hospitality', 'Hospitality Ministers', 'Welcomes parishioners and assists during Masses and parish events.', '🚪', 'John Doe', 'john@parish.org', '5125555678', 'checkbox|Which Mass times work for you?|Saturday 5pm,Sunday 9am,Sunday 11am', '', ''],
      ['youth', 'Youth Ministry', 'Faith formation and fellowship for middle and high school students.', '🌟', '', '', '', '', '', ''],
      ['svdp', 'St. Vincent de Paul Society', 'Assists individuals and families in need through direct support and resources.', '💚', '', '', '', '', '', ''],
      ['bible-study', 'Bible Study', 'Offers structured Scripture study with group discussion.', '📖', '', '', '', '', '', ''],
    ];

    ministries.forEach(row => ministriesSheet.appendRow(row));

    for (let i = 1; i <= headers.length; i++) {
      ministriesSheet.autoResizeColumn(i);
    }

    ministriesSheet.setColumnWidth(3, 400);
    ministriesSheet.setColumnWidth(8, 250);
    ministriesSheet.setColumnWidth(9, 250);
    ministriesSheet.setColumnWidth(10, 250);
  }

  Logger.log('Setup complete! All tabs created (including Admins). Add admin emails to the Admins tab to enable dashboard access.');
}
