// ============================================
// GOOGLE APPS SCRIPT BACKEND
// Provider: Google Sheets
//
// This is the backend for the Google Sheets provider.
// For Microsoft 365 / Excel, the frontend uses the
// Microsoft Graph API directly (see SpreadsheetProviders.microsoft
// in index.html). This file is only deployed for Google Sheets.
//
// Sheet structure:
// - Ministries: Ministry definitions (name, description, organizer, questions)
// - App Signups: Audit log of all signup/removal actions
// - New Parishioners: Deduplicated list of new parishioners
// - Admins: Admin email list
// - Follow-Up Questions: Multi-round follow-up question templates
// - Follow-Up Responses: Follow-up form submissions
// ============================================

const SIGNUPS_SHEET_NAME = 'App Signups';
const NEW_PARISHIONERS_SHEET_NAME = 'New Parishioners';
const MINISTRIES_SHEET_NAME = 'Ministries';
const ADMINS_SHEET_NAME = 'Admins';
const FOLLOWUP_QUESTIONS_SHEET_NAME = 'Follow-Up Questions';
const FOLLOWUP_RESPONSES_SHEET_NAME = 'Follow-Up Responses';
const TIMEZONE = 'America/Chicago'; // Change to your timezone

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet_(e);

    // ── Admin actions ─────────────────────────────
    if (data.adminAction) {
      return handleAdminPost(ss, data);
    }

    const action = data.action || 'Signup';

    // ── AI Proxy actions ──────────────────────────
    if (action === 'store-api-key') {
      return handleStoreApiKey(data);
    }
    if (action === 'ai-lookup') {
      return handleAiLookup(data);
    }
    if (action === 'ai-analyze') {
      return handleAiAnalyze(data);
    }
    if (action === 'check-api-key') {
      return handleCheckApiKey();
    }
    if (action === 'ai-parse-signups') {
      return handleAiParseSignups(data);
    }
    if (action === 'ai-enrich') {
      return handleAiEnrich(data);
    }

    // ── Follow-up response submission ───────────
    if (action === 'submitFollowupResponse') {
      return handleSubmitFollowupResponse(ss, data);
    }

    // ── Signup / Removal / Manual Entry actions ──
    const signupsSheet = getOrCreateSheet(ss, SIGNUPS_SHEET_NAME, getSignupsHeaders());

    const now = new Date();
    const date = Utilities.formatDate(now, TIMEZONE, "M/d/yy");
    const time = Utilities.formatDate(now, TIMEZONE, "h:mm a");

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

    // Add to New Parishioners on signup or manual entry (not removal)
    if ((action === 'Signup' || action === 'Manual Entry') && data.wantsToJoinParish) {
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
    const ss = getSpreadsheet_(e);
    if (!ss) {
      return jsonResponse({ error: 'Could not open spreadsheet. If this is a standalone script, pass ?sheetUrl=YOUR_SHEET_URL or set SPREADSHEET_URL in Script Properties.' });
    }
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'getMinistries';

    switch (action) {
      case 'verifyAdmin':
        return handleVerifyAdmin(ss, e.parameter.email);
      case 'verifyUser':
        return handleVerifyUser(ss, e.parameter.email);
      case 'scanSheets':
        return handleScanSheets(ss);
      case 'getMinistries':
        var sheetName = e.parameter.sheet || MINISTRIES_SHEET_NAME;
        return handleGetMinistries(ss, sheetName);
      case 'getSignups':
        return handleGetSignups(ss, e.parameter.email);
      case 'getLeaderSignups':
        return handleGetLeaderSignups(ss, e.parameter.email);
      case 'getNewParishioners':
        return handleGetNewParishioners(ss, e.parameter.email);
      case 'getAdmins':
        return handleGetAdmins(ss, e.parameter.email);
      case 'getFollowupQuestions':
        return handleGetFollowupQuestions(ss, e.parameter.ministryId);
      case 'getFollowupResponses':
        return handleGetFollowupResponses(ss, e.parameter.email, e.parameter.ministryId);
      default:
        return handleGetMinistries(ss, MINISTRIES_SHEET_NAME);
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get the spreadsheet — tries container-bound first, then URL parameter, then Script Properties
function getSpreadsheet_(e) {
  // 1. Try container-bound (script created from Extensions > Apps Script inside a Sheet)
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch(ignore) {}

  // 2. Try URL from query parameter (?sheetUrl=...)
  var urlParam = e && e.parameter && e.parameter.sheetUrl;
  if (urlParam) {
    try {
      return SpreadsheetApp.openByUrl(urlParam);
    } catch(ignore) {}
  }

  // 3. Try URL from Script Properties
  try {
    var stored = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_URL');
    if (stored) return SpreadsheetApp.openByUrl(stored);
  } catch(ignore) {}

  return null;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetMinistries(ss, sheetName) {
  const ministriesSheet = ss.getSheetByName(sheetName || MINISTRIES_SHEET_NAME);

  if (!ministriesSheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Ministries sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = ministriesSheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ ministries: [], format: 'empty' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Detect column layout: check if headers match expected format
  var headers = data[0].map(function(h) { return (h || '').toString().toLowerCase().trim(); });
  var isStandardFormat = (headers[0] === 'id' && headers[1] === 'name') ||
                         (headers[0] === 'id' && headers[2] === 'description');

  if (isStandardFormat) {
    return readStandardFormat(data);
  }

  // Non-standard format: detect columns by content analysis
  return readSmartFormat(data);
}

// Read from the expected Ministries format (ID, Name, Description, Icon, ...)
function readStandardFormat(data) {
  var ministries = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var ministry = {
      id: row[0],
      name: row[1],
      description: row[2],
      icon: row[3] || '📋',
      organizerName: row[4] || '',
      organizerEmail: row[5] || '',
      organizerPhone: row[6] || '',
      questions: []
    };
    var tagsData = row[10];
    if (tagsData) {
      ministry.tags = tagsData.toString().split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
    }
    for (var q = 0; q < 3; q++) {
      var questionData = row[7 + q];
      if (questionData) {
        var parts = questionData.split('|');
        ministry.questions.push({
          id: 'q' + (q + 1),
          type: parts.length > 1 ? (parts[0] || 'text') : 'text',
          label: parts.length > 1 ? (parts[1] || '') : parts[0],
          options: parts[2] ? parts[2].split(',').map(function(s) { return s.trim(); }) : []
        });
      }
    }
    ministries.push(ministry);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ministries: ministries, format: 'standard' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Smart format: detect columns by scanning actual cell content
function readSmartFormat(data) {
  var headers = data[0];
  var numCols = headers.length;
  var sampleRows = data.slice(1, Math.min(data.length, 20));

  // Score each column for what role it likely plays
  var colScores = [];
  for (var c = 0; c < numCols; c++) {
    colScores.push({ email: 0, phone: 0, name: 0, ministry: 0, number: 0, description: 0, url: 0, date: 0, empty: 0 });
  }

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var phonePattern = /^[\d\s\(\)\-\+\.]{7,}$/;
  var numberPattern = /^\d+$/;
  var urlPattern = /^https?:\/\//;
  var datePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}/;

  for (var r = 0; r < sampleRows.length; r++) {
    var row = sampleRows[r];
    for (var c = 0; c < numCols; c++) {
      var val = (row[c] || '').toString().trim();
      if (!val) { colScores[c].empty++; continue; }

      if (emailPattern.test(val)) colScores[c].email++;
      else if (phonePattern.test(val)) colScores[c].phone++;
      else if (numberPattern.test(val)) colScores[c].number++;
      else if (urlPattern.test(val)) colScores[c].url++;
      else if (datePattern.test(val)) colScores[c].date++;
      else if (val.length > 80) colScores[c].description++;
      else colScores[c].name++; // short text: either a name or a ministry title
    }
  }

  // Also check header text for clues
  var headerLower = headers.map(function(h) { return (h || '').toString().toLowerCase().trim(); });
  for (var c = 0; c < numCols; c++) {
    var h = headerLower[c];
    if (h.indexOf('email') >= 0) colScores[c].email += 10;
    if (h.indexOf('phone') >= 0 || h.indexOf('cell') >= 0 || h.indexOf('mobile') >= 0) colScores[c].phone += 10;
    if (h.indexOf('name') >= 0 && h.indexOf('ministry') < 0) colScores[c].name += 5;
    if (h.indexOf('ministry') >= 0 || h.indexOf('group') >= 0 || h.indexOf('team') >= 0) colScores[c].ministry += 10;
    if (h.indexOf('description') >= 0 || h.indexOf('what') >= 0 || h.indexOf('about') >= 0) colScores[c].description += 10;
    if (h.indexOf('contact') >= 0) colScores[c].name += 3;
  }

  // Assign columns to roles (pick highest-scoring column for each role)
  var emailCol = -1, nameCol = -1, ministryCol = -1, phoneCol = -1, descCol = -1;

  // Find email column first (most reliable pattern)
  var bestEmail = -1, bestEmailScore = 0;
  for (var c = 0; c < numCols; c++) {
    if (colScores[c].email > bestEmailScore) {
      bestEmailScore = colScores[c].email;
      bestEmail = c;
    }
  }
  if (bestEmailScore > 0) emailCol = bestEmail;

  // Find phone column
  var bestPhone = -1, bestPhoneScore = 0;
  for (var c = 0; c < numCols; c++) {
    if (c === emailCol) continue;
    if (colScores[c].phone > bestPhoneScore) {
      bestPhoneScore = colScores[c].phone;
      bestPhone = c;
    }
  }
  if (bestPhoneScore > 0) phoneCol = bestPhone;

  // Find description column (longest text)
  var bestDesc = -1, bestDescScore = 0;
  for (var c = 0; c < numCols; c++) {
    if (c === emailCol || c === phoneCol) continue;
    if (colScores[c].description > bestDescScore) {
      bestDescScore = colScores[c].description;
      bestDesc = c;
    }
  }
  if (bestDescScore > 0) descCol = bestDesc;

  // For remaining text columns, distinguish ministry name from person name.
  // The ministry name column likely has more unique values that look like titles.
  // The person name column has values like "John Smith".
  var textCols = [];
  for (var c = 0; c < numCols; c++) {
    if (c === emailCol || c === phoneCol || c === descCol) continue;
    if (colScores[c].name > 0 || colScores[c].ministry > 0) {
      textCols.push(c);
    }
  }

  if (textCols.length >= 2) {
    // Score: check for header hints first
    var col1 = textCols[0], col2 = textCols[1];
    var score1Ministry = colScores[col1].ministry;
    var score2Ministry = colScores[col2].ministry;

    // Heuristic: the column with more unique multi-word values that DON'T look
    // like "FirstName LastName" is more likely ministry names
    if (score1Ministry > score2Ministry) {
      ministryCol = col1;
      nameCol = col2;
    } else if (score2Ministry > score1Ministry) {
      ministryCol = col2;
      nameCol = col1;
    } else {
      // Check which column has values that look more like org names vs person names
      // Person names: typically 2 words, each capitalized. Ministry names: varied.
      var personLike1 = 0, personLike2 = 0;
      for (var r = 0; r < sampleRows.length; r++) {
        var v1 = (sampleRows[r][col1] || '').toString().trim();
        var v2 = (sampleRows[r][col2] || '').toString().trim();
        if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(v1)) personLike1++;
        if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(v2)) personLike2++;
      }
      if (personLike1 > personLike2) {
        nameCol = col1; ministryCol = col2;
      } else {
        nameCol = col2; ministryCol = col1;
      }
    }
  } else if (textCols.length === 1) {
    // Only one text column — assume it's the ministry name
    ministryCol = textCols[0];
  }

  // Build ministry list from detected columns, deduplicating by ministry name
  var seen = {};
  var ministries = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var mName = ministryCol >= 0 ? (row[ministryCol] || '').toString().trim() : '';
    if (!mName) continue;

    var mEmail = emailCol >= 0 ? (row[emailCol] || '').toString().trim() : '';
    var mContact = nameCol >= 0 ? (row[nameCol] || '').toString().trim() : '';
    var mPhone = phoneCol >= 0 ? (row[phoneCol] || '').toString().trim() : '';
    var mDesc = descCol >= 0 ? (row[descCol] || '').toString().trim() : '';

    // Skip rows where the "ministry name" looks like just a number or email
    if (/^\d+$/.test(mName)) continue;
    if (emailPattern.test(mName)) continue;

    var key = mName.toLowerCase().replace(/\s+/g, ' ');
    if (seen[key]) {
      // Deduplicate: keep the one with more data, but merge contacts
      continue;
    }
    seen[key] = true;

    var id = mName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);

    ministries.push({
      id: id,
      name: mName,
      description: mDesc,
      icon: '📋',
      organizerName: mContact,
      organizerEmail: mEmail,
      organizerPhone: mPhone,
      questions: []
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      ministries: ministries,
      format: 'detected',
      columnMapping: {
        email: emailCol, name: nameCol, ministry: ministryCol,
        phone: phoneCol, description: descCol
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// SHEET SCANNING — find best ministry list tab
// ============================================

/**
 * Scans all tabs in the spreadsheet, scores each for how likely it is to
 * contain a ministry list, and returns them ranked best-first.
 */
function handleScanSheets(ss) {
  var sheets = ss.getSheets();
  var candidates = [];

  // These are app-managed tabs — skip them
  var appTabs = [SIGNUPS_SHEET_NAME, NEW_PARISHIONERS_SHEET_NAME,
    ADMINS_SHEET_NAME, FOLLOWUP_QUESTIONS_SHEET_NAME,
    FOLLOWUP_RESPONSES_SHEET_NAME];

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var name = sheet.getName();
    if (appTabs.indexOf(name) >= 0) continue;

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) continue; // needs header + at least 1 row

    // Read header row and first few data rows
    var headerRange = sheet.getRange(1, 1, 1, lastCol);
    var headers = headerRange.getValues()[0].map(function(h) {
      return (h || '').toString().toLowerCase().trim();
    });

    var rowCount = lastRow - 1; // exclude header
    var sampleSize = Math.min(rowCount, 5);
    var sampleData = sheet.getRange(2, 1, sampleSize, lastCol).getValues();

    // Score this sheet
    var score = 0;
    var matchedFields = [];

    // Check header keywords
    var headerKeywords = {
      name: ['name', 'ministry', 'ministry name', 'group', 'group name', 'organization', 'team'],
      description: ['description', 'desc', 'about', 'details', 'summary', 'what we do', 'purpose', 'mission'],
      contact: ['contact', 'organizer', 'leader', 'lead', 'coordinator', 'chair', 'head', 'director'],
      email: ['email', 'e-mail', 'contact email', 'organizer email', 'leader email'],
      phone: ['phone', 'telephone', 'cell', 'mobile', 'contact phone', 'number'],
      icon: ['icon', 'emoji', 'symbol'],
      id: ['id', 'slug', 'key', 'code']
    };

    for (var field in headerKeywords) {
      var keywords = headerKeywords[field];
      for (var h = 0; h < headers.length; h++) {
        if (keywords.indexOf(headers[h]) >= 0 || keywords.some(function(kw) { return headers[h].indexOf(kw) >= 0; })) {
          score += (field === 'name' ? 20 : field === 'description' ? 15 : 5);
          matchedFields.push(field);
          break;
        }
      }
    }

    // Bonus for having a good number of rows (more rows = more likely the master list)
    if (rowCount >= 5) score += 10;
    if (rowCount >= 10) score += 10;
    if (rowCount >= 20) score += 5;

    // Scan sample data for email addresses — a column of emails is a strong signal
    // of a contact/ministry directory
    var emailsFound = 0;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (var s = 0; s < sampleData.length; s++) {
      for (var sc = 0; sc < sampleData[s].length; sc++) {
        if (emailRegex.test((sampleData[s][sc] || '').toString().trim())) {
          emailsFound++;
          break; // one email per row is enough
        }
      }
    }
    if (emailsFound >= 3) score += 15; // consistent emails = contact list

    // Bonus if tab name itself sounds ministry-related
    var nameLower = name.toLowerCase();
    var tabKeywords = ['ministr', 'group', 'organization', 'team', 'committee', 'list',
                       'master', 'all', 'table', 'contact', 'director'];
    for (var t = 0; t < tabKeywords.length; t++) {
      if (nameLower.indexOf(tabKeywords[t]) >= 0) {
        score += 10;
        break;
      }
    }

    // Exact match for our expected tab name gets a big bonus
    if (name === MINISTRIES_SHEET_NAME) score += 30;

    // Build sample preview (first 3 rows, first 5 cols)
    var previewCols = Math.min(lastCol, 5);
    var previewHeaders = headers.slice(0, previewCols);
    var previewRows = [];
    for (var r = 0; r < Math.min(sampleData.length, 3); r++) {
      previewRows.push(sampleData[r].slice(0, previewCols).map(function(v) {
        return (v || '').toString().substring(0, 60);
      }));
    }

    candidates.push({
      name: name,
      rowCount: rowCount,
      colCount: lastCol,
      score: score,
      matchedFields: matchedFields,
      headers: previewHeaders,
      preview: previewRows
    });
  }

  // Sort by score descending
  candidates.sort(function(a, b) { return b.score - a.score; });

  return ContentService
    .createTextOutput(JSON.stringify({
      sheets: candidates,
      recommended: candidates.length > 0 ? candidates[0].name : null
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

function handleAdminPost(ss, data) {
  const adminUser = isAdminServer(ss, data.adminEmail);

  const adminOnlyActions = ['addMinistry', 'updateMinistry', 'deleteMinistry', 'addAdmin', 'removeAdmin', 'saveFollowupQuestions'];

  // Allow ministry leaders to save follow-up questions for their own ministries
  if (data.adminAction === 'saveFollowupQuestions' && !adminUser) {
    const leaderMinistries = getLeaderMinistries(ss, data.adminEmail);
    const isLeaderOfMinistry = leaderMinistries.some(m => m.id === data.ministryId);
    if (!isLeaderOfMinistry) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } else if (adminOnlyActions.includes(data.adminAction) && !adminUser) {
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
    case 'saveFollowupQuestions':
      return saveFollowupQuestions(ss, data);
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
    data.id || '', data.name || '', data.description || '', data.icon || '📋',
    data.organizerName || '', data.organizerEmail || '', data.organizerPhone || '',
    data.question1 || '', data.question2 || '', data.question3 || '',
    data.tags || ''
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
    if (rows[i][0] === data.id) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Ministry not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const updatedRow = [
    data.id, data.name || '', data.description || '', data.icon || '📋',
    data.organizerName || '', data.organizerEmail || '', data.organizerPhone || '',
    data.question1 || '', data.question2 || '', data.question3 || '',
    data.tags || ''
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

function isAdminServer(ss, email) {
  if (!email) return false;
  const sheet = ss.getSheetByName(ADMINS_SHEET_NAME);
  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();
  const normalizedEmail = email.toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase().trim() === normalizedEmail) {
      return true;
    }
  }
  return false;
}

function handleVerifyAdmin(ss, email) {
  return ContentService
    .createTextOutput(JSON.stringify({ isAdmin: isAdminServer(ss, email) }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleVerifyUser(ss, email) {
  const admin = isAdminServer(ss, email);
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
      ministries.push({ id: data[i][0], name: data[i][1] });
    }
  }
  return ministries;
}

function handleGetSignups(ss, email) {
  if (!isAdminServer(ss, email)) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(SIGNUPS_SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ signups: [] })).setMimeType(ContentService.MimeType.JSON);

  const data = sheet.getDataRange().getValues();
  const signups = [];
  for (let i = 1; i < data.length; i++) {
    signups.push({
      date: data[i][0], time: data[i][1], firstName: data[i][2], lastName: data[i][3],
      email: data[i][4], phone: data[i][5], newParishioner: data[i][6], ministry: data[i][7],
      action: data[i][8], q1: data[i][9], q2: data[i][10], q3: data[i][11]
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ signups: signups })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetLeaderSignups(ss, email) {
  if (!email) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
  }

  const leaderMinistries = getLeaderMinistries(ss, email);
  if (leaderMinistries.length === 0 && !isAdminServer(ss, email)) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(SIGNUPS_SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ signups: [] })).setMimeType(ContentService.MimeType.JSON);

  const ministryNames = leaderMinistries.map(m => m.name);
  const data = sheet.getDataRange().getValues();
  const signups = [];
  for (let i = 1; i < data.length; i++) {
    if (ministryNames.includes(data[i][7])) {
      signups.push({
        date: data[i][0], time: data[i][1], firstName: data[i][2], lastName: data[i][3],
        email: data[i][4], phone: data[i][5], newParishioner: data[i][6], ministry: data[i][7],
        action: data[i][8], q1: data[i][9], q2: data[i][10], q3: data[i][11]
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ signups: signups })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetNewParishioners(ss, email) {
  if (!isAdminServer(ss, email)) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(NEW_PARISHIONERS_SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ newParishioners: [] })).setMimeType(ContentService.MimeType.JSON);

  const data = sheet.getDataRange().getValues();
  const newParishioners = [];
  for (let i = 1; i < data.length; i++) {
    newParishioners.push({
      date: data[i][0], time: data[i][1], firstName: data[i][2], lastName: data[i][3],
      email: data[i][4], phone: data[i][5]
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ newParishioners: newParishioners })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetAdmins(ss, email) {
  if (!isAdminServer(ss, email)) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = ss.getSheetByName(ADMINS_SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ admins: [] })).setMimeType(ContentService.MimeType.JSON);

  const data = sheet.getDataRange().getValues();
  const admins = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      admins.push({ email: data[i][0], name: data[i][1] || '', addedDate: data[i][2] || '' });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ admins: admins })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// FOLLOW-UP QUESTIONNAIRE ENDPOINTS
// ============================================

function getFollowupQuestionsHeaders() {
  return ['Ministry ID', 'Ministry Name', 'Round', 'Q1', 'Q2', 'Q3'];
}

function getFollowupResponsesHeaders() {
  return ['Date', 'Time', 'First', 'Last', 'Email', 'Phone', 'Ministry', 'Round', 'Q1', 'Q2', 'Q3'];
}

/**
 * GET: Return follow-up questions for a specific ministry.
 * No authentication required (public form).
 */
function handleGetFollowupQuestions(ss, ministryId) {
  if (!ministryId) {
    return jsonResponse({ rounds: [] });
  }

  const sheet = ss.getSheetByName(FOLLOWUP_QUESTIONS_SHEET_NAME);
  if (!sheet) {
    return jsonResponse({ rounds: [] });
  }

  const data = sheet.getDataRange().getValues();
  // Collect all rounds for this ministry, sorted by round number
  const roundsMap = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === ministryId) {
      const roundNum = parseInt(data[i][2]) || 1;
      const questions = [];
      // Columns D-F (indices 3-5) contain Q1-Q3
      for (let q = 3; q <= 5; q++) {
        if (data[i][q]) {
          questions.push(data[i][q].toString());
        }
      }
      roundsMap[roundNum] = questions;
    }
  }

  // Convert to ordered array
  const rounds = [];
  const roundNums = Object.keys(roundsMap).map(Number).sort();
  roundNums.forEach(function(num) {
    // Ensure rounds array is filled up to this index
    while (rounds.length < num) {
      rounds.push([]);
    }
    rounds[num - 1] = roundsMap[num];
  });

  return jsonResponse({ rounds: rounds });
}

/**
 * GET: Return follow-up responses for a ministry (admin/leader only).
 */
function handleGetFollowupResponses(ss, email, ministryId) {
  if (!email) {
    return jsonResponse({ error: 'Unauthorized' });
  }

  const isAdmin = isAdminServer(ss, email);
  if (!isAdmin) {
    const leaderMinistries = getLeaderMinistries(ss, email);
    if (ministryId) {
      const isLeader = leaderMinistries.some(m => m.id === ministryId);
      if (!isLeader) {
        return jsonResponse({ error: 'Unauthorized' });
      }
    } else if (leaderMinistries.length === 0) {
      return jsonResponse({ error: 'Unauthorized' });
    }
  }

  const sheet = ss.getSheetByName(FOLLOWUP_RESPONSES_SHEET_NAME);
  if (!sheet) {
    return jsonResponse({ responses: [] });
  }

  const data = sheet.getDataRange().getValues();
  const responses = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (ministryId && row[6] !== ministryId) continue;
    responses.push({
      date: row[0], time: row[1], firstName: row[2], lastName: row[3],
      email: row[4], phone: row[5], ministry: row[6], round: row[7],
      q1: row[8], q2: row[9], q3: row[10]
    });
  }

  return jsonResponse({ responses: responses });
}

/**
 * POST (admin): Save follow-up questions for a ministry.
 * Upserts: if the ministry already has questions, update the row; otherwise insert.
 */
function saveFollowupQuestions(ss, data) {
  const ministryId = data.ministryId;
  if (!ministryId) {
    return jsonResponse({ success: false, error: 'Ministry ID required' });
  }

  const rounds = data.rounds || [];
  const sheet = getOrCreateSheet(ss, FOLLOWUP_QUESTIONS_SHEET_NAME, getFollowupQuestionsHeaders());

  // Find ministry name from Ministries sheet
  let ministryName = ministryId;
  const ministriesSheet = ss.getSheetByName(MINISTRIES_SHEET_NAME);
  if (ministriesSheet) {
    const mData = ministriesSheet.getDataRange().getValues();
    for (let i = 1; i < mData.length; i++) {
      if (mData[i][0] === ministryId) {
        ministryName = mData[i][1] || ministryId;
        break;
      }
    }
  }

  // Delete all existing rows for this ministry
  const existingData = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = existingData.length - 1; i >= 1; i--) {
    if (existingData[i][0] === ministryId) {
      rowsToDelete.push(i + 1); // 1-indexed
    }
  }
  rowsToDelete.forEach(function(r) { sheet.deleteRow(r); });

  // Insert one row per round: Ministry ID, Ministry Name, Round, Q1, Q2, Q3
  rounds.forEach(function(roundQs, roundIdx) {
    const roundNum = roundIdx + 1;
    const row = [ministryId, ministryName, roundNum];
    for (let q = 0; q < 3; q++) {
      row.push(roundQs[q] || '');
    }
    sheet.appendRow(row);
  });

  return jsonResponse({ success: true });
}

/**
 * POST: Submit a follow-up response (public, no auth required).
 */
function handleSubmitFollowupResponse(ss, data) {
  const sheet = getOrCreateSheet(ss, FOLLOWUP_RESPONSES_SHEET_NAME, getFollowupResponsesHeaders());

  const now = new Date();
  const date = Utilities.formatDate(now, TIMEZONE, "M/d/yy");
  const time = Utilities.formatDate(now, TIMEZONE, "h:mm a");

  const answers = data.answers || [];
  const round = data.round || 1;
  const row = [
    date,
    time,
    data.firstName || '',
    data.lastName || '',
    data.email || '',
    data.phone || '',
    data.ministryName || data.ministryId || '',
    round
  ];

  // Append up to 3 answers
  for (let i = 0; i < 3; i++) {
    row.push(answers[i] || '');
  }

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// AI PROXY - Claude API key stored securely
// in Script Properties (encrypted at rest by Google)
// ============================================

/**
 * Store the Claude API key as a Script Property.
 * Called once during setup. The key never touches localStorage.
 */
function handleStoreApiKey(data) {
  const key = data.apiKey || '';
  if (!key || !key.startsWith('sk-')) {
    return jsonResponse({ success: false, error: 'Invalid API key format' });
  }
  PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', key);
  return jsonResponse({ success: true });
}

function getStoredApiKey_() {
  return PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY') || '';
}

/**
 * Check if a Claude API key is stored server-side.
 */
function handleCheckApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  return jsonResponse({ hasKey: !!key });
}

/**
 * Proxy: domain lookup via Claude API.
 * Client sends { action: 'ai-lookup', domain: 'example.org' }
 * Server calls Claude and returns the result.
 */
function handleAiLookup(data) {
  const key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!key) {
    return jsonResponse({ success: false, error: 'No API key configured on server' });
  }

  const domain = data.domain || '';
  if (!domain) {
    return jsonResponse({ success: false, error: 'No domain provided' });
  }

  const prompt = 'Analyze this email domain: "' + domain + '"\n\n' +
    'Based on the domain name and any knowledge you have, determine:\n' +
    '1. Is this likely a church, parish, temple, synagogue, mosque, or other religious organization?\n' +
    '2. If yes, what is the probable full name of the organization?\n' +
    '3. What denomination or religious tradition (if identifiable from the domain)?\n' +
    '4. What city/state or region (if identifiable)?\n\n' +
    'Return ONLY a JSON object with these fields:\n' +
    '{\n' +
    '  "isReligiousOrg": boolean,\n' +
    '  "organizationName": string,\n' +
    '  "denomination": string,\n' +
    '  "location": string,\n' +
    '  "confidence": "high" | "medium" | "low"\n' +
    '}\n\n' +
    'If you cannot determine, set isReligiousOrg to false. Return ONLY JSON, no explanation.';

  return callClaude(key, prompt, 256);
}

/**
 * Proxy: spreadsheet column mapping via Claude API.
 * Client sends { action: 'ai-analyze', headers: [...], sampleData: '...' }
 * Server calls Claude and returns the mapping result.
 */
function handleAiAnalyze(data) {
  const key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!key) {
    return jsonResponse({ success: false, error: 'No API key configured on server' });
  }

  const sampleData = data.sampleData || '';
  if (!sampleData) {
    return jsonResponse({ success: false, error: 'No sample data provided' });
  }

  const prompt = data.prompt || '';
  if (!prompt) {
    return jsonResponse({ success: false, error: 'No prompt provided' });
  }

  return callClaude(key, prompt, 1024);
}

/**
 * Call the Claude API server-side.
 */
/**
 * AI Parse Signups: extract signup data from an image of a paper sign-up sheet.
 */
function handleAiParseSignups(data) {
  const apiKey = getStoredApiKey_();
  if (!apiKey) {
    return jsonResponse({ success: false, error: 'No Claude API key configured. Add one in Settings.' });
  }

  const imageData = data.imageData;
  const mediaType = data.mediaType || 'image/jpeg';
  const defaultMinistry = data.defaultMinistry || '';
  const ministryNames = data.ministryNames || [];

  if (!imageData) {
    return jsonResponse({ success: false, error: 'No image data provided' });
  }

  const prompt = 'Look at this image of a physical sign-up sheet. Extract all signup entries you can find.\n\n' +
    'For each person, extract:\n' +
    '- firstName\n- lastName\n- email (if visible)\n- phone (if visible)\n' +
    '- ministry (if identifiable from the sheet title or context)\n\n' +
    (defaultMinistry ? 'Default ministry if not identifiable: "' + defaultMinistry + '"\n' : '') +
    (ministryNames.length > 0 ? 'Known ministry names: ' + ministryNames.join(', ') + '\n' : '') +
    '\nReturn ONLY a JSON object with this exact structure:\n' +
    '{"entries": [{"firstName": "", "lastName": "", "email": "", "phone": "", "ministry": ""}]}\n\n' +
    'If you cannot read certain fields, leave them as empty strings. Do your best to decipher handwriting.';

  const content = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
    { type: 'text', text: prompt }
  ];

  return callClaude(apiKey, content, 4096);
}

/**
 * AI Enrich: analyze a ministry booklet (PDF/image) or additional spreadsheet
 * and extract data that can enrich existing ministry records.
 *
 * Client sends:
 *   { action: 'ai-enrich', sourceType: 'booklet'|'spreadsheet',
 *     fileData: base64, mediaType: 'application/pdf'|...,
 *     existingMinistries: [{id, name, description, ...}],
 *     sampleData: '...' (for spreadsheets) }
 */
function handleAiEnrich(data) {
  const apiKey = getStoredApiKey_();
  if (!apiKey) {
    return jsonResponse({ success: false, error: 'No Claude API key configured. Add one in Settings.' });
  }

  var existingMinistries = data.existingMinistries || [];
  var ministryList = existingMinistries.map(function(m) {
    return '- ' + m.name + (m.description ? ' (' + m.description.substring(0, 60) + '...)' : '');
  }).join('\n');

  if (data.sourceType === 'booklet') {
    // PDF/image booklet enrichment
    var fileData = data.fileData;
    var mediaType = data.mediaType || 'application/pdf';
    if (!fileData) return jsonResponse({ success: false, error: 'No file data provided' });

    var prompt = 'I have a ministry booklet or document from a church/parish. I also have an existing list of ministries in our database.\n\n' +
      'EXISTING MINISTRIES:\n' + ministryList + '\n\n' +
      'Please analyze this document and extract enrichment data for each ministry you can identify. For each ministry:\n' +
      '1. Match it to an existing ministry by name (fuzzy matching is OK — "Lectors" matches "Lector Ministry")\n' +
      '2. Extract any new information: richer description, meeting times/schedule, location, requirements, who to contact, mission statement, activities, etc.\n\n' +
      'Also identify any ministries in the booklet that are NOT in our existing list.\n\n' +
      'CONTENT MODERATION: Ensure all extracted text is appropriate for a public-facing parish website. Rewrite informal or poorly-worded descriptions into clear, welcoming language. Omit any inappropriate content.\n\n' +
      'Return ONLY a JSON object with this structure:\n' +
      '{\n' +
      '  "enrichments": [\n' +
      '    {\n' +
      '      "existingId": "ministry-id or null if new",\n' +
      '      "existingName": "matched ministry name or null",\n' +
      '      "bookletName": "name as it appears in the booklet",\n' +
      '      "description": "enriched description (longer/better than existing)",\n' +
      '      "meetingTime": "if mentioned",\n' +
      '      "location": "if mentioned",\n' +
      '      "requirements": "if mentioned",\n' +
      '      "contactName": "if mentioned",\n' +
      '      "contactEmail": "if mentioned",\n' +
      '      "contactPhone": "if mentioned",\n' +
      '      "additionalNotes": "any other useful info"\n' +
      '    }\n' +
      '  ],\n' +
      '  "newMinistries": ["names of ministries in booklet but not in existing list"],\n' +
      '  "summary": "brief human-readable summary of what was found"\n' +
      '}';

    var content = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileData } },
      { type: 'text', text: prompt }
    ];

    return callClaude(apiKey, content, 4096);
  }

  if (data.sourceType === 'spreadsheet') {
    // Additional spreadsheet enrichment
    var sampleData = data.sampleData || '';
    if (!sampleData) return jsonResponse({ success: false, error: 'No spreadsheet data provided' });

    var prompt = 'I have a supplementary spreadsheet (possibly form responses) with additional information about church/parish ministries. I also have existing ministry records.\n\n' +
      'EXISTING MINISTRIES:\n' + ministryList + '\n\n' +
      'SUPPLEMENTARY SPREADSHEET DATA:\n' + sampleData + '\n\n' +
      'Analyze this spreadsheet and:\n' +
      '1. Match each row to an existing ministry by name (fuzzy matching OK)\n' +
      '2. Identify what new/additional data each row provides beyond what we already have\n' +
      '3. Map the columns to useful fields\n\n' +
      'CONTENT MODERATION — IMPORTANT:\n' +
      'This data may come from raw form responses. Before including any text in the enrichment output:\n' +
      '- FILTER OUT casual remarks, jokes, off-topic comments, event logistics, complaints, internal notes, and anything not suitable for a public-facing ministry description.\n' +
      '- FILTER OUT any profanity, inappropriate language, or content that would be offensive in a church/parish context.\n' +
      '- ONLY extract substantive, professional descriptions of what the ministry does, its mission, activities, meeting details, and contact information.\n' +
      '- REWRITE informal or poorly-written descriptions into clear, respectful, welcoming language appropriate for a parish website.\n' +
      '- If a form response contains no usable ministry description (just junk, logistics, or inappropriate content), set description to null rather than including bad content.\n\n' +
      'Return ONLY a JSON object with this structure:\n' +
      '{\n' +
      '  "enrichments": [\n' +
      '    {\n' +
      '      "existingId": "ministry-id or null if new",\n' +
      '      "existingName": "matched ministry name or null",\n' +
      '      "sheetName": "name as it appears in the spreadsheet",\n' +
      '      "description": "enriched/updated description if available",\n' +
      '      "organizerName": "if available",\n' +
      '      "organizerEmail": "if available",\n' +
      '      "organizerPhone": "if available",\n' +
      '      "meetingTime": "if available",\n' +
      '      "location": "if available",\n' +
      '      "additionalNotes": "any other useful info from this row"\n' +
      '    }\n' +
      '  ],\n' +
      '  "newMinistries": ["names of ministries in sheet but not in existing list"],\n' +
      '  "columnMapping": {"columnName": "whatItMapsTo"},\n' +
      '  "summary": "brief human-readable summary of what was found"\n' +
      '}';

    return callClaude(apiKey, prompt, 4096);
  }

  return jsonResponse({ success: false, error: 'Unknown sourceType: ' + data.sourceType });
}

function callClaude(apiKey, promptOrContent, maxTokens) {
  try {
    // Support both string prompts and structured content arrays
    const messageContent = typeof promptOrContent === 'string' ? promptOrContent : promptOrContent;

    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: maxTokens || 1024,
        messages: [{ role: 'user', content: messageContent }]
      }),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code !== 200) {
      return jsonResponse({ success: false, error: 'Claude API returned ' + code });
    }

    const result = JSON.parse(response.getContentText());
    const text = result.content[0].text;
    // Try to extract JSON from the response
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return jsonResponse({ success: true, result: parsed });
    } catch(e) {
      // Return raw text if not JSON
      return jsonResponse({ success: true, result: cleaned });
    }

  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
  return ['ID', 'Name', 'Description', 'Icon', 'Organizer Name', 'Organizer Email', 'Organizer Phone', 'Question 1', 'Question 2', 'Question 3', 'Tags'];
}

function getAdminsHeaders() {
  return ['Email', 'Name', 'Date Added'];
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

// Run this to manually set the Claude API key from the GAS editor
// (alternative to setting it via the app's setup wizard)
// Usage: Run setClaudeApiKey() > enter key when prompted
function setClaudeApiKey() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    'Set Claude API Key',
    'Enter your Claude API key (starts with sk-ant-):',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() === ui.Button.OK) {
    const key = result.getResponseText().trim();
    if (key && key.startsWith('sk-')) {
      PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', key);
      ui.alert('API key saved securely in Script Properties.');
    } else {
      ui.alert('Invalid key format. Must start with "sk-".');
    }
  }
}

// Run this first to create all sheets with example data
function testSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, SIGNUPS_SHEET_NAME, getSignupsHeaders());
  getOrCreateSheet(ss, NEW_PARISHIONERS_SHEET_NAME, getNewParishionersHeaders());
  getOrCreateSheet(ss, ADMINS_SHEET_NAME, getAdminsHeaders());
  getOrCreateSheet(ss, FOLLOWUP_QUESTIONS_SHEET_NAME, getFollowupQuestionsHeaders());
  getOrCreateSheet(ss, FOLLOWUP_RESPONSES_SHEET_NAME, getFollowupResponsesHeaders());
  
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
      ['music', 'Music Ministry', 'Supports parish liturgies through choirs, cantors, and instrumentalists.', '🎵', 'Jane Smith', 'jane@parish.org', '5125551234', 'select|Voice part (if known)|Not sure,Soprano,Alto,Tenor,Bass', 'text|Do you play an instrument? Which one(s)?', '', 'liturgy'],
      ['hospitality', 'Hospitality Ministers', 'Welcomes parishioners and assists during Masses and parish events.', '🚪', 'John Doe', 'john@parish.org', '5125555678', 'checkbox|Which Mass times work for you?|Saturday 5pm,Sunday 9am,Sunday 11am', '', '', 'liturgy, socializing, lay-leadership'],
      ['youth', 'Youth Ministry', 'Faith formation and fellowship for middle and high school students.', '🌟', '', '', '', '', '', '', 'service, socializing, lay-leadership'],
      ['svdp', 'St. Vincent de Paul Society', 'Assists individuals and families in need through direct support and resources.', '💚', '', '', '', '', '', '', 'service'],
      ['bible-study', 'Bible Study', 'Offers structured Scripture study with group discussion.', '📖', '', '', '', '', '', '', 'bible-study'],
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
