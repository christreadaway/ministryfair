const SIGNUPS_SHEET_NAME = 'App Signups';
const NEW_PARISHIONERS_SHEET_NAME = 'New Parishioners';
const MINISTRIES_SHEET_NAME = 'Ministries';
const TIMEZONE = 'America/Chicago'; // Change to your timezone

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
      const headers = existingData[0] || [];
      const emailColumn = headers.indexOf('Email');
      const alreadyExists = emailColumn >= 0 && existingData.some(row => row[emailColumn] === data.email);
      
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

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
            type: parts.length > 1 ? (parts[0] || 'text') : 'text',
            label: parts.length > 1 ? (parts[1] || '') : parts[0],
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
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
  
  Logger.log('Setup complete! All tabs created. Edit the Ministries tab to add your own ministries.');
}
