// Importers.gs
// Import external song formats into the DAWSheet Song Library.

/**
 * Import a JCRD-style JSON chord file (as text) and save as a Song.
 * Returns a short status string.
 *
 * @param {string} jsonText
 * @returns {string}
 */
function importJcrdJson(jsonText) {
  if (!jsonText || typeof jsonText !== 'string') throw new Error('No JSON provided');
  let obj;
  try { obj = JSON.parse(jsonText); } catch (e) { throw new Error('Invalid JSON: ' + e.message); }
  const song = convertJcrdToSong_(obj);
  const { isValid, errors } = validateData(SONG_SCHEMA, song);
  if (!isValid) throw new Error('Converted song invalid: ' + errors.join('; '));
  saveSong(song);
  return `Imported '${song.meta.title}' (${song.songId}) with ${song.sections.length} section(s).`;
}

/**
 * Convert JCRD data structure to DAWSheet Song object.
 * Expected fields: metadata { title, artist, tempo, key, time_signature, tags }, sections[{ name, start_time, end_time, chords[] }]
 * @param {any} src
 * @returns {any} Song object per SONG_SCHEMA
 */
function convertJcrdToSong_(src) {
  const md = src && src.metadata ? src.metadata : {};
  const title = String(md.title || 'Untitled');
  const artist = String(md.artist || '');
  const bpm = Number(md.tempo || 120);
  const timeSig = String(md.time_signature || '4/4');
  const keyRaw = String(md.key || '').trim();
  const key = keyRaw.replace(/^Key\s*/i, '') || '';
  const tags = Array.isArray(md.tags) ? md.tags.map(t => String(t)) : [];

  const [beatsPerBarStr] = timeSig.split('/')
  const beatsPerBar = Math.max(1, parseInt(beatsPerBarStr || '4', 10));
  const secToBeats = (sec) => (Number(sec || 0) * bpm) / 60;

  // Build sections
  const sectionsIn = Array.isArray(src.sections) ? src.sections : [];
  const idCounter = {};
  let totalBeatsSoFar = 0; // to compute arrangement startBar
  const sectionsOut = [];
  const arrangementOut = [];

  sectionsIn.forEach((s, idx) => {
    const name = String(s.name || ('section'+(idx+1)));
    const durSec = Math.max(0, Number(s.end_time || 0) - Number(s.start_time || 0));
    const durBeats = secToBeats(durSec);
    const lengthBars = durBeats / beatsPerBar; // can be fractional

    // unique sectionId from name
    const base = slug_(name);
    idCounter[base] = (idCounter[base] || 0) + 1;
    const sectionId = `${base}${idCounter[base] > 1 ? ('_'+idCounter[base]) : ''}`;

    const chordsIn = Array.isArray(s.chords) ? s.chords : [];
    const chordsOut = chordsIn.map((c) => {
      const cdur = Math.max(0, Number(c.end_time || 0) - Number(c.start_time || 0));
      let beats = secToBeats(cdur);
      if (!(beats > 0)) beats = 0.25; // clamp to schema minimum
      return { symbol: String(c.chord || 'N'), beats: beats };
    });

    sectionsOut.push({
      sectionId,
      sectionName: name,
      lengthBars,
      chords: chordsOut,
      lyricsRef: '',
      notes: ''
    });

    // Arrangement entry
    const startBar = Math.floor(totalBeatsSoFar / beatsPerBar) + 1;
    arrangementOut.push({
      arrangementIndex: arrangementOut.length + 1,
      sectionId,
      startBar,
      repeat: 1,
      sceneRef: '',
      macroRef: ''
    });
    totalBeatsSoFar += durBeats;
  });

  const songId = slug_(`${artist ? artist+'-' : ''}${title}`) || ('song_'+Date.now());
  return {
    v: 1,
    songId,
    meta: {
      title,
      artist,
      bpm,
      key,
      mode: '',
      timeSignature: timeSig,
      tags,
      notes: md.source ? `Source: ${md.source}` : ''
    },
    sections: sectionsOut,
    arrangement: arrangementOut,
    commands_ref: []
  };
}

function slug_(s) { return String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

// Placeholders for future formats
function importMidi(fileBase64) { throw new Error('MIDI import not implemented yet'); }
function importJams(jsonText) { throw new Error('JAMS import not implemented yet'); }
function importXlab(text) { throw new Error('XLAB import not implemented yet'); }
function importXml(text) { throw new Error('XML import not implemented yet'); }
