/** Tag helpers and range utilities for DAWSheet */

/** Read tags as key/value from a named range or range note in the form key:value pairs */
function dsReadTags_(range) {
  const note = String(range.getNote() || '').trim();
  const lines = note.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const map = {};
  lines.forEach(l => {
    const m = l.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) map[m[1]] = m[2];
  });
  return map;
}

/** Merge and write tags back into the range note */
function dsTagRange_(range, tags) {
  const cur = dsReadTags_(range);
  const merged = Object.assign({}, cur, tags || {});
  const body = Object.keys(merged)
    .sort()
    .map(k => `${k}: ${merged[k]}`)
    .join("\n");
  range.setNote(body);
  return merged;
}

/** Ensure a named range exists for a range; returns the name. */
function dsEnsureNamedRange_(range, baseName) {
  const ss = range.getSheet().getParent();
  const name = baseName || `${range.getSheet().getName()}_${range.getA1Notation()}`.replace(/[^A-Za-z0-9_]/g, '_');
  const exists = ss.getNamedRanges().some(nr => nr.getName() === name);
  if (!exists) ss.setNamedRange(name, range);
  return name;
}

/** Convert a musical resolution token to steps per quarter (spq). */
function dsResolutionToSpq_(res) {
  const table = { '1': 4, '1/2': 2, '1/4': 1, '1/8': 0.5, '1/16': 0.25, '1/32': 0.125 };
  if (typeof res === 'number') return res;
  return table[String(res).trim()] || 0.25; // default 1/16
}

/** Tiny color helpers for a subtle cream theme in inspector cells */
var DS_COLORS = {
  cream: '#fff8e1',
  creamDark: '#ffecb3',
  chip: '#ffcc80',
  ok: '#d9ead3',
  warn: '#fff2cc'
};

/** Apply a subtle cream theme to a range (header helpers) */
function dsApplyCreamTheme_(range){
  try {
    range.setBackground(DS_COLORS.cream).setFontColor('#333');
  } catch (e) {}
}

/** Create or return a unique named range at the given coordinates. */
function dsMakeNamedRange_(prefix, sheet, row, col, numRows, numCols){
  const a1 = sheet.getRange(row, col, numRows, numCols).getA1Notation();
  const base = (prefix || 'DS').replace(/[^A-Z0-9_\-]/ig,'_');
  const name = `${base}_${sheet.getName()}_${a1}`.replace(/[^A-Z0-9_]/ig,'_');
  const ss = sheet.getParent();
  const exists = ss.getNamedRanges().some(nr => nr.getName() === name);
  if (!exists) ss.setNamedRange(name, sheet.getRange(row, col, numRows, numCols));
  return name;
}
