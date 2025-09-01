function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("DAWSheet")
    .addItem("Open Song Request", "openRequestSidebar")
  .addItem("Open Song Library", "openSongLibrarySidebar")
  .addItem("Open Utilities", "openUtilitiesSidebar")
    .addSeparator()
  .addItem("Create Sample Song", "createSampleSong")
    .addItem(
      "Generate Commands for Selected Song",
      "generateCommandsForActiveSong"
    )
    .addItem("Setup Wizard", "openSetupWizard")
    .addItem("Poll Status Logs", "pollStatus")
    .addToUi();
}

function openRequestSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("sidebar")
    .setTitle("Request Song")
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

function ensureRequestsSheet_() {
  const ss = SpreadsheetApp.getActive();
  const name = "Requests";
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  const headers = [
    "Timestamp",
    "Artist",
    "Title",
    "Note",
    "Status",
    "Result",
    "ProjectId",
  ];
  const first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  let needs = false;
  for (let i = 0; i < headers.length; i++) {
    if (first[i] !== headers[i]) {
      needs = true;
      break;
    }
  }
  if (needs) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function submitRequest(form) {
  const sh = ensureRequestsSheet_();
  const ts = new Date();
  const artist = ((form && form.artist) || "").trim();
  const title = ((form && form.title) || "").trim();
  const note = ((form && form.note) || "").trim();
  if (!artist || !title) {
    throw new Error("Artist and Title are required");
  }
  sh.appendRow([ts, artist, title, note, "PENDING", "", ""]);
  return { ok: true };
}

// Provide context for the sidebar to build local PowerShell commands
function getSidebarContext() {
  // Note: These local paths reflect your current setup. Adjust if you relocate the repo/venv.
  return {
    sheetId: SpreadsheetApp.getActive().getId(),
    projectRoot: "H:\\My Drive\\dawsheetextractor\\DAWSheet-Project",
    pythonExe: "H:\\My Drive\\dawsheetextractor\\.venv\\Scripts\\python.exe",
    configPath:
      "H:\\My Drive\\dawsheetextractor\\DAWSheet-Project\\config.yaml",
    downloadsDir: "C:\\Users\\CraftAuto-Sales\\Downloads",
  };
}

// ---- Setup Wizard (minimal) ----
function openSetupWizard() {
  const html = HtmlService.createHtmlOutputFromFile("SetupDialog")
    .setWidth(420)
    .setHeight(420)
    .setTitle("DAWSheet Setup");
  SpreadsheetApp.getUi().showModalDialog(html, "DAWSheet Setup");
}

function getScriptProps() {
  const props = PropertiesService.getScriptProperties();
  return {
    GCP_PROJECT_ID: props.getProperty("GCP_PROJECT_ID") || "",
    COMMANDS_TOPIC: props.getProperty("COMMANDS_TOPIC") || "dawsheet.commands",
    STATUS_TOPIC: props.getProperty("STATUS_TOPIC") || "dawsheet.status",
  };
}

function saveScriptProps(p) {
  const props = PropertiesService.getScriptProperties();
  if (p && typeof p === "object") {
    if (p.projectId) props.setProperty("GCP_PROJECT_ID", String(p.projectId));
    if (p.commandsTopic)
      props.setProperty("COMMANDS_TOPIC", String(p.commandsTopic));
    if (p.statusTopic) props.setProperty("STATUS_TOPIC", String(p.statusTopic));
  }
  return getScriptProps();
}

// ---- Pub/Sub publisher ----
function getAccessToken_() {
  return ScriptApp.getOAuthToken();
}

function publish_(topicName, json) {
  const projectId =
    PropertiesService.getScriptProperties().getProperty("GCP_PROJECT_ID");
  if (!projectId)
    throw new Error("GCP_PROJECT_ID is not set in Script Properties.");
  const topic = `projects/${projectId}/topics/${topicName}`;
  const url = `https://pubsub.googleapis.com/v1/${topic}:publish`;
  const payload = {
    messages: [{ data: Utilities.base64Encode(JSON.stringify(json)) }],
  };
  const options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + getAccessToken_() },
    payload: JSON.stringify(payload),
  };
  const resp = UrlFetchApp.fetch(url, options);
  if (resp.getResponseCode() >= 400) throw new Error(resp.getContentText());
  return { ok: true };
}

function sendTestPublish() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange() || sheet.getRange("A1");
  const payload = {
    type: "NOTE",
    songId: sheet.getParent().getId(),
    channel: 1,
    note: "C4",
    velocity: 100,
    durationSec: 0.5,
    origin: `sheets://${sheet.getName()}/${range.getA1Notation()}`,
  };
  const topic = getScriptProps().COMMANDS_TOPIC || "dawsheet.commands";
  return publish_(topic, payload);
}

function sendBridgePing() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange() || sheet.getRange("A1");
  const payload = {
    type: "PING",
    origin: `sheets://${sheet.getName()}/${range.getA1Notation()}`,
  };
  const topic = getScriptProps().COMMANDS_TOPIC || "dawsheet.commands";
  return publish_(topic, payload);
}

function requestOutputsList() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange() || sheet.getRange("A1");
  const payload = {
    type: "OUTPUTS.LIST",
    origin: `sheets://${sheet.getName()}/${range.getA1Notation()}`,
  };
  const topic = getScriptProps().COMMANDS_TOPIC || "dawsheet.commands";
  return publish_(topic, payload);
}

function pollStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  sh.appendRow([new Date(), "Polling for status... (not implemented)"]);
  return { ok: true };
}

// --- Control tab helpers to signal a local Agent ---
function ensureControlSheet_() {
  const ss = SpreadsheetApp.getActive();
  const name = "Control";
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const headers = ["Key", "Value", "Updated"];
  const first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  let needs = false;
  for (let i = 0; i < headers.length; i++) {
    if (first[i] !== headers[i]) {
      needs = true;
      break;
    }
  }
  if (needs) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function triggerCommand(key, value) {
  const sh = ensureControlSheet_();
  sh.appendRow([String(key || ""), String(value || ""), new Date()]);
  return { ok: true };
}

// Buttons callable from the sidebar (requires local Agent polling the Control tab)
function runProcessRequests() {
  return triggerCommand("process_requests", "now");
}
function resetTimeline() {
  return triggerCommand("reset_timeline", "now");
}

function openTimelineSidebar() {
  const html =
    HtmlService.createHtmlOutputFromFile("TimelineUI").setTitle("Timeline");
  SpreadsheetApp.getUi().showSidebar(html);
}

function openJobsSidebar() {
  const html =
    HtmlService.createHtmlOutputFromFile("JobsUI").setTitle("Playback Jobs");
  SpreadsheetApp.getUi().showSidebar(html);
}

function openSongLibrarySidebar() {
  const html = HtmlService.createHtmlOutputFromFile('SongLibraryUI').setTitle('Song Library');
  SpreadsheetApp.getUi().showSidebar(html);
}

function openUtilitiesSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('UtilitiesUI').setTitle('Utilities');
  SpreadsheetApp.getUi().showSidebar(html);
}

// Helpers to manage script properties for the deployed Apps Script project
function setProxyConfig(endpoint, apiKey) {
  const props = PropertiesService.getScriptProperties();
  if (endpoint) props.setProperty("PROXY_ENDPOINT", endpoint);
  if (apiKey) props.setProperty("PROXY_API_KEY", apiKey);
  // audit the change to a sheet
  try {
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName("ConfigAudit");
    if (!sh) sh = ss.insertSheet("ConfigAudit");
    const ts = new Date();
    sh.appendRow([ts, "setProxyConfig", endpoint || "", apiKey ? "***" : ""]);
  } catch (e) {
    // ignore auditing errors
  }
  return { ok: true };
}

function getProxyConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    PROXY_ENDPOINT: props.getProperty("PROXY_ENDPOINT") || "",
    PROXY_API_KEY: props.getProperty("PROXY_API_KEY") || "",
  };
}

function proxy_checkHealth() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const apiKey = props.getProperty("PROXY_API_KEY") || "";
  const options = { method: "get", muteHttpExceptions: true };
  if (apiKey) options.headers = { "x-api-key": apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/health", options);
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { status: "error", raw: resp.getContentText() };
  }
}

// Return last N audit rows from ConfigAudit sheet. Each row: [ts, action, endpoint, apiKeyMask]
function getConfigAudit(limit) {
  limit = limit || 5;
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName("ConfigAudit");
    if (!sh) return [];
    const last = sh.getLastRow();
    if (last < 1) return [];
    const start = Math.max(1, last - limit + 1);
    const vals = sh
      .getRange(start, 1, Math.max(0, last - start + 1), 4)
      .getValues();
    // normalize rows into objects and mask apiKey column
    return vals
      .map(function (r) {
        return {
          ts: r[0],
          action: r[1],
          endpoint: r[2],
          apiKey: r[3] ? "***" : "",
        };
      })
      .reverse();
  } catch (e) {
    return [];
  }
}
