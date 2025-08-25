/**
 * DAWSheet — Import Hub (menu + server endpoints)
 */

function registerImportMenu_(){ try{
  SpreadsheetApp.getUi().createMenu('DAWSheet — Import')
    .addItem('Open Import Hub', 'openImportHub')
    .addToUi();
}catch(e){}}

function openImportHub(){
  const html = HtmlService.createTemplateFromFile('UiImport')
    .evaluate()
    .setTitle('DAWSheet Import Hub')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ===== JSON chord adapter entrypoint =====
function importChordJsonToSheets(jsonObj, songIdHint) {
  const song = jsonChordToSong_(jsonObj, songIdHint);
  saveSong(song);
  upsertAttribution_(song.songId, {
    source: String(jsonObj.metadata?.source || 'unknown'),
    license: String(jsonObj.metadata?.license || ''),
    url: String(jsonObj.metadata?.url || ''),
    checksum: md5_(JSON.stringify(jsonObj))
  });
  return { ok:true, songId: song.songId, wrote: ['Song_Library','Song_Sections','Arrangements','Dataset_Attribution'] };
}

// ===== MIDI adapter stub (server side) =====
function importMidiJsonToSheets(midiReduced, opts) {
  const song = midiReducedToSong_(midiReduced, opts || {});
  saveSong(song);
  upsertAttribution_(song.songId, { source:'midi', license:'', url:'', checksum: sha1_(JSON.stringify(midiReduced)) });
  return { ok:true, songId: song.songId, wrote: ['Song_Library','Song_Sections','Arrangements','Dataset_Attribution'] };
}

/**
 * Import chord JSON from a URL (server-side fetch; no modules required in the client).
 * @param {string} url
 * @param {string|null} songIdHint
 */
function importChordJsonFromUrl(url, songIdHint) {
  const u = String(url || '');
  if (!/^https?:\/\//i.test(u)) throw new Error('Must be http(s) URL.');
  const res = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true, headers: { 'Accept': 'application/json' } });
  const code = res.getResponseCode();
  if (code >= 400) throw new Error('Fetch failed: HTTP ' + code);
  const text = res.getContentText();
  let obj;
  try { obj = JSON.parse(text); }
  catch (e) { throw new Error('Fetched content is not valid JSON.'); }
  return importChordJsonToSheets(obj, songIdHint || null);
}

// ===== Utilities =====
function upsertAttribution_(songId, attrs){
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Dataset_Attribution');
  if (!sh) {
    sh = ss.insertSheet('Dataset_Attribution');
    sh.getRange(1,1,1,5).setValues([[ 'songId','source','license','url','checksum' ]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  const vals = sh.getDataRange().getValues();
  const map = {}; for (let i=1;i<vals.length;i++){ map[String(vals[i][0])] = i+1; }
  const row = map[songId] || (Math.max(2, sh.getLastRow()+1));
  sh.getRange(row,1,1,5).setValues([[ songId, attrs.source||'', attrs.license||'', attrs.url||'', attrs.checksum||'' ]]);
}

function sha1_(s){ return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, s).map(b=>('0'+(b&0xFF).toString(16)).slice(-2)).join(''); }
function md5_(s){ return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s).map(b=>('0'+(b&0xFF).toString(16)).slice(-2)).join(''); }

// Import from URL (JSON only for now)
function fetchJsonFromUrl(url){
  if (!/^https?:\/\//i.test(String(url||''))) throw new Error('Invalid URL');
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions:true, followRedirects:true, headers:{ 'Accept':'application/json' }});
  const code = res.getResponseCode(); if (code >= 400) throw new Error('Fetch failed: HTTP '+code);
  const text = res.getContentText();
  try{ return JSON.parse(text); } catch(e){ throw new Error('Response is not valid JSON'); }
}

// Optional: preview hooks to existing compilers
function previewCommandsForSong(songId, channel){
  const ch = String(channel||'1');
  const cmds = songToCommands(songId, ch);
  return { count: cmds.length, sample: cmds.slice(0, 8) };
}

/** Generate CHORD.PLAY trigger rows from a Song and append to 'Triggers' sheet. */
function generateTriggersForSong(songId, opts) {
  const song = getSong(songId); // from SongService.gs
  const rows = songToTriggerRows_(song, opts || {});
  const wrote = appendTriggersRows_(rows);
  return { ok:true, songId, wrote };
}

/** Build Triggers rows: [Enabled, When, Type, Track/Target, Key, Value, Duration, Extra, Section, Id, Meta] */
function songToTriggerRows_(song, opts) {
  const ts = String(song.meta.timeSignature || '4/4');
  const beatsPerBar = Number(ts.split('/')[0]) || 4;

  // Simple TrackMap resolver: first row is default if no name provided
  function resolveTargetFromTrackMap_(trackNameOrNull){
    const tm = SpreadsheetApp.getActive().getSheetByName('TrackMap');
    if (!tm) return { target: 'default', ch: 1 };
    const vals = tm.getDataRange().getValues();
    if (!vals.length) return { target: 'default', ch: 1 };
    const hdr = vals[0];
    const body = vals.slice(1);
    const nameIdx = hdr.findIndex(h => String(h).toLowerCase() === 'track');
    const targetIdx = hdr.findIndex(h => String(h).toLowerCase() === 'target');
    const chIdx = hdr.findIndex(h => String(h).toLowerCase() === 'channel');
    let row = body[0];
    if (trackNameOrNull && nameIdx >= 0) {
      const r = body.find(v => String(v[nameIdx]) === String(trackNameOrNull));
      if (r) row = r;
    }
    const target = row && targetIdx >= 0 ? String(row[targetIdx] || 'default') : 'default';
    const ch = row && chIdx >= 0 ? Number(row[chIdx] || 1) : 1;
    return { target, ch };
  }

  // Index sections by id
  const secById = {};
  (song.sections || []).forEach(s => secById[s.sectionId] = s);

  const rows = [];
  (song.arrangement || []).forEach((item) => {
    const sec = secById[item.sectionId];
    if (!sec) return;
    const startBar = Number(item.startBar || 1);
    const repeats = Math.max(1, Number(item.repeat || 1));
    const sectionLabel = String(sec.sectionName || item.sectionId);
    const trackHint = sec.track || null;
    const { target, ch } = resolveTargetFromTrackMap_(trackHint);

    for (let r = 0; r < repeats; r++) {
      let bar = startBar + r * Number(sec.lengthBars || 0);
      let beat = 1;

      (sec.chords || []).forEach((c, idx) => {
        const symbol = String(c.symbol || 'N.C.');
        const when = `${bar}:${beat}`;
        const id = `song_${song.songId}_sec_${sec.sectionId}_r${r+1}_ch${idx+1}`;
        const extra = `channel:${ch}`;

        rows.push([
          true,                 // Enabled
          when,                 // When
          'CHORD.PLAY',         // Type
          target,               // Track/Target
          symbol,               // Key (chord symbol)
          '',                   // Value/Args (none for chord play)
          '',                   // Duration (not needed)
          extra,                // Extra (channel)
          sectionLabel,         // Section
          id,                   // Id
          ''                    // Meta
        ]);

        // advance beat/bar by chord length in beats
        const lenBeats = Math.max(1, Number(c.beats || beatsPerBar));
        const totalBeats = (beat - 1) + lenBeats;
        bar += Math.floor(totalBeats / beatsPerBar);
        beat = (totalBeats % beatsPerBar) + 1;
      });
    }
  });

  return rows;
}

/** Append to Triggers sheet, create header if missing. */
function appendTriggersRows_(rows) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Triggers');
  if (!sh) {
    sh = ss.insertSheet('Triggers');
    sh.getRange(1,1,1,11).setValues([[
      'Enabled','When','Trigger','Track/Target','Note/CC/Addr','Value/Args','Duration','Extra','Section','Id','Meta'
    ]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  if (!rows.length) return 0;
  const start = sh.getLastRow() + 1;
  sh.getRange(start, 1, rows.length, 11).setValues(rows);
  return rows.length;
}
