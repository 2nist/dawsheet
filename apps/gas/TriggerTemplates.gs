/** Utility: returns active sheet & top-left cell to place a template. */
function _tpl_anchor_(){
  const sh = SpreadsheetApp.getActiveSheet();
  const a = sh.getActiveRange() || sh.getRange('A1');
  const r = a.getRow(), c = a.getColumn();
  return { sh, row: r, col: c };
}

/** Utility: create a named range safely (unique suffix if collides). */
function _tpl_makeNamedRange_(base, sh, row, col, numRows, numCols){
  const ss = SpreadsheetApp.getActive();
  let name = base.replace(/[^A-Za-z0-9_]/g,'_');
  const existing = ss.getNamedRanges().map(n=>n.getName());
  let i = 1;
  while (existing.includes(name)) { name = base + '_' + (++i); }
  ss.setNamedRange(name, sh.getRange(row, col, numRows, numCols));
  return name;
}

/** Utility: append trigger row. */
function _tpl_appendTriggerRow_({name, rangeName, type, target='default', quantize='off', payload={}, transform=[], behavior={}}){
  const sh = te_ensureSheet_();
  const id = 'trg_' + Date.now();
  const row = [id, name, '', rangeName, type, target, quantize, JSON.stringify(payload), JSON.stringify(transform), JSON.stringify(behavior)];
  sh.appendRow(row);
  return id;
}

/** Attach DAWSheet tags to a range (DeveloperMetadata + Note mirror). */
function dsTagRange_(range, tagObj){
  // Developer metadata
  Object.entries(tagObj).forEach(([k,v])=>{
    range.addDeveloperMetadata('ds:'+k, String(v));
  });
  // Note mirror (human-friendly)
  const old = range.getNote() || '';
  const lines = Object.entries(tagObj).map(([k,v])=>`@ds:${k}=${v}`);
  const merged = [old.trim(), ...lines].filter(Boolean).join('\n');
  range.setNote(merged);
}

/** Read DAWSheet tags from a range (prefer DeveloperMetadata; fallback Note). */
function dsReadTags_(range){
  const tags = {};
  const mds = range.getDeveloperMetadata() || [];
  mds.forEach(md=>{
    const k = md.getKey(); const v = md.getValue();
    if (k && k.startsWith('ds:')) tags[k.slice(3)] = v;
  });
  if (Object.keys(tags).length === 0){
    const note = range.getNote() || '';
    note.split(/\n/).forEach(line=>{
      const m = line.match(/^@ds:([^=]+)=(.+)$/);
      if (m) tags[m[1].trim()] = m[2].trim();
    });
  }
  return tags;
}

/** Create/ensure Resolution dropdown on a 1-cell header; returns that cell. */
function dsEnsureResolutionChip_(headerCell, values){
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).build();
  headerCell.setDataValidation(rule);
  if (!headerCell.getValue()) headerCell.setValue(values[3] || '1/16');
  return headerCell;
}

/** Cream/Poppins touch for a control block. */
function dsApplyCreamTheme_(range){
  range.setBackground('#f7f3e9').setFontFamily('Poppins').setFontSize(11);
}

/** Convenience: safe named range creation (unique suffixes). */
function dsMakeNamedRange_(base, sh, row, col, numRows, numCols){
  const ss = SpreadsheetApp.getActive();
  const clean = base.replace(/[^A-Za-z0-9_]/g, '_');
  const existing = new Set(ss.getNamedRanges().map(n=>n.getName()));
  let name = clean, i = 1;
  while (existing.has(name)) name = `${clean}_${++i}`;
  ss.setNamedRange(name, sh.getRange(row, col, numRows, numCols));
  return name;
}

/** STEP GRID 16 (1 row x 16 columns of checkboxes) with tags, BYPASS, resolution, velocity lane, grouping */
function tpl_insertStepGrid16(){
  const {sh,row, col} = _tpl_anchor_();
  const steps = 16;

  // Header row (labels + controls)
  const labelRow = Math.max(1, row - 1);
  const header = sh.getRange(labelRow, col, 1, steps + 2); // [BYPASS][RES][1..16]
  header.clearFormat();
  dsApplyCreamTheme_(header);
  header.setFontWeight('bold');

  // BYPASS chip (left of RES)
  const bypassCell = sh.getRange(labelRow, col);
  bypassCell.setValue(false).insertCheckboxes();
  bypassCell.setNote('@ds:bypass=TRUE|FALSE');

  // Resolution chip (just right of BYPASS)
  const resCell = sh.getRange(labelRow, col + 1);
  dsEnsureResolutionChip_(resCell, ['1/4','1/8','1/8T','1/16','bar','scene']);
  resCell.setNote('@ds:resolution');

  // Step labels 1..16
  sh.getRange(labelRow, col + 2, 1, steps)
    .setValues([Array.from({length:steps}, (_,i)=>i+1)])
    .setHorizontalAlignment('center');

  // GRID row (checkboxes 1×16)
  const grid = sh.getRange(row, col + 2, 1, steps);
  grid.insertCheckboxes().setBackground('#ffffff').setHorizontalAlignment('center');

  // VISUAL barlines every 4
  for (let i=0;i<steps;i++){
    const cell = sh.getRange(row, col + 2 + i);
    const thick = (i % 4) === 0;
    cell.setBorder(true,true,true,true,false,false,'#e3dccb',
      thick ? SpreadsheetApp.BorderStyle.SOLID_THICK : SpreadsheetApp.BorderStyle.SOLID);
  }

  // Velocity row (optional advanced lane) directly under grid
  const vel = sh.getRange(row + 1, col + 2, 1, steps);
  vel.setNumberFormat('0').setValues([Array.from({length:steps}, _=>100)]);
  // gradient formatting
  const rules = sh.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpoint('#f7f3e9').setGradientMaxpoint('#2a74ff')
    .setRanges([vel]).build());
  sh.setConditionalFormatRules(rules);

  // Name ranges
  const gridName = dsMakeNamedRange_('DS_STEP_16', sh, row, col + 2, 1, steps);
  const velName  = dsMakeNamedRange_('DS_STEP_16_VEL', sh, row + 1, col + 2, 1, steps);

  // Tags on GRID range
  dsTagRange_(grid, {
    role: 'gate',
    channel: '10',
    baseNote: '36',         // C1 default (kick)
    resolution: String(resCell.getValue() || '1/16'),
    velocityLane: velName,
    stepCount: String(steps)
  });

  // Group and freeze (UX)
  // Group velocity row under grid so it can collapse
  sh.getRange(row, 1, 2, sh.getMaxColumns()).shiftRowGroupDepth(1);
  // Freeze header row if near top
  if (labelRow === 1) sh.setFrozenRows(1);

  // Add trigger row (behavior persisted)
  const behavior = {
    kind: 'grid-steps',
    stepCount: steps,
    timeBase: 'beats',
    startAt: '1:1',
    channel: 10,
    baseNote: 36,
    velocityLane: velName,
    velocityDefault: 100,
    durationBeats: 0.9
  };
  const payload = { note: 'C1', velocity: 100, durationSec: 0.25, channel: 10 };

  const id = _tpl_appendTriggerRow_({
    name: gridName,
    rangeName: gridName,
    type: 'NOTE.PLAY',
    payload,
    behavior
  });

  SpreadsheetApp.getUi().alert(
    `Inserted Step Grid 16 at ${sh.getName()}:${grid.getA1Notation()}\n` +
    `Trigger: ${id}\nNamed ranges: ${gridName}, ${velName}`
  );
}
