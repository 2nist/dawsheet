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
    // Remember which cell we highlighted so the clear trigger can find it.
    try {
      PropertiesService.getDocumentProperties().setProperty('LAST_HIGHLIGHT', `${e.range.getSheet().getName()}!${e.range.getA1Notation()}`);
    } catch (err) {
      Logger.log('Failed to save LAST_HIGHLIGHT: ' + err);
    }
    // Schedule the color to be cleared
    // Use a time-based trigger to avoid issues with onEdit restrictions.
    try {
      const trig = ScriptApp.newTrigger('clearCellColor')
        .timeBased()
        .after(2000)
        .create();
      // remember the trigger id so we can remove it later and avoid accumulation
      PropertiesService.getDocumentProperties().setProperty('LAST_CLEAR_TRIGGER', trig.getUniqueId());
    } catch (err) {
      Logger.log('Failed to create clearCellColor trigger: ' + err);
    }
  }
}

/**
 * A triggerable function to clear cell background color.
 * This is a workaround for not being able to sleep in onEdit.
 */
function clearCellColor(e) {
    // Clear the last-highlighted cell recorded in Document Properties.
    try {
      const props = PropertiesService.getDocumentProperties();
      const loc = props.getProperty('LAST_HIGHLIGHT');
      if (!loc) return;
      // format: sheetName!A1
      const parts = loc.split('!');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(parts[0]);
      if (sheet) {
        sheet.getRange(parts[1]).setBackground(null);
      }
        props.deleteProperty('LAST_HIGHLIGHT');
        // Remove the time-based trigger we created for clearing the color, if present.
        const trigId = props.getProperty('LAST_CLEAR_TRIGGER');
        if (trigId) {
          try {
            const triggers = ScriptApp.getProjectTriggers();
            for (let i = 0; i < triggers.length; i++) {
              try {
                if (triggers[i].getUniqueId && triggers[i].getUniqueId() === trigId) {
                  ScriptApp.deleteTrigger(triggers[i]);
                  break;
                }
              } catch (innerErr) {
                // ignore errors checking triggers
              }
            }
          } catch (tErr) {
            Logger.log('Failed to remove clear trigger: ' + tErr);
          }
          props.deleteProperty('LAST_CLEAR_TRIGGER');
        }
    } catch (err) {
      Logger.log('clearCellColor error: ' + err);
    }
}

/**
 * Send a CHORD command using the current selection. Placeholder implementation.
 */
function sendChordFromSelection() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  const value = String(range.getValue()).trim();
  if (!value) {
    SpreadsheetApp.getUi().alert('The selected cell is empty.');
    return;
  }
  // Very small heuristic: expect something like "Cmaj7" or "Am"
  if (!/^[A-G][#b]?(m|maj|min|dim|aug|7|maj7|m7)?/i.test(value)) {
    SpreadsheetApp.getUi().alert('Invalid chord format in cell. Expected e.g. "Cmaj7" or "Am"');
    return;
  }

  const payload = {
    type: 'CHORD',
    songId: range.getSheet().getParent().getId(),
    chord: value,
    origin: `sheets://${range.getSheet().getName()}/${range.getA1Notation()}`
  };
  publish(PropertiesService.getScriptProperties().getProperty('COMMANDS_TOPIC'), payload);
  range.setBackground('#d9ead3');
  PropertiesService.getDocumentProperties().setProperty('LAST_HIGHLIGHT', `${range.getSheet().getName()}!${range.getA1Notation()}`);
  ScriptApp.newTrigger('clearCellColor')
    .timeBased()
    .after(2000)
    .create();
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
