function showWelcome() {
  const html = HtmlService.createTemplateFromFile('welcome').evaluate()
    .setTitle('DAWSheet')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(html);
}

function onOpen(){ showWelcome(); } // optional: always open on first use

// Feature flag stub for Pro Mode
function isProModeEnabled() {
  return false; // v1: no Pub/Sub; bridge-only
}
