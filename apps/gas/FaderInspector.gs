/** Inspector: map slider/fader range to CC. */
function fi_getFaderInspectorData(triggerId){
  const t = te_getTrigger(triggerId);
  if (!t || !(t.behavior && t.behavior.kind === 'fader'))
    throw new Error('Not a fader trigger.');
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  const tags = dsReadTags_(range);
  return {
    channel: Number(tags.channel || t.behavior.channel || 1),
    cc: Number(tags.cc || t.behavior.cc || 74),
    min: Number(tags.min || 0),
    max: Number(tags.max || 127)
  };
}

function fi_updateFaderInspector(triggerId, body){
  const t = te_getTrigger(triggerId);
  if (!t) throw new Error('Trigger not found');
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  dsTagRange_(range, {
    channel: String(body.channel),
    cc: String(body.cc),
    min: String(body.min),
    max: String(body.max)
  });
  // persist behavior
  const trg = te_ensureSheet_();
  const vals = trg.getDataRange().getValues();
  const hdr = vals.shift(); const idx = Object.fromEntries(hdr.map((h,i)=>[h,i]));
  for (let r=0;r<vals.length;r++){
    if (String(vals[r][idx.id]) === String(triggerId)){
      const behavior = t.behavior || { kind: 'fader' };
      behavior.channel = Number(body.channel);
      behavior.cc = Number(body.cc);
      behavior.min = Number(body.min);
      behavior.max = Number(body.max);
      trg.getRange(r+2, idx.behavior+1).setValue(JSON.stringify(behavior));
      break;
    }
  }
  return 'Fader updated';
}
