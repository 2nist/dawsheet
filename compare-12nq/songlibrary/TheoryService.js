// TheoryService.gs
// Chord detection and diatonic chord generation using Tonal.js

/** Detect a chord from an array of notes like ['C4','E4','G4'] */
function getChordsByNotes(notesArray) {
  loadTonalJs();
  const pitchClasses = notesArray.map(n => Tonal.Note.pc(n));
  const detected = Tonal.Chord.detect(pitchClasses);
  let result;
  if (detected && detected.length) {
    const sym = detected[0];
    const chordData = Tonal.Chord.get(sym);
    result = { symbol: sym, beats: 4, notes: notesArray, quality: chordData.quality || 'unknown' };
  } else {
    result = { symbol: 'N.C.', beats: 4, notes: notesArray, quality: 'none' };
  }
  const { isValid, errors } = validateData(CHORD_SCHEMA, result);
  if (!isValid) throw new Error(`Invalid detected chord: ${errors.join('; ')}`);
  return result;
}

/** Generate diatonic chords for a key like 'C Major' */
function getDiatonicChords(key) {
  loadTonalJs();
  const parts = key.split(' ');
  if (parts.length < 2) throw new Error(`Invalid key format: '${key}'.`);
  const tonic = parts[0];
  const scaleName = parts.slice(1).join(' ');
  const scale = Tonal.Scale.get(`${tonic} ${scaleName}`);
  if (!scale || scale.empty) throw new Error(`Scale not found for '${key}'.`);
  const chords = Tonal.Scale.chords(scale.intervals).map((chType, i) => {
    const root = Tonal.Note.fromInterval(tonic, scale.intervals[i]);
    const chordDetail = Tonal.Chord.chord(chType);
    const symbol = `${root}${chordDetail.empty ? '' : (chordDetail.aliases[0] || chordDetail.name)}`;
    const obj = { symbol, beats: 4, notes: Tonal.Chord.get(symbol).notes, quality: chordDetail.quality || 'unknown' };
    const { isValid, errors } = validateData(CHORD_SCHEMA, obj);
    if (!isValid) throw new Error(`Invalid diatonic chord '${symbol}': ${errors.join('; ')}`);
    return obj;
  });
  return chords;
}
