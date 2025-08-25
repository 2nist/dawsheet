/**
 * Inserts a Timeline with bar:beat headers and a simple transport strip.
 */
function insertTimeline() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();
  const start = sh.getActiveRange() || sh.getRange(1,1);
  const row = start.getRow();
  const col = start.getColumn();
  const bars = 8; // simple default
  // Header row: Bar:Beat
  const header = [];
  for (let b = 1; b <= bars; b++) {
    for (let beat = 1; beat <= 4; beat++) header.push(`${b}:${beat}`);
  }
  sh.getRange(row, col, 1, header.length).setValues([header]);
  // Accent every 4th column via conditional formatting
  const range = sh.getRange(row, col, 1, header.length);
  const rules = sh.getConditionalFormatRules();
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=MOD(COLUMN()-${col}+1,4)=1`)
    .setBackground('#1f2937')
    .setRanges([range])
    .build();
  rules.push(rule);
  sh.setConditionalFormatRules(rules);
}

/**
 * Inserts a 16-step drum grid with checkbox/velocity/probability rows.
 */
function insertStepGrid() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();
  const start = sh.getActiveRange() || sh.getRange(1,1);
  const row = start.getRow();
  const col = start.getColumn();
  // Labels
  sh.getRange(row, col, 3, 1).setValues([["On"],["Vel"],["Prob"]]);
  // Steps 1..16
  const steps = Array.from({length:16}, (_,i)=> i+1);
  sh.getRange(row, col+1, 1, 16).setValues([steps]);
  // On: checkboxes
  const onRange = sh.getRange(row, col+1, 1, 16);
  onRange.insertCheckboxes();
  // Vel row defaults 100
  sh.getRange(row+1, col+1, 1, 16).setValues([Array(16).fill(100)]);
  // Prob row defaults 1.0
  sh.getRange(row+2, col+1, 1, 16).setValues([Array(16).fill(1.0)]);
  // Named range convention (for compiler to detect)
  ss.setNamedRange('CTRL_STEP16_BLOCK', sh.getRange(row, col, 3, 17));
}

/**
 * onEdit compiler: watches template blocks and appends envelopes to Emit!A:A
 */
function onEdit(e) {
  try {
    if (!e) return;
    const ss = SpreadsheetApp.getActive();
    const block = ss.getRangeByName('CTRL_STEP16_BLOCK');
    if (block && e.range && block.getA1Notation() && block.getSheet().getName() === e.range.getSheet().getName()) {
      const r = e.range;
      // If an On cell was toggled, emit NOTE.PLAY
      if (r.getRow() === block.getRow() && r.getColumn() > block.getColumn()) {
        const stepIdx = r.getColumn() - block.getColumn();
        const vel = block.getCell(2, stepIdx+1).getValue() || 100;
        const on = r.getValue() === true;
        if (on) {
          const env = {
            v:1, type:'NOTE.PLAY', id: `step_${Date.now()}`, origin: `sheets://${r.getSheet().getName()}!${r.getA1Notation()}`,
            at:'now', target:'default',
            payload: { note: 60, velocity: vel, durationSec: 0.25, channel: 1 }
          };
          appendEmitRow(JSON.stringify(env));
        }
      }
    }
  } catch (err) {
    // swallow
  }
}

function appendEmitRow(json) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Emit');
  if (!sh) sh = ss.insertSheet('Emit');
  sh.appendRow([json]);
}
