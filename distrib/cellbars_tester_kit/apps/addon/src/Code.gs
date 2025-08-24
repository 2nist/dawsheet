// DAWSheet — CellBars: Welcome + Init + Demo JSON + Bridge hooks (placeholder logo)

const TAB_CONTROLS = 'Controls';
const TAB_UI = 'UI';
const TAB_EMIT = 'Emit';
const TAB_TIMELINE = 'Timeline';
const TAB_DEMO = 'WelcomeDemo';
const DEMO_RANGE = 'A1';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DAWSheet — CellBars')
    .addItem('Open', 'showWelcome')
    .addItem('Initialize Workbook', 'initializeWorkbook')
    .addToUi();
}

function showWelcome() {
  const html = HtmlService.createTemplateFromFile('welcome').evaluate()
    .setTitle('DAWSheet — CellBars')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(html);
}

function initializeWorkbook() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet_(TAB_CONTROLS);
  ensureSheet_(TAB_UI);
  ensureSheet_(TAB_EMIT);
  ensureSheet_(TAB_TIMELINE);
  ensureSheet_(TAB_DEMO);
  seedDemoSequenceIfMissing_();
  const shC = ss.getSheetByName(TAB_CONTROLS);
  if (shC.getLastRow() === 0) {
    shC.getRange(1,1,1,8).setValues([[
      'ControlID','Kind','CommandType','Target','Params','Defaults','UIStyle','Enabled'
    ]]).setFontWeight('bold');
  }
  const shT = ss.getSheetByName(TAB_TIMELINE);
  if (shT.getLastRow() === 0) {
    shT.getRange(1,1,1,6).setValues([[
      'Bar','Section','Track 1','Track 2','Track 3','Notes'
    ]]).setFontWeight('bold');
    shT.setFrozenRows(1); shT.setFrozenColumns(1);
  }
  SpreadsheetApp.getUi().alert('CellBars: Workbook initialized. Open the Welcome sidebar to continue.');
}

function ensureSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function seedDemoSequenceIfMissing_(){
  const sh = ensureSheet_(TAB_DEMO);
  const cell = sh.getRange(DEMO_RANGE);
  if (!cell.getValue()) {
    const demo = {
      "bpm":110,
      "notes":[
        {"t":0.00,"n":36,"v":110,"d":0.12,"ch":9},
        {"t":0.25,"n":42,"v":80,"d":0.06,"ch":9},
        {"t":0.50,"n":38,"v":105,"d":0.12,"ch":9},
        {"t":0.75,"n":42,"v":80,"d":0.06,"ch":9},
        {"t":1.00,"n":36,"v":115,"d":0.12,"ch":9},
        {"t":1.25,"n":42,"v":80,"d":0.06,"ch":9},
        {"t":1.50,"n":38,"v":105,"d":0.12,"ch":9},
        {"t":1.75,"n":46,"v":85,"d":0.06,"ch":9}
      ],
      "loopSec":2.0
    };
    cell.setValue(JSON.stringify(demo, null, 2));
    sh.getRange("A2").setValue("Edit JSON above to change the welcome demo sequence (bpm, notes[t,n,v,d,ch], loopSec).");
  }
}

function getDemoSequenceJSON(){
  seedDemoSequenceIfMissing_();
  return SpreadsheetApp.getActive().getSheetByName(TAB_DEMO).getRange(DEMO_RANGE).getValue();
}

function saveDemoSequenceJSON(jsonStr){
  try{ JSON.parse(jsonStr); }catch(e){ throw new Error('Invalid JSON: ' + e); }
  SpreadsheetApp.getActive().getSheetByName(TAB_DEMO).getRange(DEMO_RANGE).setValue(jsonStr);
  return true;
}

// --- Compiler stub (returns a tiny envelope list for Bridge) ---
function getTestEnvelopes(){
  return JSON.stringify([{
    "v":1,"type":"NOTE.PLAY","id":"hello_"+Date.now(),
    "at":"now","target":"default",
    "payload":{"note":"C4","velocity":100,"durationSec":0.2,"channel":1}
  }]);
}

function insertTimeline(){
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB_TIMELINE) || ensureSheet_(TAB_TIMELINE);
  const startRow = Math.max(2, sh.getLastRow()+1);
  for (let i=0;i<8;i++) sh.getRange(startRow+i, 1, 1, 2).setValues([[i+1, (i<4?'A':'B')]]);
  const cols = sh.getMaxColumns();
  for (let c=3;c<=cols;c++) if (((c-3) % 4) === 0) sh.getRange(1, c, sh.getMaxRows()).setBackground('#eef2ff');
}

function insertStepGrid16(){
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB_UI) || ensureSheet_(TAB_UI);
  const start = sh.getActiveCell() || sh.getRange(2,2);
  const rows = 3, cols = 16;
  const block = sh.getRange(start.getRow(), start.getColumn(), rows, cols);
  block.setBackground('#f5f7fa').setBorder(true, true, true, true, true, true);
  sh.getRange(block.getRow(), block.getColumn(), 1, cols).insertCheckboxes();
  sh.getRange(block.getRow()+1, block.getColumn(), 1, cols).setValues([Array(cols).fill(100)]).setNumberFormat('0');
  sh.getRange(block.getRow()+2, block.getColumn(), 1, cols).setValues([Array(cols).fill(1)]).setNumberFormat('0.00');
  SpreadsheetApp.getActive().setNamedRange('CTRL_STEPGRID16_BLOCK', block);
  SpreadsheetApp.getUi().alert('Inserted Step Grid 16 at ' + block.getA1Notation());
}
