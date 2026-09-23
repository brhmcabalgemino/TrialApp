/**
 * RSVP collector for the wedding site.
 *
 * Deploy this from the Google Sheet that should receive the entries:
 *   Extensions > Apps Script, paste this file, then Deploy > New deployment >
 *   Web app, "Execute as: Me", "Who has access: Anyone".
 * Copy the resulting /exec URL into FORM_ENDPOINT in app.js.
 *
 * The site posts JSON as text/plain on purpose: Apps Script web apps do not
 * answer CORS preflight requests, and text/plain avoids triggering one.
 */

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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
