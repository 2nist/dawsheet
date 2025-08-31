// SongService.gs
// Read/write song data from Google Sheets and assemble to structured objects.

/** Read all rows from a sheet into objects, assuming first row is headers. */
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    console.warn(`Sheet '${sheetName}' not found.`);
    return [];
  }
  const values = sheet.getDataRange().getValues();
  if (!values.length || !values[0].length) return [];
  const headers = values[0].map(h => String(h).trim());
  const data = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    headers.forEach((h, idx) => row[h] = values[i][idx]);
    data.push(row);
  }
  return data;
}

/** Write array of objects to a sheet, overwriting contents. */
function setSheetData(sheetName, data, headers = null) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
  if (!headers && data.length > 0) headers = Object.keys(data[0]);
  if (!headers) { sheet.clearContents(); return; }
  const values = [headers];
  data.forEach(obj => {
    const row = headers.map(h => {
      const v = obj[h];
      if (v && typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    values.push(row);
  });
  sheet.clearContents();
  sheet.getRange(1,1,values.length, headers.length).setValues(values);
}

/** Assemble full songs object array from Song_Library, Song_Sections, Arrangements sheets. */
function getSongs() {
  const songLibraryData = getSheetData('Song_Library');
  const songSectionsData = getSheetData('Song_Sections');
  const arrangementsData = getSheetData('Arrangements');

  const songs = [];
  songLibraryData.forEach(songMeta => {
    const songId = songMeta.songId;
    const sections = songSectionsData.filter(s => s.songId === songId).map(s => {
      try { s.chords = s.chords ? JSON.parse(s.chords) : []; } catch (e) { s.chords = []; }
      return s;
    });
    const arrangement = arrangementsData.filter(a => a.songId === songId)
      .sort((a,b) => a.arrangementIndex - b.arrangementIndex);
    const song = {
      v: 1,
      songId,
      meta: {
        title: songMeta.title,
        artist: songMeta.artist || '',
        bpm: parseFloat(songMeta.bpm),
        key: songMeta.key,
        mode: songMeta.mode || '',
        timeSignature: songMeta.timeSignature || '4/4',
        tags: songMeta.tags ? String(songMeta.tags).split(',').map(t=>t.trim()).filter(Boolean) : [],
        notes: songMeta.notes || ''
      },
      sections,
      arrangement,
      commands_ref: []
    };
    const { isValid, errors } = validateData(SONG_SCHEMA, song);
    if (!isValid) throw new Error(`Invalid song '${songId}': ${errors.join('; ')}`);
    songs.push(song);
  });
  return songs;
}

/** Get single song by id. */
function getSong(songId) {
  const songs = getSongs();
  const s = songs.find(x => x.songId === songId);
  if (!s) throw new Error(`Song '${songId}' not found.`);
  return s;
}

/** Save/update a song to the three sheets. */
function saveSong(songData) {
  const { isValid, errors } = validateData(SONG_SCHEMA, songData);
  if (!isValid) throw new Error(`Invalid song: ${errors.join('; ')}`);
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
