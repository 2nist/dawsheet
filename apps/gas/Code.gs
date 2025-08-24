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

/**
 * ROUTING: Create the matrix and helper sheets (Routing, RoutingOps, Ports)
 * Columns/Named Ranges:
 * - Routing: sources in col A, destinations in row 1 (B1:…)
 * - Checkbox grid B2:… named ROUTES_ON
 * - RoutingOps: CHMAP, TRANSPOSE, FILTER grids, with named ranges
 * - Ports: (NodeId, PortName, Display, Enabled) drives destinations header
 */
function insertRoutingMatrix() {
  const ss = SpreadsheetApp.getActive();
  const shR = ss.getSheetByName('Routing') || ss.insertSheet('Routing');
  const shO = ss.getSheetByName('RoutingOps') || ss.insertSheet('RoutingOps');
  const shP = ss.getSheetByName('Ports') || ss.insertSheet('Ports');

  // --- Ports schema (NodeId, PortName, Display, Enabled)
  if (shP.getLastRow() === 0) {
    shP.getRange(1,1,1,4)
      .setValues([[ 'NodeId','PortName','Display','Enabled' ]])
      .setFontWeight('bold');
    shP.getRange('D2:D').insertCheckboxes();
  }

  // --- Routing header + demo sources/dests
  shR.clear();
  shR.getRange(1,1).setValue('Sources \\ Destinations').setFontWeight('bold');
  // Demo sources (edit later)
  const demoSources = [[ 'Track:Drums' ], [ 'Track:Bass' ], [ 'Seq:Arp1' ], [ 'Macro:Transport' ]];
  shR.getRange(2,1,demoSources.length,1).setValues(demoSources).setFontWeight('bold');
  shR.setFrozenRows(1);
  shR.setFrozenColumns(1);

  // Populate destinations from Ports sheet where Enabled=TRUE (Display col C)
  populateRoutingDestinationsFromPorts_();

  // Create a checkbox matrix across current extent
  const lastRow = Math.max(20, shR.getLastRow()); // some headroom
  const lastCol = Math.max(10, shR.getLastColumn());
  const grid = shR.getRange(2,2,lastRow-1,lastCol-1);
  grid.insertCheckboxes();

  // Conditional formatting: shade active routes
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=B2=TRUE')
    .setBackground('#dcfce7') // light green
    .setRanges([grid]).build();
  shR.setConditionalFormatRules([rule]);

  // --- Ops grids (same shape) with named ranges
  shO.clear();
  shO.getRange(1,1).setValue('CHMAP').setFontWeight('bold');
  shO.getRange(1,50).setValue('TRANSPOSE').setFontWeight('bold'); // AY = col 51
  shO.getRange(1,100).setValue('FILTER').setFontWeight('bold');   // CV = col 100

  const rows = lastRow-1, cols = lastCol-1;
  const chRange = shO.getRange(2,1,rows,cols);
  const trRange = shO.getRange(2,50,rows,cols);
  const flRange = shO.getRange(2,100,rows,cols);

  // Defaults
  chRange.setValues(Array.from({length: rows}, () => Array(cols).fill('thru')));
  trRange.setValues(Array.from({length: rows}, () => Array(cols).fill(0)));
  flRange.setValues(Array.from({length: rows}, () => Array(cols).fill('none')));

  // Data validation for CHMAP + FILTER
  const chRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['thru','block','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8','ch9','ch10','ch11','ch12','ch13','ch14','ch15','ch16'], true)
    .build();
  const flRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['none','drums','keys','bass','highs'], true)
    .build();
  chRange.setDataValidation(chRule);
  flRange.setDataValidation(flRule);
  trRange.setNumberFormat('0');

  // Named ranges for easy compile
  ss.setNamedRange('ROUTES_ON', shR.getRange(2,2,rows,cols));
  ss.setNamedRange('ROUTES_SOURCES', shR.getRange(2,1,rows,1));
  ss.setNamedRange('ROUTES_DESTS', shR.getRange(1,2,1,cols));
  ss.setNamedRange('ROUTES_CHMAP', chRange);
  ss.setNamedRange('ROUTES_TRANSPOSE', trRange);
  ss.setNamedRange('ROUTES_FILTER', flRange);

  SpreadsheetApp.getUi().alert('Routing matrix created. Add sources (col A), enable destinations via the Ports sheet, then tick routes.');
}

/**
 * Helper: fill Routing row 1 from Ports where Enabled=TRUE (Display shown, note stores node/port)
 */
function populateRoutingDestinationsFromPorts_() {
  const ss = SpreadsheetApp.getActive();
  const shR = ss.getSheetByName('Routing');
  const shP = ss.getSheetByName('Ports');
  if (!shP || !shR) return;

  const data = shP.getRange(2,1,Math.max(0, shP.getLastRow()-1),4).getValues();
  const enabled = data
    .filter(r => r[3] === true)
    .map(r => ({ node: String(r[0]||'').trim(), port: String(r[1]||'').trim(), display: String(r[2]||'').trim() }))
    .filter(o => o.node && o.port);

  if (enabled.length === 0) {
    shR.getRange(1,2).setValue('No destinations enabled (see Ports sheet)');
    return;
  }

  // Place displays across row 1, starting at B1
  shR.getRange(1,2,1,enabled.length)
    .setValues([ enabled.map(o => o.display || (o.node + '|' + o.port)) ])
    .setFontWeight('bold');

  // Store machine-readable key in note
  for (let i = 0; i < enabled.length; i++) {
    const cell = shR.getRange(1, 2 + i);
    cell.setNote(JSON.stringify({ nodeId: enabled[i].node, port: enabled[i].port }));
  }
}

/**
 * Compile the matrix to JSON
 * Returns stringified JSON { v:1, routes:[ { src, dest:{nodeId,port}, chMap, transpose, filter } ] }
 */
function compileRoutingJSON() {
  const ss = SpreadsheetApp.getActive();
  const on = ss.getRangeByName('ROUTES_ON').getValues();
  const src = ss.getRangeByName('ROUTES_SOURCES').getValues().map(r => String(r[0]||'').trim());
  const dst = ss.getRangeByName('ROUTES_DESTS').getValues()[0];
  const ch = ss.getRangeByName('ROUTES_CHMAP').getValues();
  const tr = ss.getRangeByName('ROUTES_TRANSPOSE').getValues();
  const fl = ss.getRangeByName('ROUTES_FILTER').getValues();

  const shR = ss.getSheetByName('Routing');
  const routes = [];
  for (let r = 0; r < on.length; r++) {
    for (let c = 0; c < on[0].length; c++) {
      if (on[r][c] !== true) continue;
      const srcName = src[r];
      const metaNote = shR.getRange(1, 2 + c).getNote();
      let dest = null;
      try { dest = JSON.parse(metaNote || '{}'); } catch (e) {}
      if (!dest || !dest.nodeId || !dest.port) continue;

      routes.push({
        src: srcName,
        dest: dest, // {nodeId, port}
        chMap: String(ch[r][c] || 'thru'),
        transpose: Number(tr[r][c] || 0),
        filter: String(fl[r][c] || 'none')
      });
    }
  }
  return JSON.stringify({ v: 1, routes }, null, 2);
}

/**
 * Show compiled routes in a modeless dialog for copy/paste.
 */
function showCompiledRoutes() {
  const json = compileRoutingJSON();
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput(
      '<pre style="white-space:pre-wrap;font:12px ui-monospace">' + json.replace(/</g, '&lt;') + '</pre>'
    ).setWidth(640).setHeight(480),
    'Compiled Routing JSON'
  );
}
