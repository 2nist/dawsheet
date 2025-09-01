// SongService.gs
// Read/write song data from Google Sheets and assemble to structured objects.

/** Read all rows from a sheet into objects, assuming first row is headers. */
function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (!values.length || !values[0].length) return [];
  var headers = values[0].map(function (h) {
    return String(h).trim();
  });
  var data = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) row[headers[j]] = values[i][j];
    data.push(row);
  }
  return data;
}

/** Write array of objects to a sheet, overwriting contents. */
function setSheetData(sheetName, data, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  if (!headers && data && data.length > 0) headers = Object.keys(data[0]);
  if (!headers) {
    sheet.clearContents();
    return;
  }
  var values = [headers];
  data.forEach(function (obj) {
    var row = headers.map(function (h) {
      var v = obj[h];
      if (v && typeof v === "object") return JSON.stringify(v);
      return v;
    });
    values.push(row);
  });
  sheet.clearContents();
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

/** Assemble full songs array from Song_Library, Song_Sections, Arrangements sheets. */
function getSongs() {
  var songLibraryData = getSheetData("Song_Library");
  var songSectionsData = getSheetData("Song_Sections");
  var arrangementsData = getSheetData("Arrangements");
  var songs = [];
  songLibraryData.forEach(function (songMeta) {
    var songId = songMeta.songId;
    var sections = songSectionsData
      .filter(function (s) {
        return s.songId === songId;
      })
      .map(function (s) {
        try {
          s.chords = s.chords ? JSON.parse(s.chords) : [];
        } catch (e) {
          s.chords = [];
        }
        return s;
      });
    var arrangement = arrangementsData
      .filter(function (a) {
        return a.songId === songId;
      })
      .sort(function (a, b) {
        return Number(a.arrangementIndex) - Number(b.arrangementIndex);
      });
    var song = {
      v: 1,
      songId: songId,
      meta: {
        title: songMeta.title,
        artist: songMeta.artist || "",
        bpm: parseFloat(songMeta.bpm),
        key: songMeta.key,
        mode: songMeta.mode || "",
        timeSignature: songMeta.timeSignature || "4/4",
        tags: songMeta.tags
          ? String(songMeta.tags)
              .split(",")
              .map(function (t) {
                return t.trim();
              })
              .filter(Boolean)
          : [],
        notes: songMeta.notes || "",
      },
      sections: sections,
      arrangement: arrangement,
      commands_ref: [],
    };
    var v = validateData(SONG_SCHEMA, song);
    if (!v.isValid)
      throw new Error("Invalid song '" + songId + "': " + v.errors.join("; "));
    songs.push(song);
  });
  return songs;
}

/** Get single song by id. */
function getSong(songId) {
  var songs = getSongs();
  var s = songs.find(function (x) {
    return x.songId === songId;
  });
  if (!s) throw new Error("Song '" + songId + "' not found.");
  return s;
}

/** Save/update a song to the three sheets. */
function saveSong(songData) {
  var v = validateData(SONG_SCHEMA, songData);
  if (!v.isValid) throw new Error("Invalid song: " + v.errors.join("; "));
  // Song_Library
  var songMetaHeaders = [
    "songId",
    "title",
    "artist",
    "bpm",
    "key",
    "mode",
    "timeSignature",
    "tags",
    "notes",
  ];
  var songLib = getSheetData("Song_Library");
  var row = {
    songId: songData.songId,
    title: songData.meta.title,
    artist: songData.meta.artist || "",
    bpm: songData.meta.bpm,
    key: songData.meta.key,
    mode: songData.meta.mode || "",
    timeSignature: songData.meta.timeSignature || "4/4",
    tags: Array.isArray(songData.meta.tags)
      ? songData.meta.tags.join(", ")
      : "",
    notes: songData.meta.notes || "",
  };
  var idx = songLib.findIndex(function (r) {
    return r.songId === songData.songId;
  });
  if (idx >= 0) songLib[idx] = row;
  else songLib.push(row);
  setSheetData("Song_Library", songLib, songMetaHeaders);

  // Song_Sections
  var sectionHeaders = [
    "songId",
    "sectionId",
    "sectionName",
    "lengthBars",
    "chords",
    "lyricsRef",
    "notes",
  ];
  var sections = getSheetData("Song_Sections").filter(function (s) {
    return s.songId !== songData.songId;
  });
  songData.sections.forEach(function (sec) {
    sections.push({
      songId: songData.songId,
      sectionId: sec.sectionId,
      sectionName: sec.sectionName,
      lengthBars: sec.lengthBars,
      chords: JSON.stringify(sec.chords),
      lyricsRef: sec.lyricsRef || "",
      notes: sec.notes || "",
    });
  });
  setSheetData("Song_Sections", sections, sectionHeaders);

  // Arrangements
  var arrangementHeaders = [
    "songId",
    "arrangementIndex",
    "sectionId",
    "startBar",
    "repeat",
    "sceneRef",
    "macroRef",
  ];
  var arr = getSheetData("Arrangements").filter(function (a) {
    return a.songId !== songData.songId;
  });
  songData.arrangement.forEach(function (item) {
    arr.push({
      songId: songData.songId,
      arrangementIndex: item.arrangementIndex,
      sectionId: item.sectionId,
      startBar: item.startBar,
      repeat: item.repeat || 1,
      sceneRef: item.sceneRef || "",
      macroRef: item.macroRef || "",
    });
  });
  setSheetData("Arrangements", arr, arrangementHeaders);
}

/** Ensure Song_Library, Song_Sections, Arrangements sheets exist with headers. */
function ensureSongSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var def = {
    'Song_Library': ['songId','title','artist','bpm','key','mode','timeSignature','tags','notes'],
    'Song_Sections': ['songId','sectionId','sectionName','lengthBars','chords','lyricsRef','notes'],
    'Arrangements': ['songId','arrangementIndex','sectionId','startBar','repeat','sceneRef','macroRef']
  };
  Object.keys(def).forEach(function(name){
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = def[name];
    var first = sh.getRange(1,1,1,headers.length).getValues()[0];
    var mismatch = false;
    for (var i=0;i<headers.length;i++){ if (first[i] !== headers[i]) { mismatch = true; break; } }
    if (mismatch) sh.getRange(1,1,1,headers.length).setValues([headers]);
  });
}

/** Create a demo song across the three tabs if it doesn't exist yet. */
function createSampleSong() {
  ensureSongSheets_();
  var songId = 'song_demo_1';
  var lib = getSheetData('Song_Library');
  if (lib.some(function(r){ return r.songId === songId; })) {
    return { ok: true, songId: songId, created: false, reason: 'exists' };
  }
  var demo = {
    v: 1,
    songId: songId,
    meta: { title: 'Demo Song', artist: 'DAWSheet', bpm: 100, key: 'C', mode: 'Ionian', timeSignature: '4/4', tags: ['demo','test'], notes: '' },
    sections: [
      { songId: songId, sectionId: 'V1', sectionName: 'Verse', lengthBars: 4, chords: [
        { symbol: 'Cmaj7', beats: 4 }, { symbol: 'F7', beats: 4 }
      ], lyricsRef: '', notes: '' },
      { songId: songId, sectionId: 'C1', sectionName: 'Chorus', lengthBars: 4, chords: [
        { symbol: 'Am7', beats: 4 }, { symbol: 'G7', beats: 4 }
      ], lyricsRef: '', notes: '' }
    ],
    arrangement: [
      { songId: songId, arrangementIndex: 1, sectionId: 'V1', startBar: 1, repeat: 1 },
      { songId: songId, arrangementIndex: 2, sectionId: 'C1', startBar: 5, repeat: 1 }
    ],
    commands_ref: []
  };
  saveSong(demo);
  return { ok: true, songId: songId, created: true };
}
