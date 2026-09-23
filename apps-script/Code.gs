/**
 * RSVP collector for the wedding site.
 *
 * Deploy: Extensions > Apps Script from the target sheet (or a standalone
 * project), paste this file, then Deploy > New deployment > Web app,
 * "Execute as: Me", "Who has access: Anyone". Copy the resulting /exec URL
 * into FORM_ENDPOINT in app.js.
 *
 * The site posts JSON as text/plain on purpose: Apps Script web apps do not
 * answer CORS preflight requests, and text/plain avoids triggering one.
 */

// The spreadsheet that receives the entries. Blank falls back to the sheet this
// script is bound to.
var SPREADSHEET_ID = '1fSzin9gj-FCEcv6DBtl_j6Zvw4K3GtfLPSBDKFAJMWk';

var SHEET_NAME = 'RSVPs';

var COLUMNS = [
  'submittedAt',
  'name',
  'email',
  'phone',
  'attending',
  'guests',
  'meal',
  'diet',
  'shuttle',
  'message'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // A request that arrives without a usable body (a dropped redirect, a probe)
    // must not leave a blank row behind.
    if (!data.name && !data.email) {
      return json({ ok: false, error: 'Empty submission' });
    }

    var sheet = getSheet();

    var row = COLUMNS.map(function (key) {
      return data[key] == null ? '' : String(data[key]);
    });
    row.push(new Date());
    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Lets you confirm the deployment is live by opening the /exec URL. */
function doGet() {
  return json({ ok: true, rows: Math.max(getSheet().getLastRow() - 1, 0) });
}

function getSheet() {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    var header = COLUMNS.concat(['receivedAt']);
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
