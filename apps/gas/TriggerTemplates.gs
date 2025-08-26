/** Utility: returns active sheet & top-left cell to place a template. */
function _tpl_anchor_(){
  const sh = SpreadsheetApp.getActiveSheet();
  const a = sh.getActiveRange() || sh.getRange('A1');
  const r = a.getRow(), c = a.getColumn();
  return { sh, row: r, col: c };
}

/** Utility: create a named range safely (unique suffix if collides). */
function dsMakeNamedRange_(base, sh, row, col, numRows, numCols){
  const ss = SpreadsheetApp.getActive();
  const clean = base.replace(/[^A-Za-z0-9_]/g, '_');
  const existing = new Set(ss.getNamedRanges().map(n=>n.getName()));
  let name = clean, i = 1;
  while (existing.has(name)) name = `${clean}_${++i}`;
  ss.setNamedRange(name, sh.getRange(row, col, numRows, numCols));
  return name;
}

/** Attach DAWSheet tags to a range (DeveloperMetadata + Note mirror). */
function dsTagRange_(range, tagObj){
  Object.entries(tagObj).forEach(([k,v])=>{
    range.addDeveloperMetadata('ds:'+k, String(v));
  });
  const old = range.getNote() || '';
  const lines = Object.entries(tagObj).map(([k,v])=>`@ds:${k}=${v}`);
  const merged = [old.trim(), ...lines].filter(Boolean).join('\n');
  range.setNote(merged);
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

/** STEP GRID 16 template */
function tpl_insertStepGrid16(){
  const {sh,row, col} = _tpl_anchor_();
  const steps = 16;

  const labelRow = Math.max(1, row - 1);
  const header = sh.getRange(labelRow, col, 1, steps + 2); // [BYPASS][RES][1..16]
  header.clearFormat();
  dsApplyCreamTheme_(header);
  header.setFontWeight('bold');

  const bypassCell = sh.getRange(labelRow, col);
  bypassCell.setValue(false).insertCheckboxes();

  const resCell = sh.getRange(labelRow, col + 1);
  dsEnsureResolutionChip_(resCell, ['1/4','1/8','1/8T','1/16','bar','scene']);

  sh.getRange(labelRow, col + 2, 1, steps)
    .setValues([Array.from({length:steps}, (_,i)=>i+1)])
    .setHorizontalAlignment('center');

  const grid = sh.getRange(row, col + 2, 1, steps);
  grid.insertCheckboxes().setBackground('#ffffff').setHorizontalAlignment('center');

  for (let i=0;i<steps;i++){
    const cell = sh.getRange(row, col + 2 + i);
    const thick = (i % 4) === 0;
    cell.setBorder(true,true,true,true,false,false,'#e3dccb',
      thick ? SpreadsheetApp.BorderStyle.SOLID_THICK : SpreadsheetApp.BorderStyle.SOLID);
  }

  const vel = sh.getRange(row + 1, col + 2, 1, steps);
  vel.setNumberFormat('0').setValues([Array.from({length:steps}, _=>100)]);
  const rules = sh.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpoint('#f7f3e9').setGradientMaxpoint('#2a74ff')
    .setRanges([vel]).build());
  sh.setConditionalFormatRules(rules);

  const gridName = dsMakeNamedRange_('DS_STEP_16', sh, row, col + 2, 1, steps);
  const velName  = dsMakeNamedRange_('DS_STEP_16_VEL', sh, row + 1, col + 2, 1, steps);

  dsTagRange_(grid, {
    role: 'gate',
    channel: '10',
    baseNote: '36',
    resolution: String(resCell.getValue() || '1/16'),
    velocityLane: velName,
    stepCount: String(steps)
  });

  SpreadsheetApp.getUi().alert(
    `Inserted Step Grid 16 at ${sh.getName()}:${grid.getA1Notation()}\nNamed ranges: ${gridName}, ${velName}`
  );
}
