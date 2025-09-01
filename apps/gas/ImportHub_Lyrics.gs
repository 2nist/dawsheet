function showImportHubLyrics() {
  const html = HtmlService.createHtmlOutputFromFile("ImportHub_Lyrics")
    .setTitle("Import Lyrics")
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function uploadLyrics(dataUrl, filename, fmt, songId) {
  // dataUrl: data:<type>;base64,<payload>
  const m = dataUrl.match(/^data:.*;base64,(.*)$/);
  if (!m) throw new Error("invalid data");
  const b64 = m[1];
  const bytes = Utilities.base64Decode(b64);
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const url =
    endpoint + (fmt === "lrc" ? "/parse/lyrics/lrc" : "/parse/lyrics/txt");
  const options = {
    method: "post",
    contentType: "application/octet-stream",
    payload: bytes,
    muteHttpExceptions: true,
  };
  const resp = UrlFetchApp.fetch(url, options);
  const parsed = JSON.parse(resp.getContentText());
  // write to Lyrics sheet
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("Lyrics");
  if (!sh) sh = ss.insertSheet("Lyrics");
  // ensure header
  const header = ["songId", "line", "startSec", "endSec", "at", "text", "conf"];
  sh.clear();
  sh.appendRow(header);
  const sections = getSectionsMap(); // helper (optional)
  parsed.forEach(function (r) {
    let start = r.startSec;
    let conf = r.conf || "high";
    if (!start && fmt === "txt") {
      // anchor to section start if available
      const secStart = findNearestSectionStart(sections);
      start = secStart || 0;
      conf = "low";
    }
    sh.appendRow([
      songId || "",
      r.line,
      start,
      r.endSec || "",
      "",
      r.text,
      conf,
    ]);
  });
  return { ok: true, written: parsed.length };
}

function getSectionsMap() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Sections");
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  const hdr = vals.shift();
  return vals.map(function (r) {
    const o = {};
    hdr.forEach(function (h, i) {
      o[h] = r[i];
    });
    return o;
  });
}

function findNearestSectionStart(sections) {
  if (!sections || sections.length === 0) return null;
  return sections[0].Time_s || sections[0].time_s || null;
}
