/**
 * DAWSheet Welcome Sidebar glue for the main DAWSheet script.
 */

function openWelcomeSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('welcome')
    .setTitle('DAWSheet — Welcome')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Demo JSON storage helpers
function getDemoSequenceJSON(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('WelcomeDemo') || ss.insertSheet('WelcomeDemo');
  const cell = sh.getRange('A1');
  if (!cell.getValue()) {
    const demo = {
      bpm: 110,
      notes: [
        { t:0.00, n:36, v:110, d:0.12, ch:9 },
        { t:0.25, n:42, v:80,  d:0.06, ch:9 },
        { t:0.50, n:38, v:105, d:0.12, ch:9 },
        { t:0.75, n:42, v:80,  d:0.06, ch:9 }
      ],
      loopSec: 2.0
    };
    cell.setValue(JSON.stringify(demo, null, 2));
    sh.getRange('A2').setValue('Edit JSON in A1 (bpm, notes[t,n,v,d,ch], loopSec).');
  }
  return String(cell.getValue());
}

function saveDemoSequenceJSON(jsonStr){
  try { JSON.parse(jsonStr); } catch(e) { throw new Error('Invalid JSON: ' + e); }
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('WelcomeDemo') || ss.insertSheet('WelcomeDemo');
  sh.getRange('A1').setValue(jsonStr);
  return true;
}

// Utilities used by the Welcome UI
function insertTimeline(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('Timeline') || ss.insertSheet('Timeline');
  const startRow = Math.max(2, sh.getLastRow()+1);
  for (let i=0;i<8;i++) sh.getRange(startRow+i, 1, 1, 2).setValues([[i+1, (i<4?'A':'B')]]);
  sh.setFrozenRows(1);
}

function insertStepGrid16(){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('UI') || ss.insertSheet('UI');
  const start = sh.getActiveCell() || sh.getRange(2,2);
  const rows = 3, cols = 16;
  const block = sh.getRange(start.getRow(), start.getColumn(), rows, cols);
  block.setBackground('#f5f7fa').setBorder(true, true, true, true, true, true);
  sh.getRange(block.getRow(), block.getColumn(), 1, cols).insertCheckboxes();
  sh.getRange(block.getRow()+1, block.getColumn(), 1, cols).setValues([Array(cols).fill(100)]).setNumberFormat('0');
  sh.getRange(block.getRow()+2, block.getColumn(), 1, cols).setValues([Array(cols).fill(1)]).setNumberFormat('0.00');
  ss.setNamedRange('CTRL_STEPGRID16_BLOCK', block);
}

// Minimal test envelope for bridge ping
function getTestEnvelopes(){
  return JSON.stringify([{
    v:1, type:'NOTE.PLAY', id:'hello_'+Date.now(), at:'now', target:'default',
    payload:{ note:'C4', velocity:100, durationSec:0.2, channel:1 }
  }]);
}
