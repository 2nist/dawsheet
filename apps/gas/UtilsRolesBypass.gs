/** Roles & bypass helpers (shared) **/
const SH_ROLES = 'Roles';

function rolesGetIgnoreRanges_(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SH_ROLES);
  const out = [];
  if (!sh || sh.getLastRow()<2) return out;
  const rows = sh.getRange(2,1,sh.getLastRow()-1,3).getValues(); // Name,Role,A1Range
  rows.forEach(r=>{
    const role = String(r[1]||'').toUpperCase();
    const a1 = String(r[2]||'').trim();
    if (role!=='IGNORE' || !a1) return;
    const parts = a1.split('!');
    if (parts.length!==2) return;
    const sheetName = parts[0].replace(/'/g,'');
    const rangeA1 = parts[1];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    try {
      const rng = sheet.getRange(rangeA1);
      out.push({sheet: sheet.getName(), r1:rng.getRow(), c1:rng.getColumn(), rn:rng.getNumRows(), cn:rng.getNumColumns()});
    } catch(_) {}
  });
  return out;
}

function isIgnoredRow_(sheet, rowIdx, list){
  const name = sheet.getName();
  for (const r of list){
    if (r.sheet!==name) continue;
    if (rowIdx >= r.r1 && rowIdx < r.r1 + r.rn) return true;
  }
  return false;
}

// “Comment” bypass: key starts with # or ~
function isBypassKey_(v){ return typeof v === 'string' && /^[#~]/.test(v.trim()); }
