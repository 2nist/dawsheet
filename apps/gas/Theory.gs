function showUiDiagnostics() {
  const html = HtmlService.createHtmlOutputFromFile("UiDiagnostics")
    .setTitle("Diagnostics")
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function computeDiagnostics() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Sections");
  if (!sh) return { ok: false, msg: "Sections sheet missing" };
  const vals = sh.getDataRange().getValues();
  const hdr = vals.shift();
  const sections = vals.map(function (r) {
    const o = {};
    hdr.forEach(function (h, i) {
      o[h] = r[i];
    });
    return o;
  });
  const diagnostics = [];
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  sections.forEach(function (sec, idx) {
    // collect chords for this section from a Chords sheet or section row
    const chords = (sec.Chords && String(sec.Chords).split(",")) || [];
    let hint = { key: "N/A", mode: "N/A", confidence: 0 };
    if (endpoint && chords.length > 0) {
      try {
  const apiKey = PropertiesService.getScriptProperties().getProperty('PROXY_API_KEY') || '';
  const options = { method: "post", contentType: "application/json", payload: JSON.stringify({ songId: "", sectionId: idx, chords: chords }), muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/hint/key_chroma", options);
        hint = JSON.parse(resp.getContentText());
      } catch (e) {
        hint = { key: "err", mode: "err", confidence: 0 };
      }
    }
    diagnostics.push({
      songId: "",
      sectionId: idx,
      beats: sec.Beats || sec.beats || 0,
      chordsCount: chords.length,
      key: hint.key,
      mode: hint.mode,
      key_conf: hint.confidence || 0,
    });
  });
  // write Diagnostics sheet
  let ds = ss.getSheetByName("Diagnostics");
  if (!ds) ds = ss.insertSheet("Diagnostics");
  ds.clear();
  ds.appendRow([
    "songId",
    "sectionId",
    "beats",
    "chordsCount",
    "key",
    "mode",
    "key_conf",
  ]);
  diagnostics.forEach(function (d) {
    ds.appendRow([
      d.songId,
      d.sectionId,
      d.beats,
      d.chordsCount,
      d.key,
      d.mode,
      d.key_conf,
    ]);
  });
  // apply heatmap coloring based on key_conf
  const lastRow = ds.getLastRow();
  if (lastRow > 1) {
    const confRange = ds.getRange(2, 7, lastRow - 1, 1);
    const vals = confRange.getValues();
    const bg = vals.map(function (r) {
      const v = parseFloat(r[0]) || 0;
      if (v > 0.8) return ["#c6efce"];
      if (v > 0.5) return ["#ffeb9c"];
      return ["#f2c2c2"];
    });
    confRange.setBackgrounds(bg);
  }
  return { ok: true, count: diagnostics.length };
}
