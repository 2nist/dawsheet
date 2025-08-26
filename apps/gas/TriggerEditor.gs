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
  const commandTypes = (typeof COMMANDS_SCHEMA === 'object' && COMMANDS_SCHEMA.properties && COMMANDS_SCHEMA.properties.type && COMMANDS_SCHEMA.properties.type.enum) ? COMMANDS_SCHEMA.properties.type.enum : ['NOTE.PLAY','CC.SET'];
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
  if (typeof getAjvInstance === 'function') getAjvInstance(); // ensure AJV loaded when available
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
  if (typeof validateData === 'function' && typeof COMMANDS_SCHEMA === 'object') {
    const { isValid, errors } = validateData(COMMANDS_SCHEMA, env);
    return { valid: isValid, errors, envelope: env };
  }
  return { valid: true, errors: [], envelope: env };
}

/** Helper */
function safeJson_(s){ try{ return JSON.parse(String(s||'').trim()||'null') }catch(_){ return null } }
