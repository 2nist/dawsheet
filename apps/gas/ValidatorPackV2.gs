/******** DAWSheet Validator & Catalog Pack (v2) ********/

var SH_CC        = (typeof SH_CC !== 'undefined') ? SH_CC : 'Catalog_Commands';
var SH_CT        = (typeof SH_CT !== 'undefined') ? SH_CT : 'Catalog_Triggers';
var SH_TRG       = (typeof SH_TRG !== 'undefined') ? SH_TRG : 'Triggers';
var SH_ROLES_TAB = (typeof SH_ROLES_TAB !== 'undefined') ? SH_ROLES_TAB : 'Roles';

function registerValidatorMenu_(){ try{
  SpreadsheetApp.getUi().createMenu('DAWSheet — Validate')
    .addItem('Seed Catalog Sheets', 'valSeedCatalogsV2')
    .addItem('Apply Data Validations', 'valApplyValidationsV2')
    .addItem('Validate Triggers Now', 'valLintTriggersV2')
  .addItem('Open Lint Sidebar', 'valOpenLintSidebar')
    .addItem('Seed Roles (Ignore Ranges)', 'rolesSeed')
    .addToUi();
} catch(_){} }

/*** 1) Seed catalogs ***/
function valSeedCatalogsV2(){
  const ss = SpreadsheetApp.getActive();

  const cc = ss.getSheetByName(SH_CC) || ss.insertSheet(SH_CC);
  cc.clear();
  cc.getRange(1,1,1,9).setValues([[
    'Type','Status','Field','TypeOf','Range/Enum','Required?','Default','Modifiers','Notes'
  ]]).setFontWeight('bold');

  const rows = [
    ['NOTE.PLAY','✅','note','note|int','0..127|C-1..G9',true,'60','+n, oct(n), vel(n), dur(sec), ch(n)',''],
    ['NOTE.PLAY','✅','velocity','int','0..127',true,'100','',''],
    ['NOTE.PLAY','✅','durationSec','number','>=0',true,'0.25','',''],
    ['NOTE.PLAY','✅','channel','int','1..16',true,'1','',''],

    ['CHORD.PLAY','✅','root','enum','A..G + #/b',true,'C','',''],
  ['CHORD.PLAY','✅','quality','enum','[maj,min,dim,aug,7,m7,maj7]',true,'min','',''],
    ['CHORD.PLAY','✅','voicing','string','any',false,'','',''],

    ['CC.SET','✅','cc','int','0..127',true,'74','',''],
    ['CC.SET','✅','value','int','0..127',true,'64','',''],
    ['CC.SET','✅','channel','int','1..16',true,'1','',''],

    ['CC.RAMP','✅','cc','int','0..127',true,'74','',''],
    ['CC.RAMP','✅','from','int','0..127',true,'0','',''],
    ['CC.RAMP','✅','to','int','0..127',true,'127','',''],
    ['CC.RAMP','✅','durationBeats','number','>0',true,'8','',''],
    ['CC.RAMP','✅','channel','int','1..16',true,'1','',''],

    ['PROGRAM.CHANGE','✅','program','int','0..127',true,'0','',''],
    ['PROGRAM.CHANGE','✅','bankMsb','int','0..127',false,'','',''],
    ['PROGRAM.CHANGE','✅','bankLsb','int','0..127',false,'','',''],
    ['PROGRAM.CHANGE','✅','channel','int','1..16',true,'1','',''],

    ['TRANSPORT.START','⚠️','','','','','','',''],
    ['TRANSPORT.STOP','⚠️','','','','','','',''],

    ['MACRO.TRIGGER','✅','macroId','string','any',true,'macro:default','',''],

    ['OSC.SEND','✅','addr','string','/path',true,'/cue','',''],
    ['OSC.SEND','✅','args','json','array',false,'[]','','']
  ];
  cc.getRange(2,1,rows.length,9).setValues(rows);
  cc.setFrozenRows(1); cc.autoResizeColumns(1, 9);

  const ct = ss.getSheetByName(SH_CT) || ss.insertSheet(SH_CT);
  ct.clear();
  ct.getRange(1,1,1,8).setValues([[
    'Trigger','When syntax','Input type','Validation','Maps to','Default UX','Extras','Notes'
  ]]).setFontWeight('bold');
  const trows = [
    ['TRANSPORT.START','bar:beat|ISO','(none)','(none)','TRANSPORT.START','Section marker','(none)',''],
    ['TRANSPORT.STOP','bar:beat|ISO','(none)','(none)','TRANSPORT.STOP','Section marker','(none)',''],
    ['PROGRAM.CHANGE','bar:beat|ISO','number|alias','program 0..127 or alias','PROGRAM.CHANGE','TrackMap per-section','channel',''],
    ['CC.SET','bar:beat|ISO','number','0..127','CC.SET','Keyframe','cc,channel',''],
    ['CC.RAMP','bar:beat|ISO','range text','0→100 + dur 8b','CC.RAMP','Keyframe pair','cc,channel',''],
    ['MACRO.TRIGGER','bar:beat|ISO','text','macro:*','MACRO.TRIGGER','Macro pad','(none)',''],
    ['OSC.SEND','bar:beat|ISO','addr+JSON','/path + [args]','OSC.SEND','Cue table','(none)',''],
    ['CHORD.PLAY','bar:beat|ISO','enum','root+quality','CHORD.PLAY','Chord row','channel',''],
    ['NOTE.PLAY','bar:beat|ISO','note|alias','C4|60|alias','NOTE.PLAY','One-shot row','velocity,channel','']
  ];
  ct.getRange(2,1,trows.length,8).setValues(trows);
  ct.setFrozenRows(1); ct.autoResizeColumns(1, 8);
}

/*** 2) Roles (IGNORE ranges) ***/
function rolesSeed(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SH_ROLES_TAB) || ss.insertSheet(SH_ROLES_TAB);
  sh.clear();
  sh.getRange(1,1,1,3).setValues([['Name','Role','A1Range']]).setFontWeight('bold');
  sh.getRange(2,1,3,3).setValues([
    ['UI labels','IGNORE','UI!A1:B10'],
    ['Branding block','IGNORE','UI!A12:D20'],
    ['Notes area','IGNORE','Arrangement!I1:L30']
  ]);
  sh.setFrozenRows(1);
}

/*** 3) Apply validations to Triggers ***/
function valApplyValidationsV2(){ return valApplyValidationsV3(); }

/*** 4) Lint Triggers (honors IGNORE + bypass) ***/
function valLintTriggersV2(){
  const ss = SpreadsheetApp.getActive();
  const trg = ss.getSheetByName(SH_TRG); if (!trg) throw new Error('Missing Triggers sheet');
  const last = trg.getLastRow(); if (last < 2) return;

  trg.getRange(2,2,last-1,6).setNote('');

  const ignore = rolesGetIgnoreRanges_();
  const rows = trg.getRange(2,1,last-1,12).getValues();
  const errs = [];

  const cat = catIndexCommands_();
  rows.forEach((r, i) => {
    const rowIdx = 2 + i;
    if (isIgnoredRow_(trg, rowIdx, ignore)) return;

    const [enabled, when, type, track, key, val, dur] = r;
    if (enabled === false) return;
    if (isBypassKey_(key)) return;

    const w = String(when||'').trim();
    const T = String(type||'').toUpperCase();

    if (!w) { _valNote(trg, rowIdx, 2, 'When is required'); errs.push(['Triggers',rowIdx,'When missing']); }
    if (!T){ _valNote(trg,rowIdx,3,'Trigger type required'); errs.push(['Triggers',rowIdx,'Trigger missing']); return; }

    if (T==='NOTE.PLAY'){
      if (!key || String(key).trim()===''){ _valNote(trg,rowIdx,5,'Note required (C4, 60, or alias)'); errs.push(['Triggers',rowIdx,'Note missing']); }
      if (val!=='' && (isNaN(Number(val)) || Number(val)<0 || Number(val)>127)){
        _valNote(trg,rowIdx,6,'Velocity must be 0..127'); errs.push(['Triggers',rowIdx,'Bad velocity']);
      }
    }
    if (T==='CC.SET'){
      const cc = _valPickNumFrom(key,'cc',NaN);
      if (isNaN(cc) || cc<0 || cc>127){ _valNote(trg,rowIdx,5,'Use cc:N (0..127)'); errs.push(['Triggers',rowIdx,'Bad CC number']); }
      if (isNaN(Number(val)) || Number(val)<0 || Number(val)>127){
        _valNote(trg,rowIdx,6,'Value must be 0..127'); errs.push(['Triggers',rowIdx,'Bad CC value']);
      }
    }
    if (T==='CC.RAMP'){
      const parts = String(val||'').split('→');
      if (parts.length!==2 || parts.some(p=>isNaN(Number(p)))){
        _valNote(trg,rowIdx,6,'Use from→to, e.g., 0→100'); errs.push(['Triggers',rowIdx,'Bad ramp values']);
      }
      if (!String(dur||'').match(/^\d+b$|^1\/(4|8|16|32)$/)){
        _valNote(trg,rowIdx,7,'Use duration like 8b or 1/8'); errs.push(['Triggers',rowIdx,'Bad duration']);
      }
    }

    // Catalog-based checks (soft)
    const spec = cat[String(T)];
    if (spec){
      let payload = {};
      if (T==='NOTE.PLAY'){
        payload.note = String(key||'');
        payload.velocity = (val===''?undefined:Number(val));
      }
      if (T==='CC.SET'){
        payload.cc = _valPickNumFrom(key,'cc','');
        payload.value = (val===''?undefined:Number(val));
      }
      if (T==='PROGRAM.CHANGE'){
        payload.program = _valPickNumFrom(key,'program','');
      }
      const ap = applyDefaultsFromCatalog_(T, payload);
      if (ap.errors && ap.errors.length){
        _valNote(trg, rowIdx, 5, ap.errors.join('; '));
        errs.push(['Triggers', rowIdx, ap.errors[0]]);
      }
    }
  });

  const lint = ss.getSheetByName('Lint') || ss.insertSheet('Lint');
  lint.clear();
  lint.getRange(1,1,1,3).setValues([['Sheet','Row','Issue']]).setFontWeight('bold');
  if (errs.length) lint.getRange(2,1,errs.length,3).setValues(errs);
}

// Lint Sidebar: shows issues and lets user jump to row
function valOpenLintSidebar(){
  const html = HtmlService.createHtmlOutputFromFile('validator_lint_sidebar')
    .setTitle('DAWSheet — Lint Results')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

function valGetLintResults_(){
  const ss = SpreadsheetApp.getActive();
  const lint = ss.getSheetByName('Lint');
  if (!lint || lint.getLastRow()<2) return [];
  const rows = lint.getRange(2,1,lint.getLastRow()-1,3).getValues();
  return rows.map(r=>({ sheet:String(r[0]), row:Number(r[1]), issue:String(r[2]) }));
}

function valGoto_(sheetName, row){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(String(sheetName));
  if (!sh) return false;
  ss.setActiveSheet(sh);
  const r = Math.max(1, Number(row)||1);
  const rng = sh.getRange(r,1,1,sh.getMaxColumns());
  sh.setActiveSelection(rng);
  ss.toast(`Jumped to ${sheetName}!R${r}`);
  return true;
}

// ===== Dynamic catalog helpers and validations (V3) =====
function catIndexCommands_(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('Catalog_Commands'); if(!sh || sh.getLastRow()<2) return {};
  const rows = sh.getRange(2,1,sh.getLastRow()-1,9).getValues();
  const idx = {};
  rows.forEach(r=>{
    const [type,status,field,typeOf,rangeEnum,required,def,mods] = r;
    const T = String(type||'').toUpperCase().trim(); if(!T) return;
    if (!idx[T]) idx[T] = { fields:{} };
    const f = String(field||'').trim();
    if (!f) return;
    const rec = { typeOf:String(typeOf||''), required: Boolean(required===true || String(required).toLowerCase()==='true'), def:def };
    let enumVals = [];
    let range = null;
    const s = String(rangeEnum||'').trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      enumVals = s.slice(1,-1).split(',').map(x=>x.trim()).filter(Boolean);
    } else if (/^-?\d+\.\.-?\d+$/.test(s)) {
      const [a,b] = s.split('..').map(Number);
      range = {min:a,max:b};
    } else if (/^(>=|>|<=|<)\s*-?\d+(\.?\d+)?$/.test(s)) {
      const m = s.match(/^(>=|>|<=|<)\s*(-?\d+(?:\.?\d+)?)/);
      range = {op:m[1], bound:Number(m[2])};
    } else if (s) {
      range = {hint:s};
    }
    rec.enumVals = enumVals; rec.range = range;
    idx[T].fields[f] = rec;
  });
  return idx;
}

function valApplyValidationsV3(){
  const ss = SpreadsheetApp.getActive();
  const trg = ss.getSheetByName(SH_TRG); if(!trg) throw new Error('Missing Triggers sheet');
  const last = Math.max(2, trg.getMaxRows());
  trg.getRange(2,1,Math.max(1,trg.getMaxRows()-1),1).insertCheckboxes();
  const types = ['TRANSPORT.START','TRANSPORT.STOP','PROGRAM.CHANGE','CC.SET','CC.RAMP','MACRO.TRIGGER','DAW.SCENE.LAUNCH','CUE.GOTO','OSC.SEND','CHORD.PLAY','NOTE.PLAY'];
  const ruleType = SpreadsheetApp.newDataValidation().requireValueInList(types, true).build();
  trg.getRange(2,3,Math.max(1,trg.getMaxRows()-1),1).setDataValidation(ruleType);
  trg.getRange(2,2,last-1,1).setNote('When = bar:beat (e.g., 5:1), NOW, or ISO 2025-08-24T12:00:00Z');
  trg.getRange(2,5,last-1,1).setNote('Note/CC/Addr: C4 | 60 | alias | cc:74 | /osc/path');
  trg.getRange(2,6,last-1,1).setNote('Value/Args: 0..127 | 0→100 | JSON [..]');

  const cat = catIndexCommands_();
  const chord = cat['CHORD.PLAY'];
  if (chord && chord.fields['quality'] && chord.fields['quality'].enumVals && chord.fields['quality'].enumVals.length){
    const list = chord.fields['quality'].enumVals;
    const helperName = '_VAL_HELPERS';
    const hlp = ss.getSheetByName(helperName) || ss.insertSheet(helperName);
    hlp.hideSheet();
    hlp.getRange(1,1,1,list.length).setValues([list]);
    ss.setNamedRange('CHORD_QUALITIES', hlp.getRange(1,1,1,list.length));
    trg.getRange(2,6,last-1,1).setNote('For CHORD.PLAY value: pick from =CHORD_QUALITIES');

    // Enforce: if Trigger type is CHORD.PLAY, then Value must be one of CHORD_QUALITIES
    const chordRule = SpreadsheetApp.newDataValidation()
      .requireFormulaSatisfied('=OR($C2<>"CHORD.PLAY", COUNTIF(CHORD_QUALITIES, $F2)=1)')
      .setAllowInvalid(false)
      .setHelpText('When Trigger=CHORD.PLAY, Value must be a chord quality from CHORD_QUALITIES')
      .build();
    trg.getRange(2,6,last-1,1).setDataValidation(chordRule);
  }

  // Build MIDI_NOTES helper list and named range (C-1..G9)
  const helperName = '_VAL_HELPERS';
  const hlp2 = ss.getSheetByName(helperName) || ss.insertSheet(helperName);
  hlp2.hideSheet();
  const pcs = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const notes = [];
  for (var n=0; n<128; n++){
    var pc = pcs[n%12]; var oct = Math.floor(n/12)-1; notes.push(pc+oct);
  }
  // Write vertically starting row 2 col 1 to avoid clobbering CHORD_QUALITIES row 1
  hlp2.getRange(2,1,notes.length,1).setValues(notes.map(x=>[x]));
  ss.setNamedRange('MIDI_NOTES', hlp2.getRange(2,1,notes.length,1));

  // Custom formula for NOTE.PLAY key column (E): allow note name in MIDI_NOTES or 0..127; allow alias by keeping invalid allowed
  const noteKeyRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR($C2<>"NOTE.PLAY", COUNTIF(MIDI_NOTES, $E2)=1, AND(ISNUMBER($E2), $E2>=0, $E2<=127))')
    .setAllowInvalid(true)
    .setHelpText('Use a note name (C4), or MIDI number (0..127). Aliases are allowed but not validated here.')
    .build();
  trg.getRange(2,5,last-1,1).setDataValidation(noteKeyRule);

  // Numeric validation for Value (F) when NOTE.PLAY or CC.SET; blank allowed for defaulting
  const val0to127 = '=OR($F2="", AND(ISNUMBER($F2), $F2>=0, $F2<=127))';
  const noteValRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied(`=OR($C2<>"NOTE.PLAY", ${val0to127})`)
    .setAllowInvalid(false)
    .setHelpText('When Trigger=NOTE.PLAY, Value must be velocity 0..127 (or blank to use default).')
    .build();
  trg.getRange(2,6,last-1,1).setDataValidation(noteValRule);

  const ccValRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied(`=OR($C2<>"CC.SET", ${val0to127})`)
    .setAllowInvalid(false)
    .setHelpText('When Trigger=CC.SET, Value must be 0..127 (or blank).')
    .build();
  trg.getRange(2,6,last-1,1).setDataValidation(ccValRule);

  // Pattern validation for CC.RAMP value like 0→100 (allow editing, linter will enforce if invalid)
  const rampRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR($C2<>"CC.RAMP", REGEXMATCH($F2, "^[0-9]+→[0-9]+$"))')
    .setAllowInvalid(true)
    .setHelpText('When Trigger=CC.RAMP, use Value like from→to (e.g., 0→100).')
    .build();
  trg.getRange(2,6,last-1,1).setDataValidation(rampRule);
}

function applyDefaultsFromCatalog_(type, payload){
  const cat = catIndexCommands_();
  const T = String(type||'').toUpperCase();
  const spec = cat[T]; if (!spec) return {payload, errors: []};
  const out = Object.assign({}, payload);
  const errors = [];
  Object.keys(spec.fields).forEach(fname=>{
    const f = spec.fields[fname];
    const val = out[fname];
    const has = val !== undefined && val !== null && String(val) !== '';
    if (!has){
      if (f.required){
        if (f.def !== '' && f.def !== null && f.def !== undefined){
          out[fname] = coerceToType_(f.def, f.typeOf);
        } else {
          errors.push(`Missing required: ${fname}`);
        }
      } else if (f.def !== '' && f.def !== null && f.def !== undefined){
        out[fname] = coerceToType_(f.def, f.typeOf);
      }
    } else {
      if (f.enumVals && f.enumVals.length){
        if (f.enumVals.indexOf(String(out[fname])) === -1){
          errors.push(`Field ${fname} not in enum: ${f.enumVals.join(', ')}`);
        }
      } else if (f.range){
        const v = Number(out[fname]);
        if (f.range.min !== undefined){
          if (!(v>=f.range.min && v<=f.range.max)) errors.push(`Field ${fname} out of range ${f.range.min}..${f.range.max}`);
        } else if (f.range.op){
          const op = f.range.op, b = f.range.bound;
          const ok = (op==='>=' ? v>=b : (op==='>' ? v>b : (op==='<=') ? v<=b : v<b));
          if (!ok) errors.push(`Field ${fname} must satisfy ${op}${b}`);
        }
      }
    }
  });
  return {payload: out, errors};
}

function coerceToType_(v, typeOf){
  const t = String(typeOf||'').toLowerCase();
  if (t.includes('int') || t==='number') return Number(v);
  if (t==='json') { try { return JSON.parse(String(v)); } catch(e){ return v; } }
  return v;
}

function _valNote(sh, r, c, msg){ sh.getRange(r,c).setNote(String(msg)); }
function _valPickNumFrom(txt, key, def){
  try{
    const m = String(txt||'').match(new RegExp(key+':(\\d+)', 'i'));
    return m ? Number(m[1]) : def;
  } catch(e) { return def; }
}
