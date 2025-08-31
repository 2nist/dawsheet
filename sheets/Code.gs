/**
 * Code.gs — Apps Script helpers for DAWSheet Timeline
 * Menu: DAWSheet → Open Timeline Sidebar
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("DAWSheet")
    .addItem("Open MIDI+Timeline Sidebar", "openMidiSidebar")
    .addItem("Open Timeline Sidebar", "openTimelineSidebar")
    .addToUi();
}

function openTimelineSidebar() {
  const html =
    HtmlService.createHtmlOutputFromFile("TimelineSidebar").setTitle(
      "DAWSheet Timeline"
    );
  SpreadsheetApp.getUi().showSidebar(html);
}

function openMidiSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("MidiSidebar").setTitle(
    "DAWSheet MIDI + Timeline"
  );
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Return headers of the Timeline sheet (first row). */
function getTimelineHeaders() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Timeline");
  if (!sh) return [];
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return headers;
}

/** Return all rows (without header) of the Timeline sheet. */
function getTimelineRows() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Timeline");
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return [];
  return sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

/** Hide/show columns by name. colsMap is { "Lyric": true/false, ... } */
function setTimelineVisibility(colsMap) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Timeline");
  if (!sh) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.keys(colsMap || {}).forEach((colName) => {
    const wantVisible = !!colsMap[colName];
    const idx = headers.indexOf(colName);
    if (idx >= 0) {
      const colIdx = idx + 1; // 1-based
      if (wantVisible) sh.showColumns(colIdx);
      else sh.hideColumns(colIdx);
    }
  });
}

/** Highlight the current playhead row in the Timeline sheet. */
function setPlayhead(rowNumber1Based) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Timeline");
  if (!sh) return false;

  // Find (or create) the "Playhead" column
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  let idx = headers.indexOf("Playhead");
  if (idx < 0) {
    sh.insertColumnsBefore(1, 1);
    sh.getRange(1, 1).setValue("Playhead");
    const hdrs2 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    idx = hdrs2.indexOf("Playhead");
  }
  const col = idx + 1; // 1-based

  // Clear old marker and row backgrounds
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).setBackground(null);
    sh.getRange(2, col, lastRow - 1, 1).clearContent();
  }

  // Clamp and set marker
  rowNumber1Based = Math.max(2, Math.min(lastRow, rowNumber1Based));
  sh.getRange(rowNumber1Based, col).setValue("▶");
  const fullRow = sh.getRange(rowNumber1Based, 1, 1, sh.getLastColumn());
  fullRow.setBackground("#fff3cd");
  sh.setActiveRange(sh.getRange(rowNumber1Based, 1));
  return true;
}

function clearPlayhead() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Timeline");
  if (!sh) return false;
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const idx = headers.indexOf("Playhead");
    if (idx >= 0) sh.getRange(2, idx + 1, lastRow - 1, 1).clearContent();
    sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).setBackground(null);
  }
  return true;
}

// Optional installer: add lyric word-timing columns after Lyric_conf
function installLyricWordColumns() {
  const timelineSheet = SpreadsheetApp.getActive().getSheetByName("Timeline");
  if (!timelineSheet) throw new Error("Timeline sheet not found");
  const headers = timelineSheet
    .getRange(1, 1, 1, timelineSheet.getLastColumn())
    .getValues()[0];
  const desired = [
    "EventType",
    "WordStart_s",
    "WordEnd_s",
    "SubIdx",
    "Melisma",
  ];

  if (desired.every((w) => headers.includes(w))) return; // already installed

  const lyricConfIndex = headers.indexOf("Lyric_conf");
  if (lyricConfIndex < 0) throw new Error("Lyric_conf header not found");
  const insertAt = lyricConfIndex + 2; // after Lyric_conf (1-based)

  timelineSheet.insertColumns(insertAt, desired.length);
  timelineSheet.getRange(1, insertAt, 1, desired.length).setValues([desired]);

  // Formatting
  const colWordStart = insertAt + 1;
  const colWordEnd = insertAt + 2;
  const colSubOrder = insertAt + 3; // column for SubIdx header
  const colMelisma = insertAt + 4;

  timelineSheet
    .getRange(2, colWordStart, timelineSheet.getMaxRows() - 1, 1)
    .setNumberFormat("0.000");
  timelineSheet
    .getRange(2, colWordEnd, timelineSheet.getMaxRows() - 1, 1)
    .setNumberFormat("0.000");
  timelineSheet
    .getRange(2, colSubOrder, timelineSheet.getMaxRows() - 1, 1)
    .setNumberFormat("0");
  timelineSheet
    .getRange(2, colMelisma, timelineSheet.getMaxRows() - 1, 1)
    .insertCheckboxes();
}
