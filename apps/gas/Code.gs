/**
 * @OnlyCurrentDoc
 *
 * The main script file for DAWSheet integration in Google Sheets.
 */

/**
 * The onEdit trigger runs automatically when a user changes the value of any cell.
 * It checks if the edited value matches the expected note format and, if so,
 * publishes a command to the Pub/Sub topic.
 *
 * @param {object} e The event parameter for a simple onEdit trigger.
 */
function onEdit(e) {
  if (!e || !e.value) {
    return; // Ignore empty edits
  }
  const v = String(e.value || '').trim();
  // Match either simple note format (e.g., "C4") or full format (e.g., "C4, vel=100, dur=0.5")
  if (!/^[A-G][#b]?\d/i.test(v)) {
    if (v.length > 0) {
      SpreadsheetApp.getUi().alert('Invalid note format in cell. Expected format: "C4" or "C4, vel=100, dur=0.5"');
    }
    return;
  }
  const payload = parseCellToNotePayload(v, e.range);
  if (payload) {
    publish(PropertiesService.getScriptProperties().getProperty('COMMANDS_TOPIC'), payload);
    e.range.setBackground('#fff2cc'); // Give user feedback
    // Schedule the color to be cleared
    ScriptApp.newTrigger('clearCellColor')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .at(new Date(new Date().getTime() + 2000))
      .create();
  }
}

/**
 * A triggerable function to clear cell background color.
 * This is a workaround for not being able to sleep in onEdit.
 */
function clearCellColor(e) {
    // This is a placeholder. A real implementation would need to know which cell to clear.
    // For the MVP, the temporary highlight in onEdit is sufficient.
}


/**
 * Parses a cell's string value into a structured NOTE command payload.
 *
 * @param {string} value The cell content, e.g., "C4, vel=100, dur=0.5".
 * @param {GoogleAppsScript.Spreadsheet.Range} range The cell range that was edited.
 * @returns {object|null} The JSON payload for the command, or null if parsing fails.
 */
function parseCellToNotePayload(value, range) {
  try {
    const noteMatch = value.match(/^([A-G][#b]?\d)/i);
    const velMatch = value.match(/vel=(\d+)/i);
    const durMatch = value.match(/dur=(\d+(\.\d+)?)/i);

    return {
      type: "NOTE",
      songId: range.getSheet().getParent().getId(), // Use spreadsheet ID as songId
      channel: 1,
      note: noteMatch ? noteMatch[1].toUpperCase() : "C4",
      velocity: velMatch ? parseInt(velMatch[1], 10) : 100,
      durationSec: durMatch ? parseFloat(durMatch[1]) : 0.5,
      origin: `sheets://${range.getSheet().getName()}/${range.getA1Notation()}`
    };
  } catch (err) {
    Logger.log(`Failed to parse cell value: "${value}". Error: ${err}`);
    return null;
  }
}
