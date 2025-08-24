/**
 * Pull a few status messages from Pub/Sub and append to a Logs sheet.
 * Requires Script Properties:
 *  - GCP_PROJECT_ID
 *  - STATUS_SUB (optional, defaults to 'dawsheet.status-sub')
 * Scopes required: https://www.googleapis.com/auth/pubsub
 */
function pullStatusOnce() {
  const props = PropertiesService.getScriptProperties();
  const projectId = props.getProperty('GCP_PROJECT_ID');
  const sub = props.getProperty('STATUS_SUB') || 'dawsheet.status-sub';
  if (!projectId) throw new Error('GCP_PROJECT_ID not set (use Setup Wizard).');

  const token = ScriptApp.getOAuthToken();
  const url = `https://pubsub.googleapis.com/v1/projects/${projectId}/subscriptions/${sub}:pull`;
  const payload = { maxMessages: 20 };
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Pull failed: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
  const body = JSON.parse(res.getContentText());
  const msgs = body.receivedMessages || [];
  if (!msgs.length) {
    SpreadsheetApp.getUi().alert('No status messages.');
    return;
  }

  const sh = getOrCreateLogs_();
  const rows = [];
  const ackIds = [];
  msgs.forEach(m => {
    const data = Utilities.newBlob(Utilities.base64Decode(m.message.data)).getDataAsString();
    let j = {};
    try { j = JSON.parse(data); } catch (e) {}
    rows.push([
      new Date(j.ts || j.receivedAt || Date.now()),
      j.kind || j.type || '',
      j.id || j.origin || '',
      j.ok === true ? 'OK' : (j.ok === false ? 'ERR' : ''),
      Number(j.latencyMs || 0),
      j.proxyId || j.proxy || '',
      j.midiOut || '',
      (j.detail || j.error || '').toString()
    ]);
    if (m.ackId) ackIds.push(m.ackId);
  });

  if (rows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  // ACK pulled messages
  if (ackIds.length) {
    const ackUrl = `https://pubsub.googleapis.com/v1/projects/${projectId}/subscriptions/${sub}:acknowledge`;
    UrlFetchApp.fetch(ackUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ ackIds }),
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}

function getOrCreateLogs_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Logs');
  if (!sh) {
    sh = ss.insertSheet('Logs');
    sh.getRange(1, 1, 1, 8)
      .setValues([[ 'When','Kind','CmdId','OK','LatencyMs','ProxyId','MidiOut','Detail' ]])
      .setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
