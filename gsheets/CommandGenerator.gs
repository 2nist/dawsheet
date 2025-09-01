// CommandGenerator.gs
// Convert a song arrangement into DAWSheet command envelopes (CHORD.PLAY) without external libs.

/** Very simple chord symbol parser --> { root, quality } */
function parseChordSymbol_(symbol) {
  symbol = String(symbol || "").trim();
  var m = symbol.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!m) return { root: symbol || "C", quality: "unknown" };
  var root = m[1];
  var quality = (m[2] || "").trim() || "maj";
  return { root: root, quality: quality };
}

/** Generate CHORD.PLAY commands for a songId. */
function songToCommands(songId, targetMidiChannel) {
  targetMidiChannel = parseInt(targetMidiChannel || "1", 10) || 1;
  var song = getSong(songId);
  var cmds = [];
  var currentGlobalBar = 1;
  var beatsPerBar =
    Number(String(song.meta.timeSignature || "4/4").split("/")[0]) || 4;
  song.arrangement.forEach(function (item) {
    var section = song.sections.find(function (s) {
      return s.sectionId === item.sectionId;
    });
    if (!section) return;
    currentGlobalBar = Math.max(currentGlobalBar, Number(item.startBar) || 1);
    for (var r = 0; r < (item.repeat || 1); r++) {
      var beatOffset = 0;
      section.chords.forEach(function (ch, idx) {
        var totalBeats = (currentGlobalBar - 1) * beatsPerBar + beatOffset;
        var bar = Math.floor(totalBeats / beatsPerBar) + 1;
        var beat = (totalBeats % beatsPerBar) + 1;
        var at = bar + ":" + beat;
        var parsed = parseChordSymbol_(ch.symbol);
        var payload = {
          root: parsed.root,
          quality: parsed.quality,
          channel: targetMidiChannel,
        };
        var cmd = {
          v: 1,
          type: "CHORD.PLAY",
          id:
            "song-" +
            song.songId +
            "-sec-" +
            section.sectionId +
            "-rep-" +
            (r + 1) +
            "-chord-" +
            idx,
          origin:
            "song://" +
            song.songId +
            "/section/" +
            section.sectionId +
            "/arrangement/" +
            item.arrangementIndex +
            "/repeat/" +
            (r + 1),
          at: at,
          quantize: "1/8",
          target: "default-midi-out",
          payload: payload,
          transform: [],
          meta: { songId: song.songId, tags: song.meta.tags || [] },
        };
        var v = validateData(COMMANDS_SCHEMA, cmd);
        if (!v.isValid)
          throw new Error(
            "Invalid command for " +
              ch.symbol +
              " at " +
              at +
              ": " +
              v.errors.join("; ")
          );
        cmds.push(cmd);
        beatOffset += Number(ch.beats) || 0;
      });
      currentGlobalBar += Number(section.lengthBars) || 0;
    }
  });
  return cmds;
}

/** Publish a batch of commands via Pub/Sub using publish_ */
function publishCommands(commands) {
  if (!commands || !commands.length)
    return { ok: false, reason: "no commands" };
  var topic = getScriptProps().COMMANDS_TOPIC || "dawsheet.commands";
  var envelope = { type: "COMMANDS.BATCH", v: 1, commands: commands };
  return publish_(topic, envelope);
}

/** Resolve a songId from current selection in the Song_Library sheet. */
function resolveSelectedSongId_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getActiveSheet();
  if (!sh || sh.getName() !== "Song_Library") return "";
  var range = sh.getActiveRange();
  if (!range) return "";
  var headers = sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(function (h) {
      return String(h).trim();
    });
  var col = headers.indexOf("songId");
  if (col < 0) return "";
  var row = range.getRow();
  if (row < 2) return "";
  return String(sh.getRange(row, col + 1).getValue()).trim();
}

/** Menu action: generate + publish commands for selected song. */
function generateCommandsForActiveSong() {
  var songId = resolveSelectedSongId_();
  if (!songId) {
    var ui = SpreadsheetApp.getUi();
    var resp = ui.prompt(
      "Generate Commands",
      "Enter songId to generate commands for:",
      ui.ButtonSet.OK_CANCEL
    );
    if (resp.getSelectedButton() !== ui.Button.OK)
      return { ok: false, cancelled: true };
    songId = String(resp.getResponseText() || "").trim();
    if (!songId) throw new Error("songId is required");
  }
  var cmds = songToCommands(songId, 1);
  var result = publishCommands(cmds);
  SpreadsheetApp.getUi().alert(
    "Generated " + cmds.length + " commands for " + songId
  );
  return result;
}

/** Generate + publish for explicit songId (used by UI button). */
function generateCommandsForSongId(songId) {
  if (!songId) throw new Error('songId required');
  var cmds = songToCommands(String(songId), 1);
  return publishCommands(cmds);
}
