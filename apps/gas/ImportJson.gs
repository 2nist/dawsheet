// ImportJson.gs — Isophonics-style chord JSON adapter

function jsonChordToSong_(jsonObj, songIdHint){
  const md = jsonObj.metadata || {};
  const bpm = Number(md.tempo || 120);
  const ts  = String(md.time_signature || '4/4');
  const beatsPerBar = Number((ts.split('/')[0] || '4')) || 4;
  const spb = 60 / bpm; // seconds per beat

  const secToBarBeat = (sec) => {
    const beats = sec / spb;
    const bar = Math.floor(beats / beatsPerBar) + 1;
    const beat = Math.floor(beats % beatsPerBar) + 1;
    return { bar, beat };
  };

  // Build sections
  const sections = (jsonObj.sections || []).map((s, i) => {
    const lenBars = Math.max(1, Math.round(((Number(s.end_time)||0) - (Number(s.start_time)||0)) / (spb * beatsPerBar)));
    const chords = (s.chords || []).map(c=>{
      const dBeats = Math.max(1, Math.round(((Number(c.end_time)||0) - (Number(c.start_time)||0))/spb));
      return { symbol: String(c.chord), beats: dBeats };
    });
    return {
      sectionId: `S${i+1}`,
      sectionName: s.name || `S${i+1}`,
      lengthBars: lenBars,
      chords
    };
  });

  // Arrangement by time
  const arrangement = (jsonObj.sections || []).map((s, i) => {
    const { bar } = secToBarBeat(Number(s.start_time)||0);
    return { arrangementIndex: i+1, sectionId: `S${i+1}`, startBar: bar, repeat: 1 };
  });

  // Song object v1
  const suggestedId = (md.artist && md.title) ? (`${md.artist}-${md.title}`) : null;
  const songId = slugId_((songIdHint || suggestedId || Utilities.getUuid()));
  return {
    v:1,
    songId,
    meta: {
      title: md.title || 'Imported',
      artist: md.artist || '',
      bpm, key: String(md.key || '').replace(/^Key\s*/i,''),
      mode: md.mode || '',
      timeSignature: ts,
      tags: Array.isArray(md.tags) ? md.tags : [],
      notes: md.source ? `Source: ${md.source}` : ''
    },
    sections, arrangement, commands_ref:[]
  };
}

function slugId_(s){ return String(s).replace(/\s+/g,'_').replace(/[^A-Za-z0-9_\-]+/g,'').toLowerCase(); }
