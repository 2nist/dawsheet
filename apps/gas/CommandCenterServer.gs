/**
 * DAWSheet — Command Center server stubs
 */

// --- Import stubs ---
function importChordJsonDialog(){
  try { openImportHub(); } catch(e){ SpreadsheetApp.getUi().alert('Import Hub error: ' + e.message); }
}

function importChordJsonUrlPrompt(){
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Import from URL', 'Enter URL to JSON chord dataset:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const url = String(resp.getResponseText() || '').trim();
  if (!url) return;
  try {
    const res = importChordJsonFromUrl(url, null);
    ui.alert('Import Complete', `Imported songId: ${res.songId}`, ui.ButtonSet.OK);
  } catch(e){ ui.alert('Import Error', e.message, ui.ButtonSet.OK); }
}

// --- Edit surfaces ---
function openEditTriggersUi(){
  const html = HtmlService.createHtmlOutputFromFile('TriggerEditorUI')
    .setTitle('DAWSheet — Trigger Editor').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}
function openSongEditor(){ SpreadsheetApp.getUi().alert('Song Editor', 'Song meta editor coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }
function openArrangementEditor(){ SpreadsheetApp.getUi().alert('Arrangement Editor', 'Arrangement editor coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }
function openPatternEditor(){ SpreadsheetApp.getUi().alert('Pattern Editor', 'Pattern / progression editor coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }
function openAutomationEditor(){ SpreadsheetApp.getUi().alert('Automation Editor', 'CC lanes editor coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }

// --- Triggers ---
function generateTriggersFromSong(){
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Generate Triggers', 'Enter songId to generate triggers for:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const songId = String(resp.getResponseText() || '').trim(); if (!songId) return;
  try { const out = generateTriggersForSong(songId, {}); ui.alert('Triggers', `Wrote ${out.wrote} row(s) for ${songId}.`, ui.ButtonSet.OK); }
  catch(e){ ui.alert('Error', e.message, ui.ButtonSet.OK); }
}

function previewFirst8Bars(){
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Preview First 8 Bars', 'Enter songId to preview:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const songId = String(resp.getResponseText() || '').trim(); if (!songId) return;
  try {
    const prev = previewCommandsForSong(songId, '1');
    ui.alert('Preview', `Prepared ${prev.count} command(s). Check Logs for sample.`, ui.ButtonSet.OK);
    console.log('Preview sample:', JSON.stringify(prev.sample, null, 2));
  } catch(e){ ui.alert('Error', e.message, ui.Button.OK); }
}

// --- Routing ---
function ensureRoutingSheet(){
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Routing');
  if (!sh) {
    sh = ss.insertSheet('Routing');
    const headers = ['Track','Target','Channel','Device','Address','Notes'];
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  SpreadsheetApp.getUi().alert('Routing', 'Routing sheet is ready.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function sendRoutingToBridge(){ SpreadsheetApp.getUi().alert('Routing', 'Compile & send routing coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }

function pingBridge(){ SpreadsheetApp.getUi().alert('Bridge', 'Ping coming soon (via WS/PubSub).', SpreadsheetApp.getUi().ButtonSet.OK); }

// --- Timeline ---
function timeline_buildForPrompt(){ SpreadsheetApp.getUi().alert('Timeline', 'Build timeline preview coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }

// --- Theory ---
function openTheoryHelpers(){ SpreadsheetApp.getUi().alert('Theory Helpers', 'Theory helpers sidebar coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }

// --- Theme ---
function openThemeEditor(){ SpreadsheetApp.getUi().alert('Theme Editor', 'Theme editor coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }

// --- Template button stubs (until implemented) ---
function tpl_insertChordPalette(){ SpreadsheetApp.getUi().alert('Templates', 'Chord Palette template coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }
function tpl_insertCcFaders8(){ SpreadsheetApp.getUi().alert('Templates', 'CC Faders (8) template coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }
function tpl_insertMacroPad2x4(){ SpreadsheetApp.getUi().alert('Templates', 'Macro Pad (2x4) template coming soon.', SpreadsheetApp.getUi().ButtonSet.OK); }
