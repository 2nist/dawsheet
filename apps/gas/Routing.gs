/** Routing MVP: routing sheet and publish DEVICE.PARAM_SET */

function routing_ensureSheet_(){
  const ss = SpreadsheetApp.getActive();
  const name = 'Routing';
  let sh = ss.getSheetByName(name);
  if (!sh){
    sh = ss.insertSheet(name);
    sh.appendRow(['Source/Target','Dest1','Dest2','Dest3']);
    sh.appendRow(['Keyboard',0,1,0]);
    sh.appendRow(['Pads',1,0,0]);
  }
  return sh;
}

function openRouting(){
  const html = HtmlService.createHtmlOutputFromFile('RoutingUI').setTitle('Routing');
  SpreadsheetApp.getUi().showSidebar(html);
}

function routing_getState(){
  const sh = routing_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  const hdr = vals.shift();
  return { header: hdr, rows: vals };
}

function routing_updateCell(sourceRow, destCol, value){
  const sh = routing_ensureSheet_();
  const r = sourceRow + 2; // account for header
  const c = destCol + 2;   // account for first column
  sh.getRange(r, c).setValue(value ? 1 : 0);
  publish(PropertiesService.getScriptProperties().getProperty('COMMANDS_TOPIC'), {
    type: 'DEVICE.PARAM_SET',
    targetId: 'router',
    param: `route:${sh.getRange(r,1).getValue()}->${sh.getRange(1,c).getValue()}`,
    value: value ? 1 : 0
  });
  return 'ok';
}
