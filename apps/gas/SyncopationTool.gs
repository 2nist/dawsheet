// SyncopationTool.gs
function openSyncopationSidebar(){
  const html = HtmlService.createTemplateFromFile('SyncopationUI')
    .evaluate().setTitle('Syncopation Heatmap').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Write a (subdivisions x bars) heatmap into a sheet. */
function sync_writeHeatmap(sheetName, grid){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  const rows = grid.length, cols = grid[0].length;
  sh.clearContents();
  sh.getRange(1,1,rows,cols).setValues(grid);
  // gradient format
  const rules = [SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpoint('#f7f3e9').setGradientMaxpoint('#ff6f2a')
    .setRanges([sh.getRange(1,1,rows,cols)]).build()];
  sh.setConditionalFormatRules(rules);
  return `${sheetName}!A1:${String.fromCharCode(64+cols)}${rows}`;
}
