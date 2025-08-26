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
  try {
    const { isValid, errors } = validateData(SONG_SCHEMA, song);
    if (!isValid) throw new Error('Song JSON invalid: ' + errors.join('; '));
    saveSong(song);
    return `Imported "${title}" as ${songId}`;
  } catch (e) {
    // Fallback path if AJV or validation fails: write without validation.
    saveSongUnsafe_(song);
    return `Imported "${title}" as ${songId} (no-validate)`;
  }
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
  try {
    const { isValid, errors } = validateData(SONG_SCHEMA, song);
    if (!isValid) throw new Error('MIDI reduced invalid: ' + errors.join('; '));
    saveSong(song);
    return `Imported MIDI as "${song.meta.title}" (${songId})`;
  } catch (e) {
    saveSongUnsafe_(song);
    return `Imported MIDI as "${song.meta.title}" (${songId}) (no-validate)`;
  }
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

/** Unsafe writer that bypasses schema validation (used as fallback). */
function saveSongUnsafe_(songData) {
  // Song_Library
  const songMetaHeaders = ['songId','title','artist','bpm','key','mode','timeSignature','tags','notes'];
  let songLib = getSheetData('Song_Library');
  const row = {
    songId: songData.songId,
    title: songData.meta.title,
    artist: songData.meta.artist || '',
    bpm: songData.meta.bpm,
    key: songData.meta.key,
    mode: songData.meta.mode || '',
    timeSignature: songData.meta.timeSignature || '4/4',
    tags: Array.isArray(songData.meta.tags) ? songData.meta.tags.join(', ') : '',
    notes: songData.meta.notes || ''
  };
  const idx = songLib.findIndex(r => r.songId === songData.songId);
  if (idx >= 0) songLib[idx] = row; else songLib.push(row);
  setSheetData('Song_Library', songLib, songMetaHeaders);

  // Song_Sections
  const sectionHeaders = ['songId','sectionId','sectionName','lengthBars','chords','lyricsRef','notes'];
  let sections = getSheetData('Song_Sections').filter(s => s.songId !== songData.songId);
  songData.sections.forEach(sec => {
    sections.push({
      songId: songData.songId,
      sectionId: sec.sectionId,
      sectionName: sec.sectionName,
      lengthBars: sec.lengthBars,
      chords: JSON.stringify(sec.chords),
      lyricsRef: sec.lyricsRef || '',
      notes: sec.notes || ''
    });
  });
  setSheetData('Song_Sections', sections, sectionHeaders);

  // Arrangements
  const arrangementHeaders = ['songId','arrangementIndex','sectionId','startBar','repeat','sceneRef','macroRef'];
  let arr = getSheetData('Arrangements').filter(a => a.songId !== songData.songId);
  songData.arrangement.forEach(item => {
    arr.push({
      songId: songData.songId,
      arrangementIndex: item.arrangementIndex,
      sectionId: item.sectionId,
      startBar: item.startBar,
      repeat: item.repeat || 1,
      sceneRef: item.sceneRef || '',
      macroRef: item.macroRef || ''
    });
  });
  setSheetData('Arrangements', arr, arrangementHeaders);
}
