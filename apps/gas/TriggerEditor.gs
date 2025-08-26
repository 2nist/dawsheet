/** Ensure the Triggers sheet exists with headers, now including behavior. */
function te_ensureSheet_(){
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Triggers');
  if (!sh){
    sh = ss.insertSheet('Triggers');
    sh.getRange(1,1,1,10).setValues([[
      'id','name','description','range','type','target','quantize','payload','transform','behavior'
    ]]);
    return sh;
  }
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  if (!headers.includes('behavior')){
    sh.insertColumnAfter(headers.length);
    sh.getRange(1,headers.length+1).setValue('behavior');
  }
  return sh;
}

/** List triggers + named ranges + command types for the editor bootstrap. */
function te_listEditorBootstrap(){
  const sh = te_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  const headers = vals.shift() || [];
  const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
  const triggers = vals.filter(r=> (r[idx.id]||'').toString().trim() )
    .map(r => ({
      id: r[idx.id], name: r[idx.name], description: r[idx.description],
      range: r[idx.range], type: r[idx.type], target: r[idx.target]||'default',
      quantize: r[idx.quantize]||'off',
      payload: safeJson_(r[idx.payload]||'{}'),
      transform: safeJson_(r[idx.transform]||'[]'),
      behavior: safeJson_(r[idx.behavior]||'{}')
    }));
  const namedRanges = SpreadsheetApp.getActive().getNamedRanges().map(n=>n.getName());
  const commandTypes = COMMANDS_SCHEMA.properties.type.enum; // from Schemas.gs
  return { triggers, namedRanges, commandTypes };
}

function te_getTrigger(id){
  const sh = te_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  const headers = vals.shift(); const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
  for (const r of vals){
    if (String(r[idx.id]) === String(id)){
      return {
        id: r[idx.id], name: r[idx.name], description: r[idx.description],
        range: r[idx.range], type: r[idx.type], target: r[idx.target]||'default',
        quantize: r[idx.quantize]||'off',
        payload: safeJson_(r[idx.payload]||'{}'),
        transform: safeJson_(r[idx.transform]||'[]'),
        behavior: safeJson_(r[idx.behavior]||'{}')
      };
    }
  }
  return null;
}

/** Save (upsert) a trigger row. */
function te_saveTrigger(def){
  const sh = te_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  const headers = vals.shift(); const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
  const id = def.id && String(def.id).trim() ? def.id : ('trg_' + Date.now());
  const row = [
    id,
    def.name||'',
    def.description||'',
    def.range||'',
    def.type||'NOTE.PLAY',
    def.target||'default',
    def.quantize||'off',
    JSON.stringify(def.payload||{}),
    JSON.stringify(def.transform||[]),
    JSON.stringify(def.behavior||{})
  ];
  // find existing
  let wrote = false;
  for (let r = 0; r < vals.length; r++){
    if (String(vals[r][idx.id]) === String(id)){
      sh.getRange(r+2,1,1,row.length).setValues([row]);
      wrote = true; break;
    }
  }
  if (!wrote){
    sh.appendRow(row);
  }
  return { ok: true, id };
}

/** Delete trigger by id. */
function te_deleteTrigger(id){
  const sh = te_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  const headers = vals.shift(); const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
  for (let r = 0; r < vals.length; r++){
    if (String(vals[r][idx.id]) === String(id)){
      sh.deleteRow(r+2); return { ok:true };
    }
  }
  return { ok:false, error:'Not found' };
}

/** Preview/validate: build a sample envelope from the definition. */
function te_previewEnvelope(def){
  getAjvInstance(); // ensure AJV loaded
  const payload = def.payload || {};
  const env = {
    v: 1,
    type: def.type || 'NOTE.PLAY',
    id: 'preview_' + Date.now(),
    origin: 'sheets://TriggerEditor',
    at: 'now',
    quantize: def.quantize || 'off',
    target: def.target || 'default',
    payload,
    transform: def.transform || [],
    meta: {}
  };
  const { isValid, errors } = validateData(COMMANDS_SCHEMA, env);
  return { valid: isValid, errors, envelope: env };
}

/** Helper */
function safeJson_(s){ try{ return JSON.parse(String(s||'').trim()||'null') }catch(_){ return null } }

// openEditTriggersUi is implemented in CommandCenterServer.gs

/** Inspector support: read tags + header chips for grid-steps triggers. */
function te_getStepGridInspectorData(triggerId){
  const t = te_getTrigger(triggerId);
  if (!t || !(t.behavior && t.behavior.kind === 'grid-steps')){
    throw new Error('Not a grid-steps trigger.');
  }
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  if (!range) throw new Error('Named range not found: '+t.range);

  // Tags from range
  const tags = (typeof dsReadTags_ === 'function') ? dsReadTags_(range) : {};
  // Header row: BYPASS at col-2, RES at col-1 relative to first grid cell
  const sh = range.getSheet();
  const r0 = range.getRow(), c0 = range.getColumn();
  const headerRow = Math.max(1, r0 - 1);
  const bypassCell = sh.getRange(headerRow, c0 - 2);
  const resCell    = sh.getRange(headerRow, c0 - 1);

  const bypass = (bypassCell.getValue() === true);
  const resolution = String(resCell.getValue() || tags.resolution || '1/16');

  return {
    channel: Number(tags.channel || t.behavior.channel || (t.payload && t.payload.channel) || 10),
    baseNote: String(tags.baseNote || t.behavior.baseNote || '36'),
    resolution,
    durationBeats: Number(t.behavior.durationBeats || 0.9),
    velocityDefault: Number(t.behavior.velocityDefault || 100),
    bypass
  };
}

/** Save inspector updates (writes tags + BYPASS + resolution chip + behavior defaults). */
function te_updateStepGridInspector(triggerId, body){
  const t = te_getTrigger(triggerId);
  if (!t || !(t.behavior && t.behavior.kind === 'grid-steps')){
    throw new Error('Not a grid-steps trigger.');
  }
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  if (!range) throw new Error('Named range not found: '+t.range);

  // Update tags on the GRID range (if dsTagRange_ exists)
  if (typeof dsTagRange_ === 'function'){
    dsTagRange_(range, {
      channel: String(body.channel),
      baseNote: String(body.baseNote),
      resolution: String(body.resolution)
    });
  }

  // Update header BYPASS + RES cells (if they exist)
  const sh = range.getSheet();
  const r0 = range.getRow(), c0 = range.getColumn();
  const headerRow = Math.max(1, r0 - 1);
  const bypassCell = sh.getRange(headerRow, c0 - 2);
  const resCell    = sh.getRange(headerRow, c0 - 1);
  bypassCell.setValue(!!body.bypass);
  if (typeof dsEnsureResolutionChip_ === 'function'){
    dsEnsureResolutionChip_(resCell, ['1/4','1/8','1/8T','1/16','bar','scene']);
  }
  resCell.setValue(String(body.resolution));

  // Update behavior defaults in Triggers sheet (velocityDefault, durationBeats)
  const trgSheet = te_ensureSheet_();
  const vals = trgSheet.getDataRange().getValues();
  const headers = vals.shift(); const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
  for (let r=0; r<vals.length; r++){
    if (String(vals[r][idx.id]) === String(triggerId)){
      const behavior = safeJson_(vals[r][idx.behavior]||'{}') || {};
      behavior.velocityDefault = Number(body.velocityDefault || behavior.velocityDefault || 100);
      behavior.durationBeats   = Number(body.durationBeats   || behavior.durationBeats   || 0.9);
      trgSheet.getRange(r+2, idx.behavior+1).setValue(JSON.stringify(behavior));
      break;
    }
  }

  return 'Inspector settings saved.';
}
