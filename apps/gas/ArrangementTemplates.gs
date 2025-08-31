// ArrangementTemplates.gs
function openArrangementTemplateSidebar(){
  const html = HtmlService.createTemplateFromFile('ArrangementUI')
    .evaluate().setTitle('Arrangement Templates').setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Insert section-labeled scaffolds: grids per section, palette of song chords. */
function atg_generate(songId){
  const s = getSong(songId);
  const uiSheetName = 'UI';
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(uiSheetName) || ss.insertSheet(uiSheetName);
  sh.clear();
  var row = 2;

  // 1) Chord Palette of unique chords in song
  const allChords = [].concat.apply([], (s.sections||[]).map(function(sec){ return (sec.chords||[]).map(function(c){return c.symbol;}); }));
  const seen = {}; const unique = [];
  allChords.forEach(function(sym){ if (!seen[sym]) { seen[sym]=1; unique.push(sym); } });
  sh.getRange(1,1).setValue('Chord Palette: ' + s.meta.title).setFontWeight('bold');
  SpreadsheetApp.flush();
  sh.setActiveSelection(sh.getRange(row,1));
  if (typeof tpl_insertChordPalette8 === 'function') tpl_insertChordPalette8();
  var slots = Math.min(unique.length, 8);
  if (slots>0) sh.getRange(row,3,1,slots).setValues([unique.slice(0,slots)]);
  row += 4;

  // 2) Step grids per arrangement section (drum lanes)
  (s.arrangement||[]).forEach(function(item){
    var sec = (s.sections||[]).find(function(x){ return x.sectionId === item.sectionId; });
    if (!sec) return;
    sh.getRange(row-1,1).setValue(sec.sectionName + ' (' + sec.lengthBars + ' bars)').setFontWeight('bold');
    sh.setActiveSelection(sh.getRange(row,1));
    if (typeof tpl_insertStepGrid16 === 'function') tpl_insertStepGrid16();
    row += 5;
  });

  return 'Inserted palette + ' + (s.arrangement||[]).length + ' grids in ' + uiSheetName + ' sheet.';
}
