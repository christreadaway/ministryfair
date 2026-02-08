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
    const ss = SpreadsheetApp.getActiveSpreadsheet();

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
      case 'getFollowupQuestions':
        return handleGetFollowupQuestions(ss, e.parameter.ministryId);
      case 'getFollowupResponses':
        return handleGetFollowupResponses(ss, e.parameter.email, e.parameter.ministryId);
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

    // Tags are in column K (index 10) - comma-separated
    const tagsData = row[10];
    if (tagsData) {
      ministry.tags = tagsData.toString().split(',').map(s => s.trim()).filter(s => s);
    }

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
