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
  const { title, bpm, key } = inferSongMetaFromJson_(jsonObj, songIdHint);
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
    meta:{ title: (midiReduced.meta && midiReduced.meta.title) || prettyTitleFromHint_(songIdHint || songId), artist:'', bpm, key, timeSignature:'4/4', tags:['from-midi'], notes:'' },
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
function makeSafeId_(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
function prettyTitleFromHint_(hint){
  var t = String(hint||'').replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim();
  return t || 'Untitled';
}
function inferSongMetaFromJson_(obj, hint){
  // Try common paths
  var meta = obj && obj.meta ? obj.meta : (obj && obj.song && obj.song.meta ? obj.song.meta : {});
  var title = (meta && meta.title) || obj.title || (obj.song && obj.song.title) || prettyTitleFromHint_(hint);
  var bpm = Number((meta && (meta.bpm || meta.tempo)) || obj.bpm || 120);
  var keyVal = (meta && (meta.key || (meta.scale && meta.scale.key))) || obj.key || 'C';
  if (keyVal && typeof keyVal === 'object') { keyVal = keyVal.tonic || keyVal.key || 'C'; }
  var key = String(keyVal);
  return { title, bpm, key };
}
function inferSectionsFromJson_(obj){
  // Try several shapes: {sections:[{name,chords:[]},...]}, {sectionMap:{name:[]}, arrangement:[names]}, {chords:[]}
  // 1) sections array with chords
  if (Array.isArray(obj.sections)) {
    var secs = [];
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i=0;i<obj.sections.length;i++){
      var s = obj.sections[i] || {};
      var chordsArr = parseChordsArray_(s.chords || s.chord || s.progression || []);
      if (!chordsArr.length) continue;
      var lenBars = Math.max(1, Math.ceil(chordsArr.reduce(function(sum,c){return sum+(c.beats||4);},0)/4));
      var secId = i < letters.length ? letters[i] : ('S'+(i+1));
      secs.push({ sectionId: secId, sectionName: String(s.name || s.title || ('Section '+secId)), lengthBars: lenBars, chords: chordsArr });
    }
    if (secs.length) return secs;
  }
  // 2) section map + arrangement
  var map = obj.sectionMap || obj.sectionsMap || obj.parts || null;
  var arr = obj.arrangement || obj.structure || obj.form || null;
  if (map && arr && (Array.isArray(arr))){
    var out = [],
        idByName = {},
        letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var idx = 0;
    // Build sections in first-appearance order
    arr.forEach(function(ref){
      var name = (ref && (ref.name || ref.id || ref.section || ref.ref)) || String(ref);
      if (!name || idByName[name]) return;
      var chordList = parseChordsArray_(map[name] || []);
      if (!chordList.length) return;
      var lenBars = Math.max(1, Math.ceil(chordList.reduce(function(sum,c){return sum+(c.beats||4);},0)/4));
      var secId = idx < letters.length ? letters[idx] : ('S'+(idx+1));
      idByName[name] = secId;
      out.push({ sectionId: secId, sectionName: String(name), lengthBars: lenBars, chords: chordList });
      idx++;
    });
    if (out.length) return out;
  }
  // 3) flat chords
  var chords = parseChordsArray_(obj.chords || []);
  if (chords.length){
    return [{ sectionId:'A', sectionName:'Section A', lengthBars: Math.max(1, Math.ceil(chords.reduce(function(sum,c){return sum+(c.beats||4);},0)/4)), chords: chords }];
  }
  // default fallback single bar C
  return [{ sectionId:'A', sectionName:'Section A', lengthBars:1, chords:[{ symbol:'C', beats:4 }] }];
}

function inferArrangementFromJson_(obj, sections){
  var arr = obj.arrangement || obj.structure || obj.form || null;
  var index = 1, start = 1, out = [];
  if (Array.isArray(arr)){
    // If arr contains names/ids, map to first matching section
    arr.forEach(function(ref){
      var name = (ref && (ref.name || ref.id || ref.section || ref.ref)) || String(ref);
      var sec = sections.find(function(s){ return s.sectionName === name || s.sectionId === name; });
      if (!sec) return;
      out.push({ arrangementIndex:index++, sectionId: sec.sectionId, startBar: start, repeat: (ref && ref.repeat) || 1 });
      start += sec.lengthBars * ((ref && ref.repeat) || 1);
    });
  }
  if (!out.length){
    // default: chain sections once each
    sections.forEach(function(sec){
      out.push({ arrangementIndex:index++, sectionId: sec.sectionId, startBar: start, repeat:1 });
      start += sec.lengthBars;
    });
  }
  return out;
}

function parseChordsArray_(list){
  var out = [];
  if (!Array.isArray(list)) return out;
  list.forEach(function(item){
    if (item == null) return;
    if (typeof item === 'string'){
      // Accept formats: "C", "C:4", "Cmaj7", trim and optional beats after ':'
      var m = String(item).trim().match(/^([^:]+)(?::(\d+(?:\.\d+)?))?$/);
      if (m){ out.push({ symbol: m[1].trim(), beats: m[2] ? Number(m[2]) : 4 }); }
      return;
    }
    if (typeof item === 'object'){
      var sym = item.symbol || item.chord || item.name || item.roman || 'C';
      var beats = item.beats != null ? Number(item.beats) : (item.durationBeats != null ? Number(item.durationBeats) : (item.len || 4));
      out.push({ symbol: String(sym), beats: beats });
    }
  });
  return out;
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

/** Server-side tolerant JSON parse, returns object or throws. */
function importChordJsonRaw(jsonText, songIdHint){
  var text = String(jsonText||'');
  try {
    return importChordJsonToSheets(JSON.parse(text), songIdHint);
  } catch(e1) {
    // cleanup and retry
    try {
      var cleaned = text.replace(/^\uFEFF/, '')
                        .replace(/\/\*[\s\S]*?\*\//g, '')
                        .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
                        .replace(/,\s*([}\]])/g, '$1');
      return importChordJsonToSheets(JSON.parse(cleaned), songIdHint);
    } catch(e2) {
      throw new Error('JSON parse failed after cleanup: ' + (e2 && e2.message ? e2.message : e2));
    }
  }
}
