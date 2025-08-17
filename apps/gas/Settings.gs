/**
 * Settings and help UI for DAWSheet Apps Script.
 */

function openConfigDialog() {
  const html = HtmlService.createHtmlOutputFromFile('SettingsDialog')
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'DAWSheet Configuration');
}

function getConfig() {
  const sp = PropertiesService.getScriptProperties();
  return {
    GCP_PROJECT_ID: sp.getProperty('GCP_PROJECT_ID') || '',
    COMMANDS_TOPIC: sp.getProperty('COMMANDS_TOPIC') || ''
  };
}

function saveConfig(obj) {
  const sp = PropertiesService.getScriptProperties();
  if (obj.GCP_PROJECT_ID) sp.setProperty('GCP_PROJECT_ID', obj.GCP_PROJECT_ID);
  if (obj.COMMANDS_TOPIC) sp.setProperty('COMMANDS_TOPIC', obj.COMMANDS_TOPIC);
  return { ok: true };
}

function showHelp() {
  const html = HtmlService.createHtmlOutput('<h3>DAWSheet Help</h3><p>Use this menu to send notes and chords to your DAW via Pub/Sub. Configure the GCP project and topic under Configure DAWSheet.</p>')
    .setWidth(400)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'DAWSheet Help');
}

function showRecentLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Logs') || ss.insertSheet('Logs');
  const lastRows = sheet.getLastRow();
  const start = Math.max(1, lastRows - 20 + 1);
  const values = sheet.getRange(start, 1, Math.max(1, lastRows - start + 1), Math.max(1, sheet.getLastColumn())).getValues();
  const html = HtmlService.createHtmlOutput('<pre>' + JSON.stringify(values.slice(-20).reverse(), null, 2) + '</pre>').setWidth(600).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Recent Logs');
}
