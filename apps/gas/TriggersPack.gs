/*************************************************
 * DAWSheet — Trigger Palette (arrangement‑first)
 * - Triggers sheet with presets & validation
 * - Compiles to envelopes with absolute timestamps
 * - Sends to Bridge (via sidebar WS) using getTriggersJSON()
 *************************************************/

var SH_TRG = (typeof SH_TRG !== 'undefined') ? SH_TRG : 'Triggers';
var SH_MAP = (typeof SH_MAP !== 'undefined') ? SH_MAP : 'TrackMap';      // from Arrange Pack
var SH_TEMPO = (typeof SH_TEMPO !== 'undefined') ? SH_TEMPO : 'Tempo';   // from Arrange Pack

function registerTriggersMenu_(){
  SpreadsheetApp.getUi().createMenu('DAWSheet — Triggers')
    .addItem('Insert Triggers Template', 'trgInsertTemplate')
    .addItem('Load Starter Presets (Logic Intro)', 'trgLoadPresetsLogicIntro')
    .addSeparator()
    .addItem('Preview Triggers JSON', 'trgPreview')
    .addItem('Send Triggers → Bridge', 'trgSendToBridge')
    .addToUi();
}

function trgInsertTemplate(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SH_TRG) || ss.insertSheet(SH_TRG);
  sh.clear();
  sh.getRange(1,1,1,12).setValues([[
    'Enabled','When','Trigger','Track/Target','Note/CC/Addr','Value/Args','Duration','Extra','Section','ID','Meta','Notes'
  ]]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, 12, 120);

  // Data validation for Trigger type
  const types = ['TRANSPORT.START','TRANSPORT.STOP','PROGRAM.CHANGE','CC.SET','CC.RAMP','MACRO.TRIGGER','DAW.SCENE.LAUNCH','CUE.GOTO','OSC.SEND','CHORD.PLAY','NOTE.PLAY'];
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(types, true).build();
  sh.getRange(2,3,100,1).setDataValidation(rule);

  // Helpful placeholders
  sh.getRange(2,1,8,12).setValues([
    [true,'1:1','TRANSPORT.START','','','','','','Intro','','','Start at bar 1'],
    [true,'1:1','PROGRAM.CHANGE','Drums','(program:9)','', '', '', 'Intro','','','Set Drum Kit 9'],
    [true,'1:1','PROGRAM.CHANGE','Bass','(program:34)','', '', '', 'Intro','','','Set Bass 34'],
    [true,'1:1','MACRO.TRIGGER','','scene:intro','','','','Intro','','owner=sheet','Scene macro'],
    [true,'5:1','DAW.SCENE.LAUNCH','','scene:Verse','','','','Verse','','','Launch Verse scene'],
    [true,'5:1','CC.RAMP','Bass','cc:74','0→100','8b','curve:linear','Verse','','','Cutoff ramp 8 bars'],
    [true,'13:1','CUE.GOTO','','bar:13','','','','Break','','','Jump to Break'],
    [true,'17:1','TRANSPORT.STOP','','','','','','Outro','','','Stop at end']
  ]);

  // Tiny legend in notes
  sh.getRange('A12').setValue('Legend: When=bar:beat | Track=Track name from TrackMap or explicit node (mac:logic) | Note/CC/Addr accepts shorthand like cc:74, program:34, chord:Cmin7 | Value can be 0..127, "0→100" for ramps, or JSON args for OSC').setFontStyle('italic');
}

function trgLoadPresetsLogicIntro(){
  const sh = SpreadsheetApp.getActive().getSheetByName(SH_TRG) || trgInsertTemplate();
  // Already seeded in template — you can extend here with more rows as needed.
  SpreadsheetApp.getUi().alert('Loaded starter presets for Logic intro. Edit in place.');
}

function trgPreview(){
  const json = getTriggersJSON();
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput('<pre style="white-space:pre-wrap;font:12px ui-monospace">'+json.replace(/</g,'&lt;')+'</pre>').setWidth(800).setHeight(560),
    'Compiled Triggers (scheduled)'
  );
}

function trgSendToBridge(){
  // Returns JSON; the sidebar JS should send it over WS
  return getTriggersJSON();
}

function getTriggersJSON(){
  const ss = SpreadsheetApp.getActive();
  const trg = ss.getSheetByName(SH_TRG); if (!trg) throw new Error('Missing Triggers sheet');
  const map = indexTracks_();
  const ignore = rolesGetIgnoreRanges_ ? rolesGetIgnoreRanges_() : [];

  const last = trg.getLastRow();
  const rows = last>1 ? trg.getRange(2,1,last-1,12).getValues() : [];
  const envs = [];
  const t0 = Date.now() + 300; // small lookahead

  rows.forEach((r,i)=>{
    const rowIdx = 2+i;
    if (typeof isIgnoredRow_ === 'function' && isIgnoredRow_(trg, rowIdx, ignore)) return;

    const [enabled, when, type, trackOrTarget, key, val, dur, extra, section, id, meta] = r;

    if (enabled === false) return;
    if (typeof isBypassKey_ === 'function' && isBypassKey_(key)) return;

    const atIso = whenToIso_(String(when||''), t0);

    const target = resolveTarget_(map, String(trackOrTarget||''));

  switch (String(type||'').toUpperCase()){
      case 'TRANSPORT.START':
      case 'TRANSPORT.STOP':
        envs.push(mkEnv_(type, target, {}, atIso, id, section, meta));
        break;
      case 'PROGRAM.CHANGE': {
        const pg = pickNumFrom_(key, 'program', '');
        const ch = pickNumFrom_(extra, 'channel', map.ch || 1);
        let payload = { program: (pg===''?undefined:pg), channel: ch };
        const ap = applyDefaultsFromCatalog_ ? applyDefaultsFromCatalog_('PROGRAM.CHANGE', payload) : {payload, errors: []};
        if (ap.errors && ap.errors.length) { break; }
        envs.push(mkEnv_('PROGRAM.CHANGE', target, ap.payload, atIso, id, section, meta));
        break; }
      case 'CC.SET': {
        const cc = pickNumFrom_(key, 'cc', '');
        const value = (val===''?undefined:Number(val));
        const ch = pickNumFrom_(extra, 'channel', map.ch || 1);
        let payload = { cc:(cc===''?undefined:cc), value, channel: ch };
        const ap = applyDefaultsFromCatalog_ ? applyDefaultsFromCatalog_('CC.SET', payload) : {payload, errors: []};
        if (ap.errors && ap.errors.length) { break; }
        envs.push(mkEnv_('CC.SET', target, ap.payload, atIso, id, section, meta));
        break; }
      case 'CC.RAMP': {
        const cc = pickNumFrom_(key, 'cc', 1);
        const parts = String(val||'').split('→');
        const from = num_(parts[0], 0), to = num_(parts[1], 127);
        const durBeats = parseDurBeats_(String(dur||'4b')); // e.g., 8b
        const ch = pickNumFrom_(extra, 'channel', map.ch || 1);
        // Emit a start CC.SET and an end CC.SET for now (Bridge can interpolate later or we can expand here)
        envs.push(mkEnv_('CC.SET', target, { cc, value: from, channel: ch }, atIso, id, section, meta));
        envs.push(mkEnv_('CC.SET', target, { cc, value: to, channel: ch }, shiftIso_(atIso, durBeats), id, section, meta));
        break; }
      case 'MACRO.TRIGGER': {
        const macroId = String(val||key||'macro:default');
        envs.push(mkEnv_('MACRO.TRIGGER', target, { macroId }, atIso, id, section, meta));
        break; }
      case 'DAW.SCENE.LAUNCH': {
        const scene = String(val||key||'scene:A');
        envs.push(mkEnv_('DAW.SCENE.LAUNCH', target, { scene }, atIso, id, section, meta));
        break; }
      case 'CUE.GOTO': {
        const position = String(val||key||'bar:1');
        envs.push(mkEnv_('CUE.GOTO', target, { position }, atIso, id, section, meta));
        break; }
      case 'OSC.SEND': {
        const addr = String(key||'/cue');
        let args = [];
        try { args = JSON.parse(String(val||'[]')); } catch(e) {}
        envs.push(mkEnv_('OSC.SEND', target, { addr, args }, atIso, id, section, meta));
        break; }
      case 'CHORD.PLAY': {
        const chord = String(key||'');
        const chn = pickNumFrom_(extra, 'channel', undefined);
        let payload = { root: chordRoot_(chord)||undefined, quality: chordQual_(chord)||undefined, channel: chn };
        const ap = applyDefaultsFromCatalog_ ? applyDefaultsFromCatalog_('CHORD.PLAY', payload) : {payload, errors: []};
        if (ap.errors && ap.errors.length) { break; }
        envs.push(mkEnv_('CHORD.PLAY', target, ap.payload, atIso, id, section, meta));
        break; }
      case 'NOTE.PLAY': {
        const raw = String(key||'').trim();
        let note = undefined;
        if (raw) note = noteFrom_(raw);
        const velocity = (val===''?undefined:Number(val));
        const durationSec = dur ? beatsToSec_(parseDurBeats_(String(dur))) : undefined;
        const chn = pickNumFrom_(extra, 'channel', undefined);
        let payload = { note, velocity, durationSec, channel: chn };
        const ap = applyDefaultsFromCatalog_ ? applyDefaultsFromCatalog_('NOTE.PLAY', payload) : {payload, errors: []};
        if (ap.errors && ap.errors.length) { break; }
        envs.push(mkEnv_('NOTE.PLAY', target, ap.payload, atIso, id, section, meta));
        break; }
      default:
        // unknown, skip
    }
  });

  return JSON.stringify({ v:1, triggers: envs }, null, 2);
}

/******** helpers: targets, time, parsing ********/
function indexTracks_(){
  const ss = SpreadsheetApp.getActive();
  const tm = ss.getSheetByName(SH_MAP);
  const out = { byTrack:{} };
  if (!tm || tm.getLastRow()<2) return out;
  const rows = tm.getRange(2,1,tm.getLastRow()-1,6).getValues();
  rows.forEach(r=>{ const [track,node,port,ch] = r; if (track) out.byTrack[String(track)] = { node:String(node||'default'), port, ch:Number(ch||1) }; });
  return out;
}

function resolveTarget_(map, trackOrTarget){
  const t = String(trackOrTarget||'').trim();
  if (!t) return 'default';
  // If looks like node: "mac:logic" or "ws://host:port" use directly
  if (t.includes(':') || t.startsWith('ws://') || t.startsWith('wss://')) return t;
  // Else try TrackMap
  return (map.byTrack[t] && map.byTrack[t].node) ? map.byTrack[t].node : 'default';
}

function whenToIso_(when, t0){
  when = when.trim();
  if (!when || when.toLowerCase()==='now') return new Date(t0).toISOString();
  if (/^\d{4}-/.test(when)) return new Date(when).toISOString(); // ISO pass‑through
  // bar:beat(.sub) → convert using Tempo map (4/4)
  const parts = when.split(':');
  const bar = Number(parts[0]||1); const beat = Number(parts[1]||1);
  const bpm = bpmAtBar_(bar);
  const secPerBeat = 60 / bpm;
  const offsetBeats = (bar-1)*4 + (beat-1);
  const ms = Math.round(offsetBeats * secPerBeat * 1000);
  return new Date(t0 + ms).toISOString();
}

function bpmAtBar_(bar){
  const ss = SpreadsheetApp.getActive(); const tp = ss.getSheetByName(SH_TEMPO);
  if (!tp || tp.getLastRow()<2) return 120;
  const rows = tp.getRange(2,1,tp.getLastRow()-1,2).getValues();
  let cur = Number(rows[0][1]||120);
  rows.forEach(r=>{ if (Number(r[0])<=bar) cur = Number(r[1]||cur); });
  return cur;
}

function shiftIso_(iso, beats){
  const base = new Date(iso).getTime();
  const bpm = 120; // approx; this is fine for relative shift on CC.RAMP placeholders
  const secPerBeat = 60 / bpm;
  return new Date(base + beats*secPerBeat*1000).toISOString();
}

function parseDurBeats_(s){
  const m = s.trim().toLowerCase();
  if (m.endsWith('b')) return Number(m.replace('b',''))||4;
  // allow 1/4, 1/8, etc.
  if (m==='1/4') return 1; if (m==='1/8') return 0.5; if (m==='1/16') return 0.25; if (m==='1/32') return 0.125;
  return 4;
}

function beatsToSec_(beats){ return beats * (60/120); }

function noteFrom_(s){
  const n = Number(s); if (!isNaN(n)) return clamp0_127_(n);
  const map = {C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  const m = s.toUpperCase().match(/^([A-G](?:#|B)?)(-?\d)$/);
  if (!m) return 60; const semi = map[m[1]]; const octave = Number(m[2]);
  return clamp0_127_(semi + (octave+1)*12);
}

function chordRoot_(s){ return s.replace(/[^A-G#b].*$/,''); }
function chordQual_(s){ return s.replace(/^[A-G#b]+/,''); }
function pickNumFrom_(txt, key, def){
  try{ const m = String(txt||'').match(new RegExp(key+':(\d+)','i')); return m? Number(m[1]): def; }catch(e){return def}
}
function num_(x, d){ const n = Number(x); return isNaN(n)? d : n; }
function clamp0_127_(x){ return Math.max(0, Math.min(127, Math.round(x))); }

function mkEnv_(type, target, payload, atIso, id, section, meta){
  const env = { v:1, type:String(type), id: String(id||('trg_'+Utilities.getUuid())), at: atIso, target: target||'default', payload: payload||{} };
  if (section) env.section = section;
  if (meta) env.meta = String(meta);
  return env;
}
