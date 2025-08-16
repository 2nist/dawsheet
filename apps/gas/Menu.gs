/**
 * @OnlyCurrentDoc
 *
 * This script handles the creation of custom menus in the Google Sheet UI.
 */

/**
 * The onOpen trigger runs automatically when the spreadsheet is opened.
 * It creates a custom menu named "DAWSheet".
 *
 * @param {object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi().createMenu('DAWSheet')
    .addItem('Send Note from Selection', 'sendNoteFromSelection')
    .addSeparator()
    .addItem('Poll Status Logs', 'pollStatus')
    .addToUi();
}

/**
 * A function that is called when the "Send Note from Selection" menu item is clicked.
 * It gets the currently selected cell, parses it, and publishes a NOTE command.
 */
function sendNoteFromSelection() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  const value = String(range.getValue()).trim();

  if (!value) {
    SpreadsheetApp.getUi().alert('The selected cell is empty.');
    return;
  }

  // Use the same validation regex as the onEdit trigger
  if (!/^([A-G][#b]?\d).*(vel=\d+).*(dur=\d+(\.\d+)?)$/i.test(value)) {
    SpreadsheetApp.getUi().alert('Invalid note format in cell. Expected format: "C4, vel=100, dur=0.5"');
    return;
  }

  const payload = parseCellToNotePayload(value, range);
  if (payload) {
    publish(PropertiesService.getScriptProperties().getProperty('COMMANDS_TOPIC'), payload);
    range.setBackground('#d9ead3'); // Green for success
    // A simple sleep is not ideal in GAS, but for a quick UI feedback it's ok.
    Utilities.sleep(2000);
    range.setBackground(null);
  } else {
    SpreadsheetApp.getUi().alert('Could not parse the note from the selected cell.');
  }
}
