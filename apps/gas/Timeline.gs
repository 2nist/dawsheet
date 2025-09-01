/** Compile Timeline sheet rows into command envelopes (NOTE.PLAY) */
function compileTimeline() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Timeline");
  if (!sh) throw new Error("Timeline sheet not found");
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const rows = sh
    .getRange(2, 1, Math.max(0, sh.getLastRow() - 1), sh.getLastColumn())
    .getValues();
  const out = [];
  const idx = (name) => {
    const i = headers.indexOf(name);
    return i >= 0 ? i : -1;
  };
  const iBar = idx("Bar");
  const iBeat = idx("Beat");
  const iChord = idx("Chord");
  const iEventType = idx("EventType");
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const bar = iBar >= 0 ? row[iBar] : "";
    const beat = iBeat >= 0 ? row[iBeat] : "";
    const chord = iChord >= 0 ? row[iChord] : "";
    const ev = iEventType >= 0 ? row[iEventType] : "";
    if (
      (chord && String(chord).trim() !== "") ||
      (ev && String(ev).trim() !== "")
    ) {
      const at =
        bar !== "" && beat !== "" ? `bar:${bar}:${beat}` : `row:${r + 2}`;
      const cmd = {
        type: "NOTE.PLAY",
        at: at,
        chord: chord || null,
        origin: `sheets://Timeline/${r + 2}`,
      };
      out.push(cmd);
    }
  }
  return out;
}

function sendTimelineToProxy(deviceId) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const cmds = compileTimeline();
  const envelope = {
    cmd: "BATCH.COMMANDS",
    id: Utilities.getUuid(),
    body: { device_id: deviceId, commands: cmds },
  };
  const resp = UrlFetchApp.fetch(endpoint + "/command", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(envelope),
    muteHttpExceptions: true,
  });
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { error: resp.getContentText() };
  }
}

/** Highlight helper: highlights a single row in the Timeline sheet (row number in sheet, 1-indexed). */
function highlightTimelineRow(sheetRow, color) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Timeline");
  if (!sh) throw new Error("Timeline sheet not found");
  sh.getRange(sheetRow, 1, 1, sh.getLastColumn()).setBackground(
    color || "#fff2b8"
  );
  return true;
}

function clearTimelineHighlight() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Timeline");
  if (!sh) return false;
  sh.getRange(
    2,
    1,
    Math.max(0, sh.getLastRow() - 1),
    sh.getLastColumn()
  ).setBackground(null);
  return true;
}

/** Playback simulation: server-side runner that highlights rows sequentially.
 *  commands: array of compiled commands (with origin like 'sheets://Timeline/<row>')
 *  intervalMs: milliseconds between steps
 */
function playbackSimulation(commands, intervalMs) {
  intervalMs = intervalMs || 400;
  clearTimelineHighlight();
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    // parse origin for row number
    const origin = cmd && cmd.origin ? String(cmd.origin) : "";
    const m = origin.match(/Timeline\/(\d+)$/);
    const sheetRow = m ? Number(m[1]) : null;
    if (sheetRow) {
      Utilities.sleep(i === 0 ? 0 : intervalMs);
      highlightTimelineRow(sheetRow, "#fff2b8");
      // small pause then clear
      Utilities.sleep(Math.max(50, Math.round(intervalMs * 0.6)));
      clearTimelineHighlight();
    }
  }
  return { ok: true, played: commands.length };
}

function timeline_selfTest() {
  try {
    const cmds = compileTimeline();
    if (!Array.isArray(cmds))
      return { ok: false, msg: "compileTimeline did not return array" };
    // try highlight on first matched origin if present
    if (cmds.length > 0) {
      const origin = cmds[0].origin || "";
      const m = String(origin).match(/Timeline\/(\d+)$/);
      if (m) {
        const r = Number(m[1]);
        highlightTimelineRow(r);
        clearTimelineHighlight();
      }
    }
    return { ok: true, count: cmds.length };
  } catch (e) {
    return { ok: false, msg: String(e) };
  }
}

/** Show a simple Spreadsheet toast from client UI */
function toast(msg) {
  SpreadsheetApp.getActive().toast(String(msg));
  return true;
}

/** Enqueue playback to the configured proxy asynchronously.
 * This posts a PLAYBACK.ENQUEUE envelope to the proxy; the proxy or backend
 * can then schedule/execute the sequence without blocking this Apps Script
 * execution. Returns the proxy's immediate response (ack or enqueue id).
 */
function enqueuePlaybackToProxy(deviceId, intervalMs) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const cmds = compileTimeline();
  const envelope = {
    cmd: "PLAYBACK.ENQUEUE",
    id: Utilities.getUuid(),
    body: {
      device_id: deviceId,
      commands: cmds,
      intervalMs: intervalMs || 400,
      async: true,
    },
  };
  const resp = UrlFetchApp.fetch(endpoint + "/command", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(envelope),
    muteHttpExceptions: true,
  });
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { error: resp.getContentText() };
  }
}

/** Proxy helper: fetch playback job status by enqueue id */
function proxy_getPlaybackStatus(enqueueId) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const resp = UrlFetchApp.fetch(
    endpoint + "/playback/" + encodeURIComponent(enqueueId),
    {
      method: "get",
      muteHttpExceptions: true,
    }
  );
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { error: resp.getContentText() };
  }
}

/** List persisted playback jobs via the proxy */
function listPlaybackJobs() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const resp = UrlFetchApp.fetch(endpoint + "/playback", {
    method: "get",
    muteHttpExceptions: true,
  });
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return [];
  }
}

/** Cancel a playback job via proxy */
function cancelPlaybackJob(enqueueId) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const resp = UrlFetchApp.fetch(
    endpoint + "/playback/" + encodeURIComponent(enqueueId) + "/cancel",
    { method: "post", muteHttpExceptions: true }
  );
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { ok: false, raw: resp.getContentText() };
  }
}
