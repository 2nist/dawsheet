function showUiBatchImport() {
  const html = HtmlService.createHtmlOutputFromFile("UiBatchImport")
    .setTitle("Batch Import")
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function runBatchImport(folderId, sheetId, tab) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const folder = DriveApp.getFolderById(folderId);
  const it = folder.getFilesByType(MimeType.JSON);
  const results = [];
  while (it.hasNext()) {
    const f = it.next();
    const name = f.getName();
    const content = f.getBlob().getDataAsString();
    try {
      // Expect the file to contain a top-level SongRecord JSON payload.
      var payload = content;
      // normalize endpoint (avoid double slashes)
      const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
      let url = base + "/import/songrecord";
      const params = [];
      if (sheetId) params.push("sheet_id=" + encodeURIComponent(sheetId));
      if (tab) params.push("tab=" + encodeURIComponent(tab));
      if (params.length) url = url + "?" + params.join("&");
  const apiKey = PropertiesService.getScriptProperties().getProperty('PROXY_API_KEY') || '';
  const options = { method: "post", contentType: "application/json", payload: payload, muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(url, options);
      results.push({
        file: name,
        status: resp.getResponseCode(),
        body: resp.getContentText(),
      });
    } catch (e) {
      results.push({ file: name, error: String(e) });
    }
  }
  return results;
}
