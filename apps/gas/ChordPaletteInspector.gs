/** Inspector: read/write chord palette triggers. */
function cpi_getChordPaletteData(triggerId){
  const t = te_getTrigger(triggerId);
  if (!t || !(t.behavior && t.behavior.kind === 'chord-palette'))
    throw new Error('Not a chord-palette trigger.');
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  const tags = dsReadTags_(range);
  return {
    channel: Number(tags.channel || t.behavior.channel || 1),
    root: String(tags.root || t.behavior.root || 'C'),
    scale: String(tags.scale || t.behavior.scale || 'major'),
    voicing: String(tags.voicing || t.behavior.voicing || 'root')
  };
}

function cpi_updateChordPalette(triggerId, body){
  const t = te_getTrigger(triggerId);
  if (!t) throw new Error('Trigger not found');
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  dsTagRange_(range, {
    channel: String(body.channel),
    root: String(body.root),
    scale: String(body.scale),
    voicing: String(body.voicing)
  });
  const trg = te_ensureSheet_();
  const vals = trg.getDataRange().getValues();
  const hdr = vals.shift(); const idx = Object.fromEntries(hdr.map((h,i)=>[h,i]));
  for (let r=0;r<vals.length;r++){
    if (String(vals[r][idx.id]) === String(triggerId)){
      const behavior = t.behavior || { kind: 'chord-palette' };
      behavior.channel = Number(body.channel);
      behavior.root = String(body.root);
      behavior.scale = String(body.scale);
      behavior.voicing = String(body.voicing);
      trg.getRange(r+2, idx.behavior+1).setValue(JSON.stringify(behavior));
      break;
    }
  }
  return 'Chord Palette updated';
}
