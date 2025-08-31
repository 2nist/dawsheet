function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("DAWSheet")
    .addItem("Open Song Request", "openRequestSidebar")
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
