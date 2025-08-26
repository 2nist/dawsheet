// ImportMidi.gs — MIDI reduced adapter (server-side helpers)

function midiReducedToSong_(midi, opts){
  const bpm = opts?.overrideBpm ? Number(opts.overrideBpm) :
              (midi.tempos && midi.tempos.length ? Number(midi.tempos[0].bpm) : 120);
  const ts  = opts?.timeSignature || (midi.timeSignatures && midi.timeSignatures[0] ?
              `${midi.timeSignatures[0].numerator}/${midi.timeSignatures[0].denominator}` : '4/4');

  const beatsPerBar = Number(ts.split('/')[0]) || 4;
  const spb = 60 / bpm;

  // Sectioning by markers; fallback to 2×16 bars
  const markers = (midi.markers||[]).slice().sort((a,b)=>a.time-b.time);
  const mkSection = (name, startSec, endSec, idx) => {
    const lenBars = Math.max(1, Math.round((endSec - startSec) / (spb * beatsPerBar)));
    return { sectionId:`S${idx}`, sectionName:name||`S${idx}`, lengthBars: lenBars, chords: [] };
  };
  let sections = [];
  if (markers.length >= 1){
    for (let i=0;i<markers.length;i++){
      const m = markers[i], next = markers[i+1];
      sections.push(mkSection(m.text, m.time, next ? next.time : m.time + (16*beatsPerBar*spb), i+1));
    }
  } else {
    sections.push(mkSection('A', 0, 16*beatsPerBar*spb, 1));
    sections.push(mkSection('B', 16*beatsPerBar*spb, 32*beatsPerBar*spb, 2));
  }

  // Chord detection (bar buckets)
  loadTonalJs();
  function midiToNoteName_(n) {
    // 0=C-1 per MIDI standard
    const N = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const note = N[Math.floor(n % 12)];
    const octave = Math.floor(n / 12) - 1;
    return note + String(octave);
  }
  const chordAt = (notes) => {
    // notes array of MIDI or names; try mapping through Tonal
    const pcs = Array.from(new Set(notes.map(n=>{
      if (typeof n === 'number') return midiToNoteName_(n);
      return Tonal.Note.pc(n);
    }).map(name => Tonal.Note.pc(name))));
    const det = Tonal.Chord.detect(pcs);
    return det && det.length ? det[0] : 'N.C.';
  };

  const allNotes = (midi.tracks||[]).flatMap(t => t.notes||[]);
  const barBuckets = {};
  allNotes.forEach(n=>{
    const beats = n.time / spb;
    const bar = Math.floor(beats / beatsPerBar) + 1;
    (barBuckets[bar] = barBuckets[bar] || []).push(n.midi);
  });

  let cursorBar = 1;
  sections = sections.map(sec=>{
    const chords = [];
    for (let b=0;b<sec.lengthBars;b++){
      const notes = barBuckets[cursorBar+b] || [];
      const sym = notes.length ? chordAt(notes) : 'N.C.';
      chords.push({ symbol: sym, beats: beatsPerBar });
    }
    cursorBar += sec.lengthBars;
    return Object.assign(sec, { chords });
  });

  const arrangement = sections.map((s,i)=>({ arrangementIndex:i+1, sectionId:s.sectionId, startBar: 1 + i*(s.lengthBars), repeat:1 }));

  return {
    v:1,
    songId: (opts && opts.songId) || Utilities.getUuid(),
    meta: { title: (opts && opts.title) || 'Imported MIDI', artist:'', bpm, key:'', mode:'', timeSignature: ts, tags:[], notes:'' },
    sections, arrangement, commands_ref:[]
  };
}
