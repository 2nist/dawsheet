function showUiLogs() {
  const html = HtmlService.createHtmlOutputFromFile("UiLogs")
    .setTitle("DAWSheet Logs")
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

function fetchAcks(limit) {
  // proxy endpoint for ACKs should be configured in script properties
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const apiKey = PropertiesService.getScriptProperties().getProperty('PROXY_API_KEY') || '';
  const options = { method: 'get', muteHttpExceptions: true };
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/acks?limit=" + (limit || 50), options);
  return JSON.parse(resp.getContentText());
}
