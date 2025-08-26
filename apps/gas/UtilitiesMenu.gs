/**
 * DAWSheet — Utilities menu (tabs)
 * - Song Library actions
 */

function registerUtilitiesMenu_(){
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('DAWSheet — Utilities');

  // Song Library section
  menu.addSubMenu(
    ui.createMenu('Song Library')
      .addItem('Open Sidebar', 'util_songLib_openSidebar')
      .addItem('List Songs → Logs', 'util_songLib_listSongs')
  .addItem('Seed Demo Sheets', 'util_songLib_seedDemo')
      .addItem('Send Song to Timeline…', 'util_songLib_sendToTimeline')
      .addItem('Load Song into Live Set…', 'util_songLib_loadIntoLiveSet')
  );

  // Tools
  menu.addSeparator();
  menu.addItem('Clear Lib Cache (AJV/Tonal)', 'util_clearLibCache');
  menu.addItem('Lib Self-Test (AJV/Tonal)', 'util_libSelfTest');

  menu.addToUi();
}

// Handlers — Song Library
function util_songLib_openSidebar(){
  try { showSongLibrarySidebar(); }
  catch (e) { SpreadsheetApp.getUi().alert('Song Library Sidebar error: '+ e.message); }
}

function util_songLib_listSongs(){
  try {
    const list = (getSongsForSidebar && getSongsForSidebar()) || [];
    console.log('Song Library:', JSON.stringify(list, null, 2));
    SpreadsheetApp.getUi().alert('Song Library', `Found ${list.length} song(s). See Logs for details.`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e){ SpreadsheetApp.getUi().alert('Error listing songs: ' + e.message); }
}

function util_songLib_sendToTimeline(){
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Send to Timeline', 'Enter songId to send:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const songId = String(resp.getResponseText() || '').trim();
  if (!songId) return;
  try {
    const msg = sendSelectedSongToTimeline(songId);
    ui.alert('Song Library', msg, ui.ButtonSet.OK);
  } catch(e){ ui.alert('Error', e.message, ui.ButtonSet.OK); }
}

function util_songLib_loadIntoLiveSet(){
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Load into Live Set', 'Enter songId to load:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const songId = String(resp.getResponseText() || '').trim();
  if (!songId) return;
  try {
    const msg = loadSelectedSongIntoLiveSet(songId);
    ui.alert('Song Library', msg, ui.ButtonSet.OK);
  } catch(e){ ui.alert('Error', e.message, ui.ButtonSet.OK); }
}

function util_songLib_seedDemo(){
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActive();
    // Song_Library
    const shLib = ss.getSheetByName('Song_Library') || ss.insertSheet('Song_Library');
    const libHeaders = ['songId','title','artist','bpm','key','mode','timeSignature','tags','notes'];
    shLib.clear(); shLib.getRange(1,1,1,libHeaders.length).setValues([libHeaders]).setFontWeight('bold');
    shLib.getRange(2,1,1,libHeaders.length).setValues([[
      'demo-001','Demo Song','DAWSheet',120,'C','Ionian','4/4','demo, test','Sample seeded song'
    ]]);
    shLib.setFrozenRows(1);

    // Song_Sections
    const shSec = ss.getSheetByName('Song_Sections') || ss.insertSheet('Song_Sections');
    const secHeaders = ['songId','sectionId','sectionName','lengthBars','chords','lyricsRef','notes'];
    shSec.clear(); shSec.getRange(1,1,1,secHeaders.length).setValues([secHeaders]).setFontWeight('bold');
    const chords = JSON.stringify([{ symbol:'Cmaj7', beats:4 }, { symbol:'Fmaj7', beats:4 }, { symbol:'G7', beats:4 }, { symbol:'Cmaj7', beats:4 }]);
    shSec.getRange(2,1,1,secHeaders.length).setValues([[
      'demo-001','A','Verse',16,chords,'',''
    ]]);
    shSec.setFrozenRows(1);

    // Arrangements
    const shArr = ss.getSheetByName('Arrangements') || ss.insertSheet('Arrangements');
    const arrHeaders = ['songId','arrangementIndex','sectionId','startBar','repeat','sceneRef','macroRef'];
    shArr.clear(); shArr.getRange(1,1,1,arrHeaders.length).setValues([arrHeaders]).setFontWeight('bold');
    shArr.getRange(2,1,1,arrHeaders.length).setValues([[
      'demo-001',1,'A',1,1,'',''
    ]]);
    shArr.setFrozenRows(1);

    ui.alert('Seed Complete', 'Created Song_Library, Song_Sections, and Arrangements with a demo song (demo-001).', ui.ButtonSet.OK);
  } catch(e){ ui.alert('Seed Error', e.message, ui.ButtonSet.OK); }
}

function util_clearLibCache(){
  const ui = SpreadsheetApp.getUi();
  try {
    if (typeof clearLibraryLoaderCache === 'function') {
      clearLibraryLoaderCache();
      ui.alert('Utilities', 'Cleared cached AJV/Tonal loader entries.', ui.ButtonSet.OK);
    } else {
      ui.alert('Utilities', 'Cache clear function not found.', ui.ButtonSet.OK);
    }
  } catch(e){ ui.alert('Utilities', 'Error clearing cache: ' + e.message, ui.ButtonSet.OK); }
}

function util_libSelfTest(){
  const ui = SpreadsheetApp.getUi();
  try {
    // Try loading libs
  var ajvErr = null, tonalErr = null;
  try { loadAjv(); } catch (e) { ajvErr = e && e.message ? e.message : String(e); }
  try { loadTonalJs(); } catch (e) { tonalErr = e && e.message ? e.message : String(e); }
  var ajvType = typeof Ajv;
  var tonalType = typeof Tonal;
  var keys = Object.keys(this || {}).filter(k => /ajv|tonal/i.test(k)).slice(0, 10);
  var msg = 'typeof Ajv: ' + ajvType + (ajvErr ? ' (loader: ' + ajvErr + ')' : '') + '\n' +
        'typeof Tonal: ' + tonalType + (tonalErr ? ' (loader: ' + tonalErr + ')' : '') + '\n' +
        'Visible globals (ajv/tonal): ' + (keys.join(', ') || '[none]') + '\n' +
        'Note: If types look wrong, use Clear Lib Cache and reload.';
    ui.alert('Lib Self-Test', msg, ui.ButtonSet.OK);
  } catch(e){ ui.alert('Lib Self-Test Error', e.message, ui.ButtonSet.OK); }
}
