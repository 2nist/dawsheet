/**
 * Server-side GAS utilities for routing matrix compilation and sending ROUTING.SET
 */

function showUiRouting() {
  const html = HtmlService.createHtmlOutputFromFile("UiRouting")
    .setTitle("DAWSheet Routing")
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

function compileRoutingMatrix() {
  // Reads a sheet named 'Routing Matrix' and compiles a JSON routes object
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Routing Matrix");
  if (!sheet) throw new Error("Routing Matrix sheet not found");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift().map((h) => String(h).trim());
  const routes = data
    .filter((r) => r.some((c) => c !== ""))
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) {
        obj[h] = row[i];
      });
      return obj;
    });
  return { routes: routes };
}

function sendRoutingSet(payload) {
  // Posts ROUTING.SET to the configured proxy endpoint and returns ACK
  // payload should be an object; we add an id and envelope
  const id = Utilities.getUuid();
  const envelope = { cmd: "ROUTING.SET", id: id, body: payload };
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) {
    throw new Error(
      "Proxy endpoint not configured in script properties (PROXY_ENDPOINT)"
    );
  }
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(envelope),
    muteHttpExceptions: true,
  };
  const apiKey = PropertiesService.getScriptProperties().getProperty('PROXY_API_KEY') || '';
  if (apiKey) options.headers = { 'x-api-key': apiKey };
  const resp = UrlFetchApp.fetch(endpoint + "/command", options);
  try {
    const body = JSON.parse(resp.getContentText());
    return body;
  } catch (e) {
    return {
      id: id,
      ok: false,
      msg: "invalid response",
      raw: resp.getContentText(),
    };
  }
}
/** Routing MVP: routing sheet and publish DEVICE.PARAM_SET */

function routing_ensureSheet_() {
  const ss = SpreadsheetApp.getActive();
  const name = "Routing";
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(["Source/Target", "Dest1", "Dest2", "Dest3"]);
    sh.appendRow(["Keyboard", 0, 1, 0]);
    sh.appendRow(["Pads", 1, 0, 0]);
  }
  return sh;
}

function openRouting() {
  const html =
    HtmlService.createHtmlOutputFromFile("RoutingUI").setTitle("Routing");
  SpreadsheetApp.getUi().showSidebar(html);
}

function routing_getState() {
  const sh = routing_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  const hdr = vals.shift();
  return { header: hdr, rows: vals };
}

function routing_updateCell(sourceRow, destCol, value) {
  const sh = routing_ensureSheet_();
  const r = sourceRow + 2; // account for header
  const c = destCol + 2; // account for first column
  sh.getRange(r, c).setValue(value ? 1 : 0);
  publish(
    PropertiesService.getScriptProperties().getProperty("COMMANDS_TOPIC"),
    {
      type: "DEVICE.PARAM_SET",
      targetId: "router",
      param: `route:${sh.getRange(r, 1).getValue()}->${sh
        .getRange(1, c)
        .getValue()}`,
      value: value ? 1 : 0,
    }
  );
  return "ok";
}

function listDevices() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const resp = UrlFetchApp.fetch(endpoint + "/devices", {
    method: "get",
    muteHttpExceptions: true,
  });
  // attach API key header when configured
  // (recreate options to add headers)
  // Note: UrlFetchApp doesn't allow mutating previous options, so use explicit options if api key is present
  try {
    const apiKeyDev = PropertiesService.getScriptProperties().getProperty('PROXY_API_KEY') || '';
    if (apiKeyDev) {
      const opts = { method: 'get', muteHttpExceptions: true, headers: { 'x-api-key': apiKeyDev } };
      const r2 = UrlFetchApp.fetch(endpoint + '/devices', opts);
      return JSON.parse(r2.getContentText());
    }
  } catch (e) { /* fall through to parsing earlier response */ }
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return [];
  }
}

function testDevice(deviceId) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("PROXY_ENDPOINT") || "";
  if (!endpoint) throw new Error("PROXY_ENDPOINT not configured");
  const id = Utilities.getUuid();
  const envelope = { cmd: "TEST.PING", id: id, body: { device_id: deviceId } };
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
