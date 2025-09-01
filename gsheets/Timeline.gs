/** Timeline helpers copied from apps/gas/Timeline.gs */
/* ...existing code copied in full ... */
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
  const apiKey = props.getProperty("PROXY_API_KEY") || "";
  const cmds = compileTimeline();
  const envelope = {
    cmd: "BATCH.COMMANDS",
    id: Utilities.getUuid(),
    body: { device_id: deviceId, commands: cmds },
  };
  const options = { method: "post", contentType: "application/json", payload: JSON.stringify(envelope), muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/command", options);
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { error: resp.getContentText() };
  }
}

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

function playbackSimulation(commands, intervalMs) {
  intervalMs = intervalMs || 400;
  clearTimelineHighlight();
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const origin = cmd && cmd.origin ? String(cmd.origin) : "";
    const m = origin.match(/Timeline\/(\d+)$/);
    const sheetRow = m ? Number(m[1]) : null;
    if (sheetRow) {
      Utilities.sleep(i === 0 ? 0 : intervalMs);
      highlightTimelineRow(sheetRow, "#fff2b8");
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

function toast(msg) {
  SpreadsheetApp.getActive().toast(String(msg));
  return true;
}

function enqueuePlaybackToProxy(deviceId, intervalMs) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const apiKey = props.getProperty("PROXY_API_KEY") || "";
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
  const options = { method: "post", contentType: "application/json", payload: JSON.stringify(envelope), muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/command", options);
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { error: resp.getContentText() };
  }
}

function proxy_getPlaybackStatus(enqueueId) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const apiKey = props.getProperty("PROXY_API_KEY") || "";
  const options = { method: "get", muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/playback/" + encodeURIComponent(enqueueId), options);
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { error: resp.getContentText() };
  }
}

function listPlaybackJobs() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const apiKey = props.getProperty("PROXY_API_KEY") || "";
  const options = { method: "get", muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/playback", options);
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return [];
  }
}

function cancelPlaybackJob(enqueueId) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const apiKey = props.getProperty("PROXY_API_KEY") || "";
  const options = { method: "post", muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/playback/" + encodeURIComponent(enqueueId) + "/cancel", options);
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { ok: false, raw: resp.getContentText() };
  }
}
