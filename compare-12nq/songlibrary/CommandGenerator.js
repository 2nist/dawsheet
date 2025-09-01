// CommandGenerator.gs
// Convert a song arrangement into DAWSheet command envelopes (CHORD.PLAY)

function songToCommands(songId, targetMidiChannel = '1') {
  loadTonalJs();
  getAjvInstance();
  const song = getSong(songId);
  const cmds = [];
  let currentGlobalBar = 1;
  const beatsPerBar = Number((song.meta.timeSignature || '4/4').split('/')[0]);
  song.arrangement.forEach(item => {
    const section = song.sections.find(s => s.sectionId === item.sectionId);
    if (!section) return;
    currentGlobalBar = Math.max(currentGlobalBar, item.startBar);
    for (let r = 0; r < (item.repeat || 1); r++) {
      let beatOffset = 0;
      section.chords.forEach((ch, idx) => {
        const totalBeats = (currentGlobalBar - 1) * beatsPerBar + beatOffset;
        const bar = Math.floor(totalBeats / beatsPerBar) + 1;
        const beat = (totalBeats % beatsPerBar) + 1;
        const at = `${bar}:${beat}`;
        const info = Tonal.Chord.get(ch.symbol);
        const payload = {
          root: info.tonic || ch.symbol.replace(/m|maj|dim|aug|sus|7|9|11|13|add|M|o|\/.*$/,''),
          quality: info.quality || 'unknown',
          channel: parseInt(targetMidiChannel) || 1
        };
        const cmd = {
          v: 1,
          type: 'CHORD.PLAY',
          id: `song-${song.songId}-sec-${section.sectionId}-rep-${r+1}-chord-${idx}`,
          origin: `song://${song.songId}/section/${section.sectionId}/arrangement/${item.arrangementIndex}/repeat/${r+1}`,
          at,
          quantize: '1/8',
          target: 'default-midi-out',
          payload,
          transform: [],
          meta: { songId: song.songId, tags: song.meta.tags || [] }
        };
        const { isValid, errors } = validateData(COMMANDS_SCHEMA, cmd);
        if (!isValid) throw new Error(`Invalid command for '${ch.symbol}' at ${at}: ${errors.join('; ')}`);
        cmds.push(cmd);
        beatOffset += ch.beats;
      });
      currentGlobalBar += section.lengthBars;
    }
  });
  return cmds;
}

/** Conceptual publisher (logs + alert) */
function publishCommands(commands) {
  console.log('--- Generated Commands ---');
  console.log(JSON.stringify(commands, null, 2));
  console.log('--- End Commands ---');
  SpreadsheetApp.getUi().alert('Commands Generated', 'Commands were generated (see Logs). In a full setup these would be sent to the proxy.', SpreadsheetApp.getUi().ButtonSet.OK);
}
