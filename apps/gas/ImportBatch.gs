function openBatchImportSidebar(){
  const html = HtmlService.createTemplateFromFile('ImportBatchUI')
    .evaluate().setTitle('DAWSheet • Batch Import').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Import chord/song JSON into the Song Library sheets.
 */
function importChordJsonToSheets(jsonObj, songIdHint){
  const songId = makeSafeId_(songIdHint || (jsonObj.meta && jsonObj.meta.title) || 'song');
  const { title, bpm, key } = inferSongMetaFromJson_(jsonObj);
  const sections = inferSectionsFromJson_(jsonObj);
  const arrangement = inferArrangementFromJson_(jsonObj, sections);

  const song = {
    v:1, songId,
    meta: { title, artist:'', bpm, key, timeSignature:'4/4', tags:[], notes:'' },
    sections, arrangement, commands_ref:[]
  };
  const { isValid, errors } = validateData(SONG_SCHEMA, song);
  if (!isValid) throw new Error('Song JSON invalid: ' + errors.join('; '));
  saveSong(song);
  return `Imported "${title}" as ${songId}`;
}

/**
 * Import reduced MIDI JSON into Song Library.
 */
function importMidiJsonToSheets(midiReduced, songIdHint){
  const songId = makeSafeId_(songIdHint || (midiReduced.meta && midiReduced.meta.title) || 'midi_song');
  const bpm = 120; // TODO: infer from tempo events
  const key = 'C';
  const steps = 8;
  const chords = Array.from({length:steps}, function(){ return { symbol:'N.C.', beats:4 }; });
  const sections = [{ sectionId:'A', sectionName:'Section A', lengthBars:steps, chords }];
  const arrangement = [{ arrangementIndex:1, sectionId:'A', startBar:1, repeat:1 }];
  const song = {
    v:1, songId,
    meta:{ title: (midiReduced.meta && midiReduced.meta.title) || songId, artist:'', bpm, key, timeSignature:'4/4', tags:['from-midi'], notes:'' },
    sections, arrangement, commands_ref:[]
  };
  const { isValid, errors } = validateData(SONG_SCHEMA, song);
  if (!isValid) throw new Error('MIDI reduced invalid: ' + errors.join('; '));
  saveSong(song);
  return `Imported MIDI as "${song.meta.title}" (${songId})`;
}

// Helpers
function makeSafeId_(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
function inferSongMetaFromJson_(obj){
  const title = (obj.meta && obj.meta.title) || obj.title || 'Untitled';
  const bpm = Number((obj.meta && obj.meta.bpm) || obj.bpm || 120);
  const key = String((obj.meta && obj.meta.key) || obj.key || 'C');
  return { title, bpm, key };
}
function inferSectionsFromJson_(obj){
  const chords = Array.isArray(obj.chords) ? obj.chords : [];
  const sec = {
    sectionId:'A', sectionName:'Section A',
    lengthBars: Math.max(1, Math.ceil((chords.reduce(function(sum,c){return sum+(c.beats||4);},0))/4)),
    chords: chords.length ? chords : [{ symbol:'C', beats:4 }]
  };
  return [sec];
}
function inferArrangementFromJson_(obj, sections){
  return [{ arrangementIndex:1, sectionId:sections[0].sectionId, startBar:1, repeat:1 }];
}
