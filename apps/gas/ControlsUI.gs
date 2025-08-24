/****
 * DAWSheet Controls + Auto-UI + Compiler
 * - Commands Catalog sheet
 * - Controls → UI renderer
 * - Compiler → DAWSheet envelopes
 *
 * Works alongside your existing Code.gs + welcome.html.
 ****/

/********************
 * Config / constants
 ********************/
const SHEET_CONTROLS = 'Controls';
const SHEET_UI = 'UI';
const SHEET_COMMANDS = 'Commands';
const SHEET_EMIT = 'Emit';

// If true and Pub/Sub props are set, compiler will publish envelopes directly.
const EMIT_VIA_PUBSUB = false; // set true when cloud path is ready

// Minimal master list for the Catalog (extend as needed)
const COMMANDS_MASTER = [
  {type:'NOTE.PLAY', status:'✅', payload:'note, velocity, durationSec, channel', desc:'Play a single note'},
  {type:'CHORD.PLAY', status:'✅', payload:'root, quality, voicing?, channel', desc:'Play a chord by name'},
  {type:'CC.SET', status:'✅', payload:'cc, value, channel', desc:'Set a CC value immediately'},
  {type:'PROGRAM.CHANGE', status:'✅', payload:'program, bankMsb?, bankLsb?, channel', desc:'Program change'},
  {type:'CC.LFO', status:'✅', payload:'cc, waveform, rateHz|sync, depth, center, channel', desc:'Modulate a CC'},
  {type:'TRANSPORT.START', status:'⚠️', payload:'(none)', desc:'Start transport (MMC/MCU downstream)'},
  {type:'TRANSPORT.STOP', status:'⚠️', payload:'(none)', desc:'Stop transport'},
  {type:'OSC.SEND', status:'✅', payload:'addr, args[]', desc:'Send an OSC message'}
];

/************************
 * Menu registration
 ************************/
function registerControlsMenu_(){
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('DAWSheet — Build')
    .addItem('Insert Commands Catalog', 'insertCommandsCatalog')
    .addItem('Insert Controls Template', 'insertControlsTemplate')
    .addItem('Render UI from Controls', 'renderUIFromControls')
    .addItem('Preview Compiled Envelopes', 'previewCompiledEnvelopes')
    .addToUi();
}

/************************
 * Commands Catalog
 ************************/
function insertCommandsCatalog(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_COMMANDS) || ss.insertSheet(SHEET_COMMANDS);
  sh.clear();
  sh.getRange(1,1,1,4).setValues([[
    'Command Type','Status','Payload Fields','Description'
  ]]).setFontWeight('bold');
  const rows = COMMANDS_MASTER.map(c => [c.type, c.status, c.payload, c.desc]);
  if (rows.length) sh.getRange(2,1,rows.length,4).setValues(rows);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 4);
}

/************************
 * Controls template
 ************************/
function insertControlsTemplate(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_CONTROLS) || ss.insertSheet(SHEET_CONTROLS);
  sh.clear();
  sh.getRange(1,1,1,7).setValues([[
    'ControlID','Kind','CommandType','Target','ParamsJSON','UIAnchor','Enabled'
  ]]).setFontWeight('bold');

  const demo = [
    [
      'STEP_GRID1','STEPGRID','NOTE.PLAY','default',
      JSON.stringify({rows:2, cols:16, notes:[36,38], channel:10, velocity:100, durationSec:0.12}),
      'UI!B3', true
    ],
    [
      'LFO_CUTOFF','DROPDOWN','CC.LFO','default',
      JSON.stringify({options:['sine','tri','saw','square'], cc:74, channel:1, depth:64, rateHz:4.0, center:64}),
      'UI!B8', true
    ],
    [
      'CUT_OFF','SLIDER','CC.SET','default',
      JSON.stringify({cc:74, min:0, max:127, channel:1}),
      'UI!B10', true
    ],
    [
      'TRIGGER_MACRO1','BUTTON','MACRO.TRIGGER','default',
      JSON.stringify({macroId:'macro:sceneA', label:'Launch Scene A'}),
      'UI!B12', true
    ]
  ];
  sh.getRange(2,1,demo.length,7).setValues(demo);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 7);

  // Ensure UI sheet exists
  const ui = ss.getSheetByName(SHEET_UI) || ss.insertSheet(SHEET_UI);
  ui.clear(); ui.getRange('A1').setValue('UI surface'); ui.setFrozenRows(1);
}

/************************
 * UI renderer
 ************************/
function renderUIFromControls(){
  const ss = SpreadsheetApp.getActive();
  const shC = ss.getSheetByName(SHEET_CONTROLS); if (!shC) throw new Error('Controls sheet missing');
  const shU = ss.getSheetByName(SHEET_UI) || ss.insertSheet(SHEET_UI);

  const rows = shC.getRange(2,1,Math.max(0, shC.getLastRow()-1),7).getValues();
  rows.forEach(r => {
    const [id, kind, cmd, target, paramsStr, anchor, enabled] = r;
    if (!enabled || !id || !kind || !anchor) return;
    const p = parseJson_(paramsStr) || {};
    drawControl_(shU, String(id), String(kind).toUpperCase(), String(cmd).toUpperCase(), String(anchor), p);
  });
}

function drawControl_(shU, id, kind, cmd, anchorA1, p){
  const rng = a1_(shU, anchorA1);
  if (!rng) return;
  const label = id + ' (' + kind + ')';
  shU.getRange(rng.getRow()-1, rng.getColumn(), 1, Math.max(1, p.cols||1))
     .mergeAcross().setValue(label).setFontWeight('bold').setBackground('#eef2ff');

  if (kind === 'STEPGRID') {
    const rows = Number(p.rows||1), cols = Number(p.cols||8);
    const block = shU.getRange(rng.getRow(), rng.getColumn(), rows, cols);
    block.setBackground('#f8fafc').setBorder(true,true,true,true,true,true);
    block.insertCheckboxes();
    // Optional: style row labels
    if (Array.isArray(p.notes)) {
      for (let i=0;i<Math.min(rows,p.notes.length);i++){
        shU.getRange(rng.getRow()+i, rng.getColumn()-1).setValue(p.notes[i]).setFontStyle('italic');
      }
    }
    SpreadsheetApp.getActive().setNamedRange('CTRL_'+id, block);
  }
  else if (kind === 'DROPDOWN') {
    const cell = rng;
    const opts = Array.isArray(p.options) ? p.options : [];
    if (opts.length){
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(opts, true).build();
      cell.setDataValidation(rule).setValue(opts[0]);
    } else {
      cell.setValue('(select)');
    }
    cell.setBackground('#f3f4f6');
    SpreadsheetApp.getActive().setNamedRange('CTRL_'+id, cell);
  }
  else if (kind === 'SLIDER') {
    const cell = rng;
    const min = Number(p.min ?? 0), max = Number(p.max ?? 127);
    cell.setValue(Math.floor((min+max)/2)).setNumberFormat('0');
    // simple color scale as faux slider bar
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .setGradientMinpoint('#e5e7eb')
      .setGradientMaxpoint('#93c5fd')
      .setRanges([cell])
      .build();
    const rules = shU.getConditionalFormatRules();
    rules.push(rule); shU.setConditionalFormatRules(rules);
    SpreadsheetApp.getActive().setNamedRange('CTRL_'+id, cell);
  }
  else if (kind === 'BUTTON') {
    const cell = rng;
    cell.setValue((p && p.label) ? p.label : 'Trigger').setHorizontalAlignment('center')
        .setBackground('#111827').setFontColor('#ffffff').setFontWeight('bold');
    SpreadsheetApp.getActive().setNamedRange('CTRL_'+id, cell);
  }
}

/************************
 * Compiler → envelopes
 ************************/
function previewCompiledEnvelopes(){
  const json = getCompiledEnvelopes();
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput('<pre style="white-space:pre-wrap;font:12px ui-monospace">'+
      json.replace(/</g,'&lt;')+'</pre>').setWidth(720).setHeight(520),
    'Compiled envelopes');
}

function getCompiledEnvelopes(){
  const ss = SpreadsheetApp.getActive();
  const shC = ss.getSheetByName(SHEET_CONTROLS); if (!shC) throw new Error('Controls sheet missing');
  const shU = ss.getSheetByName(SHEET_UI) || ss.insertSheet(SHEET_UI);
  const rows = shC.getRange(2,1,Math.max(0, shC.getLastRow()-1),7).getValues();
  const envs = [];
  rows.forEach(r => {
    const [id, kind, cmd, target, paramsStr, anchor, enabled] = r;
    if (!enabled || !id || !kind || !anchor) return;
    const p = parseJson_(paramsStr) || {};
    collectFromControl_(envs, shU, String(id), String(kind).toUpperCase(), String(cmd).toUpperCase(), String(target||'default'), String(anchor), p);
  });

  const out = JSON.stringify(envs, null, 2);
  if (EMIT_VIA_PUBSUB && envs.length) try { publishEnvelopes_(envs); } catch (e) { Logger.log('Publish failed: '+e); }
  return out;
}

function collectFromControl_(out, shU, id, kind, cmd, target, anchorA1, p){
  const rng = a1_(shU, anchorA1); if (!rng) return;
  if (kind === 'STEPGRID' && cmd === 'NOTE.PLAY'){
    const rows = Number(p.rows||1), cols = Number(p.cols||8);
    const block = shU.getRange(rng.getRow(), rng.getColumn(), rows, cols);
    const vals = block.getValues();
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){
      if (vals[r][c] === true){
        const note = Array.isArray(p.notes) ? (Number(p.notes[r])||36) : 36;
        out.push(makeEnv_('NOTE.PLAY', target, {
          note: note, velocity: Number(p.velocity||100), durationSec: Number(p.durationSec||0.12), channel: Number(p.channel||1)
        }));
      }
    }
  }
  else if (kind === 'DROPDOWN' && cmd === 'CC.LFO'){
    const sel = shU.getRange(anchorA1).getValue();
    out.push(makeEnv_('CC.LFO', target, {
      cc: Number(p.cc||1), waveform: String(sel||'sine'),
      rateHz: (p.rateHz!=null)?Number(p.rateHz):undefined, sync: p.sync,
      depth: Number(p.depth||64), center: Number(p.center||64), channel: Number(p.channel||1)
    }));
  }
  else if (kind === 'SLIDER' && cmd === 'CC.SET'){
    const v = Number(shU.getRange(anchorA1).getValue() || 0);
    const min = Number(p.min ?? 0), max = Number(p.max ?? 127);
    const clamped = Math.max(min, Math.min(max, v));
    out.push(makeEnv_('CC.SET', target, { cc: Number(p.cc||1), value: clamped, channel: Number(p.channel||1) }));
  }
  else if (kind === 'BUTTON' && cmd === 'MACRO.TRIGGER'){
    out.push(makeEnv_('MACRO.TRIGGER', target, { macroId: String((p && p.macroId) || id) }));
  }
}

function makeEnv_(type, target, payload){
  return {
    v:1, type, id: 'cmd_' + Date.now() + '_' + Math.floor(Math.random()*1e6),
    at:'now', target: target || 'default', payload: payload || {}, transform: []
  };
}

/************************
 * Optional: Pub/Sub emit
 ************************/
function publishEnvelopes_(envs){
  const props = PropertiesService.getScriptProperties();
  const projectId = props.getProperty('GCP_PROJECT_ID');
  const topic = props.getProperty('COMMANDS_TOPIC') || 'dawsheet.commands';
  if (!projectId) throw new Error('GCP_PROJECT_ID not set (Setup Wizard).');
  const token = ScriptApp.getOAuthToken();
  const url = `https://pubsub.googleapis.com/v1/projects/${projectId}/topics/${topic}:publish`;
  const data = Utilities.base64Encode(JSON.stringify(envs));
  const res = UrlFetchApp.fetch(url, {
    method:'post', contentType:'application/json',
    payload: JSON.stringify({ messages:[{ data }] }),
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error(res.getContentText());
}

/********************
 * Helpers
 ********************/
function a1_(sh, a1){
  try{
    const m = String(a1).trim();
    if (!m.includes('!')) return sh.getRange(m);
    const [tab, addr] = m.split('!');
    const s = SpreadsheetApp.getActive().getSheetByName(tab.replace(/\'|\"/g,'')) || sh;
    return s.getRange(addr);
  }catch(e){ return null; }
}
function parseJson_(s){ try{ return (s ? JSON.parse(s) : null); } catch(e){ return null; } }
