/**
 * Opens the Setup Wizard dialog.
 */
function openSetupWizard() {
  const html = HtmlService.createHtmlOutputFromFile('SetupDialog')
    .setWidth(420)
    .setHeight(420)
    .setTitle('DAWSheet Setup');
  SpreadsheetApp.getUi().showModalDialog(html, 'DAWSheet Setup');
}

/**
 * Returns current Script Properties relevant to DAWSheet.
 */
function getScriptProps() {
  const props = PropertiesService.getScriptProperties();
  return {
    GCP_PROJECT_ID: props.getProperty('GCP_PROJECT_ID') || '',
    COMMANDS_TOPIC: props.getProperty('COMMANDS_TOPIC') || 'dawsheet.commands',
    STATUS_TOPIC: props.getProperty('STATUS_TOPIC') || 'dawsheet.status'
  };
}

/**
 * Saves properties from the Setup Wizard.
 * @param {{projectId:string, commandsTopic:string, statusTopic:string}} p
 */
function saveScriptProps(p) {
  const props = PropertiesService.getScriptProperties();
  if (p && typeof p === 'object') {
    if (p.projectId) props.setProperty('GCP_PROJECT_ID', String(p.projectId));
    if (p.commandsTopic) props.setProperty('COMMANDS_TOPIC', String(p.commandsTopic));
    if (p.statusTopic) props.setProperty('STATUS_TOPIC', String(p.statusTopic));
  }
  return getScriptProps();
}

/**
 * Publishes a simple NOTE test message to the configured commands topic.
 */
function sendTestPublish() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange() || sheet.getRange('A1');
  const payload = {
    type: 'NOTE',
    songId: sheet.getParent().getId(),
    channel: 1,
    note: 'C4',
    velocity: 100,
    durationSec: 0.5,
    origin: `sheets://${sheet.getName()}/${range.getA1Notation()}`
  };
  const topic = PropertiesService.getScriptProperties().getProperty('COMMANDS_TOPIC') || 'dawsheet.commands';
  publish(topic, payload);
  return { ok: true };
}

/**
 * Sends a PING to the commands topic so the Desktop Bridge can reply with PONG on the status topic.
 */
function sendBridgePing() {
  const props = getScriptProps();
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange() || sheet.getRange('A1');
  const payload = {
    type: 'PING',
    origin: `sheets://${sheet.getName()}/${range.getA1Notation()}`
  };
  publish(props.COMMANDS_TOPIC || 'dawsheet.commands', payload);
  return { ok: true };
}

/**
 * Requests a list of available outputs from the Desktop Bridge.
 */
function requestOutputsList() {
  const props = getScriptProps();
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange() || sheet.getRange('A1');
  const payload = {
    type: 'OUTPUTS.LIST',
    origin: `sheets://${sheet.getName()}/${range.getA1Notation()}`
  };
  publish(props.COMMANDS_TOPIC || 'dawsheet.commands', payload);
  return { ok: true };
}

/**
 * Requests the Desktop Bridge switch its MIDI output.
 * @param {string} name Partial or full device name
 */
function setBridgeOutput(name) {
  const props = getScriptProps();
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange() || sheet.getRange('A1');
  const payload = {
    type: 'OUTPUTS.SET',
    origin: `sheets://${sheet.getName()}/${range.getA1Notation()}`,
    payload: { name: String(name || '') }
  };
  publish(props.COMMANDS_TOPIC || 'dawsheet.commands', payload);
  return { ok: true };
}
