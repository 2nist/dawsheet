function openBatchImportSidebar(){
  const html = HtmlService.createTemplateFromFile('ImportBatchUI')
    .evaluate().setTitle('DAWSheet • Batch Import').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Import chord/song JSON into the Song Library sheets.
 */
function importChordJsonToSheets(jsonObj, songIdHint){
  const hintTitle = (jsonObj && jsonObj.meta && jsonObj.meta.title) || songIdHint || '';
  const resolved = resolveSongIdByHint_(hintTitle || songIdHint);
  const songId = resolved || deriveSongIdFromHint_(hintTitle || 'song');
  const { title, bpm, key, artist } = inferSongMetaFromJson_(jsonObj, songIdHint);
  const beatsPerBar = getBeatsPerBar_(jsonObj);
  const sections = inferSectionsFromJson_(jsonObj, beatsPerBar);
  const arrangement = inferArrangementFromJson_(jsonObj, sections);

  const song = {
    v:1, songId,
    meta: { title, artist: (artist || getDefaultArtist_() || ''), bpm, key, timeSignature:'4/4', tags:[], notes:'' },
    sections, arrangement, commands_ref:[]
  };
  try {
    const { isValid, errors } = validateData(SONG_SCHEMA, song);
    if (!isValid) throw new Error('Song JSON invalid: ' + errors.join('; '));
    saveSongRespectingMaster_(song, 'json');
  // Ensure alias mapping for this title
  addSongAlias_(normalizeTitleSlug_(title), songId, 'json');
    return `Imported "${title}" as ${songId}`;
  } catch (e) {
    // Fallback path if AJV or validation fails: write without validation.
    saveSongRespectingMaster_(song, 'json');
  addSongAlias_(normalizeTitleSlug_(title), songId, 'json');
    return `Imported "${title}" as ${songId} (no-validate)`;
  }
}

/**
 * Import reduced MIDI JSON into Song Library.
 */
function importMidiJsonToSheets(midiReduced, songIdHint){
  const hintTitle = (midiReduced && midiReduced.meta && midiReduced.meta.title) || songIdHint || '';
  const resolved = resolveSongIdByHint_(hintTitle || songIdHint);
  const songId = resolved || deriveSongIdFromHint_(hintTitle || 'midi_song');
  const bpm = (midiReduced && midiReduced.meta && Number(midiReduced.meta.bpm)) || 120; // from header
  const key = 'C';
  const steps = 8;
  const chords = Array.from({length:steps}, function(){ return { symbol:'N.C.', beats:4 }; });
  const sections = [{ sectionId:'A', sectionName:'Section A', lengthBars:steps, chords }];
  const arrangement = [{ arrangementIndex:1, sectionId:'A', startBar:1, repeat:1 }];
  const song = {
    v:1, songId,
  meta:{ title: cleanTitleFromHint_((midiReduced.meta && midiReduced.meta.title) || prettyTitleFromHint_(songIdHint || songId)), artist:(getDefaultArtist_()||''), bpm, key, timeSignature: (midiReduced && midiReduced.meta && midiReduced.meta.timeSignature) || '4/4', tags:['from-midi'], notes:'' },
    sections, arrangement, commands_ref:[]
  };
  try {
    const { isValid, errors } = validateData(SONG_SCHEMA, song);
    if (!isValid) throw new Error('MIDI reduced invalid: ' + errors.join('; '));
    saveSongRespectingMaster_(song, 'midi');
  addSongAlias_(normalizeTitleSlug_(song.meta.title), songId, 'midi');
    return `Imported MIDI as "${song.meta.title}" (${songId})`;
  } catch (e) {
    saveSongRespectingMaster_(song, 'midi');
  addSongAlias_(normalizeTitleSlug_(song.meta.title), songId, 'midi');
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
  title = cleanTitleFromHint_(title);
  var bpm = Number((meta && (meta.bpm || meta.tempo)) || obj.bpm || 120);
  var keyVal = (meta && (meta.key || (meta.scale && meta.scale.key))) || obj.key || 'C';
  if (keyVal && typeof keyVal === 'object') { keyVal = keyVal.tonic || keyVal.key || 'C'; }
  var key = String(keyVal);
  var artist = (meta && (meta.artist || meta.band || meta.artistName)) || obj.artist || (obj.song && obj.song.artist) || '';
  if (artist) artist = String(artist).trim();
  return { title, bpm, key, artist };
}

// Default artist settings (stored in Script Properties)
function getDefaultArtist_(){
  try { return PropertiesService.getScriptProperties().getProperty('DAWSHEET_DEFAULT_ARTIST') || ''; } catch(_) { return ''; }
}
function setDefaultArtist(artist){
  PropertiesService.getScriptProperties().setProperty('DAWSHEET_DEFAULT_ARTIST', String(artist||''));
  return 'Default artist set to: ' + String(artist||'');
}
function inferSectionsFromJson_(obj, beatsPerBar){
  beatsPerBar = Number(beatsPerBar || 4);
  // Try several shapes: {sections:[{name,chords:[]},...]}, {sectionMap:{name:[]}, arrangement:[names]}, {chords:[]}
  // 1) sections array with chords
  if (Array.isArray(obj.sections)) {
    var secs = [];
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i=0;i<obj.sections.length;i++){
      var s = obj.sections[i] || {};
      var chordsArr = parseChordsArray_(s.chords || s.chord || s.progression || [], beatsPerBar);
      if (!chordsArr.length) continue;
      var totalBeats = chordsArr.reduce(function(sum,c){return sum+(Number(c.beats)||beatsPerBar);},0);
      var lenBars = Math.max(1, Math.ceil(totalBeats / beatsPerBar));
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
      var chordList = parseChordsArray_(map[name] || [], beatsPerBar);
      if (!chordList.length) return;
      var totalBeats = chordList.reduce(function(sum,c){return sum+(Number(c.beats)||beatsPerBar);},0);
      var lenBars = Math.max(1, Math.ceil(totalBeats / beatsPerBar));
      var secId = idx < letters.length ? letters[idx] : ('S'+(idx+1));
      idByName[name] = secId;
      out.push({ sectionId: secId, sectionName: String(name), lengthBars: lenBars, chords: chordList });
      idx++;
    });
    if (out.length) return out;
  }
  // 3) flat chords
  var chords = parseChordsArray_(obj.chords || [], beatsPerBar);
  if (chords.length){
    var total = chords.reduce(function(sum,c){return sum+(Number(c.beats)||beatsPerBar);},0);
    return [{ sectionId:'A', sectionName:'Section A', lengthBars: Math.max(1, Math.ceil(total / beatsPerBar)), chords: chords }];
  }
  // default fallback single bar C
  return [{ sectionId:'A', sectionName:'Section A', lengthBars:1, chords:[{ symbol:'C', beats:beatsPerBar }] }];
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

function parseChordsArray_(list, beatsPerBar){
  beatsPerBar = Number(beatsPerBar || 4);
  var out = [];
  if (!Array.isArray(list)) return out;
  list.forEach(function(item){
    if (item == null) return;
    if (typeof item === 'string'){
      // Accept formats: "C", "C:4", "C:1/2", "C(2)", "C[2bars]", "C*2" or "C x2"
      var str = String(item).trim();
      var mult = 1;
      var multMatch = str.match(/\s*[x\*]\s*(\d+(?:\.\d+)?)/i);
      if (multMatch) { mult = Number(multMatch[1]); str = str.replace(multMatch[0], '').trim(); }

      var symbol = str;
      var durToken = null;
      // Colon token: C:token
      var ci = str.indexOf(':');
      if (ci >= 0) { symbol = str.slice(0, ci).trim(); durToken = str.slice(ci+1).trim(); }
      else {
        // Bracket/paren token: C(token) or C[token]
        var pm = str.match(/^(.+?)\s*[\(\[]\s*([^\)\]]+)\s*[\)\]]\s*$/);
        if (pm) { symbol = pm[1].trim(); durToken = pm[2].trim(); }
      }
      var baseBeats;
      if (durToken){ baseBeats = parseDurationToken_(durToken, beatsPerBar); }
      if (baseBeats == null || isNaN(baseBeats)) baseBeats = beatsPerBar;
      out.push({ symbol: symbol, beats: baseBeats * mult });
      return;
    }
    if (typeof item === 'object'){
      var sym = item.symbol || item.chord || item.name || item.roman || 'C';
      // Gather possible duration fields, prefer beats > durationBeats > duration > bars > len > count > dur
      var beats = null;
      var bars = null;
      if (item.beats != null) beats = Number(item.beats);
      else if (item.durationBeats != null) beats = Number(item.durationBeats);
      else if (item.duration_beats != null) beats = Number(item.duration_beats);
      else if (item.duration != null) beats = Number(item.duration);
      else if (item.durationInBeats != null) beats = Number(item.durationInBeats);
      else if (item.numBeats != null) beats = Number(item.numBeats);
      else if (item.beatCount != null) beats = Number(item.beatCount);
      else if (item.lengthBeats != null) beats = Number(item.lengthBeats);
      else if (item.lenBeats != null) beats = Number(item.lenBeats);
      else if (item.len != null) beats = Number(item.len);
      else if (item.dur != null) beats = Number(item.dur);
      else if (item.count != null) beats = Number(item.count) * beatsPerBar;
      else if (typeof item.length === 'string') beats = parseDurationToken_(String(item.length), beatsPerBar);
      else if (typeof item.durationStr === 'string') beats = parseDurationToken_(String(item.durationStr), beatsPerBar);
      // Bars/measures fields
      if (item.bars != null) bars = Number(item.bars);
      else if (item.durationBars != null) bars = Number(item.durationBars);
      else if (item.durationInBars != null) bars = Number(item.durationInBars);
      else if (item.measures != null) bars = Number(item.measures);
      else if (item.numBars != null) bars = Number(item.numBars);
      if ((beats == null || isNaN(beats)) && bars != null) beats = bars * beatsPerBar;
      if (beats == null || isNaN(beats)) beats = beatsPerBar;
      out.push({ symbol: String(sym), beats: beats });
    }
  });
  return out;
}

/** Determine beats-per-bar from time signature (supports X/Y; converts to quarter-note beats). */
function getBeatsPerBar_(obj){
  var ts = (obj && obj.meta && (obj.meta.timeSignature || obj.meta.ts)) || obj.timeSignature || obj.ts || '4/4';
  if (typeof ts === 'string'){
    var m = ts.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (m){
      var num = Number(m[1]), den = Number(m[2]);
      if (num > 0 && den > 0) return Math.max(1, Math.round(num * (4/den)));
    }
  }
  if (typeof ts === 'object' && ts){
    var n = Number(ts.n || ts.numerator || ts.top || ts.beats || 0);
    var d = Number(ts.d || ts.denominator || ts.bottom || ts.unit || 4);
    if (n > 0 && d > 0) return Math.max(1, Math.round(n * (4/d)));
  }
  return 4;
}

/** Parse a duration token into beats. Supports numbers (beats), fractions (bars), and units: b/beat(s), bar(s), measure(s). */
function parseDurationToken_(token, beatsPerBar){
  var t = String(token || '').trim();
  if (!t) return null;
  // Units
  var unitsMatch = t.match(/^(\d+(?:\.\d+)?)(\s*(?:b|beat|beats))$/i);
  if (unitsMatch) return Number(unitsMatch[1]);
  var barsMatch = t.match(/^(\d+(?:\.\d+)?)(\s*(?:bar|bars|measure|measures))$/i);
  if (barsMatch) return Number(barsMatch[1]) * beatsPerBar;
  // Fraction implies bars (e.g., 1/2 = half bar)
  var frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    var a = Number(frac[1]), b = Number(frac[2]);
    if (a > 0 && b > 0) return beatsPerBar * (a / b);
  }
  // Plain number -> beats
  var num = Number(t);
  if (!isNaN(num)) return num;
  return null;
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

/** Import lyrics CSV (Beatles dataset) into Lyrics sheet. Expected columns: title,album,year,lyrics,cover,songwriters_parsed,vocals_parsed */
function importLyricsCsvRaw(csvText){
  var rows = parseCsvLoose_(String(csvText||''));
  if (!rows.length) return 'No rows.';
  var header = rows[0].map(function(h){ return String(h||'').trim().toLowerCase(); });
  var idx = function(name){ var i = header.indexOf(name); return i >= 0 ? i : -1; };
  var iTitle = idx('title'), iAlbum = idx('album'), iYear = idx('year'), iLyrics = idx('lyrics');
  if (iTitle < 0 || iLyrics < 0) throw new Error('CSV missing required columns: title, lyrics');

  var data = getSheetData('Lyrics');
  var existing = {};
  data.forEach(function(r){ if (r.title) existing[r.title.toLowerCase()] = true; });
  var added = 0, updated = 0;
  for (var r=1;r<rows.length;r++){
    var row = rows[r]; if (!row || !row.length) continue;
    var title = String(row[iTitle]||'').trim(); if (!title) continue;
    var cleanedTitle = cleanTitleFromHint_(title);
    var entry = {
      title: title, // keep original in Lyrics sheet
      album: iAlbum>=0 ? String(row[iAlbum]||'').trim() : '',
      year: iYear>=0 ? Number(row[iYear]||'')||'' : '',
      lyrics: iLyrics>=0 ? String(row[iLyrics]||'') : ''
    };
  // Ensure canonical song record and alias
  var resolvedId = resolveSongIdByHint_(title);
  var canonicalId = resolvedId || deriveSongIdFromHint_(title);
  ensureSongRecord_(canonicalId, cleanedTitle, entry.album, entry.year);
  addSongAlias_(normalizeTitleSlug_(cleanedTitle), canonicalId, 'lyrics');
    var idxExisting = data.findIndex(function(d){ return (d.title||'').toLowerCase() === title.toLowerCase(); });
    if (idxExisting >= 0) { data[idxExisting] = entry; updated++; }
    else { data.push(entry); added++; }
  }
  setSheetData('Lyrics', data, ['title','album','year','lyrics']);
  return 'Lyrics: added ' + added + ', updated ' + updated + '.';
}

/** Import chord annotations from .lab (start end label per line) into Annotations sheet. */
function importChordLabRaw(labText, songIdHint){
  var lines = String(labText||'').split(/\r?\n/).filter(function(l){ return l && /\S/.test(l); });
  var entries = [];
  lines.forEach(function(line){
    var parts = line.trim().split(/\s+/);
    if (parts.length >= 3){
      var start = Number(parts[0]), end = Number(parts[1]);
      var label = parts.slice(2).join(' ');
      if (!isNaN(start) && !isNaN(end)) entries.push({ start, end, label });
    }
  });
  if (!entries.length) throw new Error('No LAB entries parsed');
  var songTitle = cleanTitleFromHint_(prettyTitleFromHint_(songIdHint || ''));
  var songId = resolveSongIdByHint_(songIdHint) || deriveSongIdFromHint_(songIdHint || 'song');
  ensureSongRecord_(songId, songTitle, '', '');
  addSongAlias_(normalizeTitleSlug_(songTitle), songId, 'lab');
  var data = getSheetData('Annotations').filter(function(r){ return r.songId !== songId; });
  entries.forEach(function(e, idx){
    data.push({ songId: songId, index: idx+1, start: e.start, end: e.end, label: e.label });
  });
  setSheetData('Annotations', data, ['songId','index','start','end','label']);
  return 'Annotations saved for ' + songId + ' (' + entries.length + ' items).';
}

// Simple CSV parser tolerant of quoted fields and commas in quotes
function parseCsvLoose_(text){
  var rows = [], row = [], i = 0, s = String(text||''), inQ = false, cur = '';
  while (i < s.length){
    var ch = s[i++];
    if (inQ){
      if (ch === '"'){
        if (s[i] === '"'){ cur += '"'; i++; }
        else { inQ = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch === '\r') { /* ignore */ }
      else { cur += ch; }
    }
  }
  row.push(cur); rows.push(row);
  return rows;
}

/** Try to resolve an imported file hint to an existing Song_Library songId. */
function resolveSongIdByHint_(hint){
  var h = String(hint||'');
  if (!h) return null;
  var safe = makeSafeId_(h);
  var normTitle = normalizeTitleSlug_(prettyTitleFromHint_(h));
  // Aliases first
  var aliases = getSheetData('Song_Aliases');
  var aliasRow = aliases.find(function(a){ return String(a.alias||'') === normTitle; });
  if (aliasRow && aliasRow.songId) return aliasRow.songId;
  var lib = getSheetData('Song_Library');
  // 1) exact id match
  var row = lib.find(function(r){ return (r.songId||'') === safe; });
  if (row) return row.songId;
  // 2) id contains normalized title slug (handles extra suffix like _jcrd)
  row = lib.find(function(r){ var id = String(r.songId||''); return id.indexOf(normTitle) >= 0; });
  if (row) return row.songId;
  // 3) match by normalized title column
  row = lib.find(function(r){ var t = normalizeTitleSlug_(String(r.title||'')); return t === normTitle; });
  if (row) return row.songId;
  return null;
}

function normalizeTitleSlug_(s){
  var t = String(s||'').toLowerCase();
  // remove album/track numeric prefixes like "01 - ", "01_-_", etc.
  t = t.replace(/^\s*\d+\s*[-_.]+\s*/,'');
  // normalize separators
  t = t.replace(/[\s_\-]+/g,' ');
  // strip punctuation
  t = t.replace(/[^a-z0-9 ]+/g,'');
  // collapse and trim
  t = t.trim().replace(/\s+/g,'_');
  return t;
}

/** Produce a human title from hint: removes leading numbers and album prefixes, normalizes spaces and capitalization. */
function cleanTitleFromHint_(s){
  var raw = String(s||'');
  if (!raw) return '';
  // Replace underscores/dashes with spaces for readability
  var t = raw.replace(/[\-_]+/g, ' ').replace(/\s+/g,' ').trim();
  // Strip leading track numbers (e.g., "01 - ", "01. ", "01 ")
  t = t.replace(/^\s*\d+\s*[\-_. ]+\s*/, '');
  // If pattern like album 01 title -> keep from the numeric index onward
  var m = t.match(/^(.*?)\s+\d+\s+(.*)$/);
  if (m && m[2]) t = m[2];
  // Title case light: keep common small words lower
  var small = { a:1, an:1, the:1, and:1, or:1, but:1, for:1, nor:1, of:1, on:1, in:1, to:1, vs:1 };
  t = t.split(' ').map(function(w,i){
    var lw = w.toLowerCase();
    if (i>0 && small[lw]) return lw;
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(' ');
  return t;
}

/** Derive a canonical songId from a hint or title by stripping album/track indices. */
function deriveSongIdFromHint_(hint){
  var slug = normalizeTitleSlug_(hint || 'song');
  if (!slug) return 'song';
  var parts = slug.split('_').filter(Boolean);
  if (!parts.length) return 'song';
  // Remove any leading purely-numeric tokens (e.g., 01_)
  while (parts.length && /^\d+$/.test(parts[0])) parts.shift();
  if (!parts.length) return 'song';
  // If pattern like: album_01_title... -> keep title...
  if (parts.length >= 3 && /^\d+$/.test(parts[1])){
    var tail = parts.slice(2).join('_');
    if (tail) return tail;
  }
  // If pattern like: 01_album_01_title..., redundant guard (already shifted)
  if (parts.length >= 3 && /^\d+$/.test(parts[0])){
    var tail2 = parts.slice(2).join('_');
    if (tail2) return tail2;
  }
  return parts.join('_');
}

/** Create a minimal Song_Library row if missing. */
function ensureSongRecord_(songId, title, album, year){
  var lib = getSheetData('Song_Library');
  if (!lib.find(function(r){ return r.songId === songId; })){
    lib.push({
      songId: songId,
  title: title || prettyTitleFromHint_(songId),
  artist: getDefaultArtist_() || '',
      bpm: '',
      key: '',
      mode: '',
      timeSignature: '4/4',
      tags: album ? ('album:' + album) : '',
      notes: ''
    });
    setSheetData('Song_Library', lib, ['songId','title','artist','bpm','key','mode','timeSignature','tags','notes']);
  }
}

/** Add or update an alias mapping alias -> songId. */
function addSongAlias_(alias, songId, source){
  alias = String(alias||''); if (!alias) return;
  var rows = getSheetData('Song_Aliases');
  var idx = rows.findIndex(function(r){ return String(r.alias||'') === alias; });
  if (idx >= 0){ rows[idx].songId = songId; rows[idx].source = source || rows[idx].source || ''; }
  else { rows.push({ alias: alias, songId: songId, source: source || '' }); }
  setSheetData('Song_Aliases', rows, ['alias','songId','source']);
}

/** Get master source for a song (json|midi|lab|manual), or '' if none. */
function getSongMaster_(songId){
  var rows = getSheetData('Song_Masters');
  var r = rows.find(function(x){ return x.songId === songId; });
  return r ? (r.masterSource || '') : '';
}

/** Set master source for a song. */
function setSongMaster(songId, source){
  var rows = getSheetData('Song_Masters');
  var idx = rows.findIndex(function(x){ return x.songId === songId; });
  if (idx >= 0) { rows[idx].masterSource = source; }
  else { rows.push({ songId: songId, masterSource: source, lockedFields: '' }); }
  setSheetData('Song_Masters', rows, ['songId','masterSource','lockedFields']);
  return 'Master set to ' + source + ' for ' + songId;
}

/** Save song while respecting master policy. If another master exists, don't overwrite sections/arrangement; fill meta only if empty. */
function saveSongRespectingMaster_(songData, source){
  var master = getSongMaster_(songData.songId);
  var allowFull = !master || master === source;
  if (allowFull) {
    saveSong(songData);
    if (!master) setSongMaster(songData.songId, source);
    return;
  }
  // Merge: keep existing sections/arrangements; update meta only if fields empty
  var songLib = getSheetData('Song_Library');
  var idxLib = songLib.findIndex(function(r){ return r.songId === songData.songId; });
  var existing = idxLib >= 0 ? songLib[idxLib] : null;
  var mergedMeta = {
    songId: songData.songId,
    title: (existing && existing.title) || songData.meta.title,
    artist: (existing && existing.artist) || songData.meta.artist || '',
    bpm: (existing && existing.bpm) || songData.meta.bpm || '',
    key: (existing && existing.key) || songData.meta.key || '',
    mode: (existing && existing.mode) || songData.meta.mode || '',
    timeSignature: (existing && existing.timeSignature) || songData.meta.timeSignature || '4/4',
    tags: (existing && existing.tags) || (Array.isArray(songData.meta.tags) ? songData.meta.tags.join(', ') : ''),
    notes: (existing && existing.notes) || songData.meta.notes || ''
  };
  if (idxLib >= 0) songLib[idxLib] = mergedMeta; else songLib.push(mergedMeta);
  setSheetData('Song_Library', songLib, ['songId','title','artist','bpm','key','mode','timeSignature','tags','notes']);

  // Preserve existing sections/arrangement for non-master
  // Only set sections/arrangement if none exist yet for this song
  var existingSections = getSheetData('Song_Sections').filter(function(s){ return s.songId === songData.songId; });
  if (!existingSections.length && songData.sections && songData.sections.length){
    const sectionHeaders = ['songId','sectionId','sectionName','lengthBars','chords','lyricsRef','notes'];
    let sectionsAll = getSheetData('Song_Sections').filter(function(s){ return s.songId !== songData.songId; });
    songData.sections.forEach(function(sec){
      sectionsAll.push({ songId: songData.songId, sectionId: sec.sectionId, sectionName: sec.sectionName, lengthBars: sec.lengthBars, chords: JSON.stringify(sec.chords), lyricsRef: sec.lyricsRef || '', notes: sec.notes || '' });
    });
    setSheetData('Song_Sections', sectionsAll, sectionHeaders);
  }
  var existingArr = getSheetData('Arrangements').filter(function(a){ return a.songId === songData.songId; });
  if (!existingArr.length && songData.arrangement && songData.arrangement.length){
    const arrangementHeaders = ['songId','arrangementIndex','sectionId','startBar','repeat','sceneRef','macroRef'];
    let arrAll = getSheetData('Arrangements').filter(function(a){ return a.songId !== songData.songId; });
    songData.arrangement.forEach(function(item){
      arrAll.push({ songId: songData.songId, arrangementIndex: item.arrangementIndex, sectionId: item.sectionId, startBar: item.startBar, repeat: item.repeat || 1, sceneRef: item.sceneRef || '', macroRef: item.macroRef || '' });
    });
    setSheetData('Arrangements', arrAll, arrangementHeaders);
  }
}
