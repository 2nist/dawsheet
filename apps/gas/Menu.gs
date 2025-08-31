function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('DAWSheet')
    .addItem('Command Center', 'openCommandCenter')
    .addSeparator()
    .addSubMenu(
      ui.createMenu('Editors')
        .addItem('Trigger Editor', 'openEditTriggersUi')
        .addItem('Routing', 'openRoutingSidebar')
  .addItem('Song Library', 'showSongLibrarySidebar')
  .addItem('Song Manager (Masters/Aliases)', 'openSongManagerSidebar')
    )
    .addSubMenu(
      ui.createMenu('Tools')
        .addItem('Chord Substitution', 'openChordSubSidebar')
        .addItem('Syncopation Heatmap', 'openSyncopationSidebar')
        .addItem('Rhyme Scheme Extractor', 'openRhymeSidebar')
        .addItem('Comparative Analyzer', 'openCompareSidebar')
        .addItem('Arrangement Template Generator', 'openArrangementTemplateSidebar')
    )
    .addSeparator()
    .addSubMenu(
      ui.createMenu('Templates')
        .addItem('Insert Step Grid 1x16', 'tpl_insertStepGrid16')
        .addItem('Insert CC Faders 8', 'tpl_insertCcfaders8')
        .addItem('Insert Chord Palette 8', 'tpl_insertChordPalette8')
    )
    .addSeparator()
    .addSubMenu(
      ui.createMenu('Import')
        .addItem('Batch Import (.json / .mid / .csv / .lab)', 'openBatchImportSidebar')
        .addItem('Song Library Import Hub', 'openImportHubSidebar')
    )
    .addSeparator()
    .addSubMenu(
      ui.createMenu('Utilities')
  .addItem('Lib Self-Test (AJV/Tonal)', 'util_libSelfTest')
  .addItem('Clear Lib Cache (AJV/Tonal)', 'util_clearLibCache')
  .addItem('Prewarm Libraries', 'util_prewarmLibs')
    )
    .addToUi();
}

// Optional: keep these as no-ops if not already defined elsewhere.
function openImportHubSidebar() {
  if (typeof import_openHubSidebar === 'function') return import_openHubSidebar();
  SpreadsheetApp.getUi().alert('Import Hub not wired yet. Use Import > Batch Import for now.');
}

// Bridge names from older code to new menu labels.
function openEditTriggersUi(){ return openTriggerEditor(); }
function openRoutingSidebar(){ return openRouting(); }
function util_libSelfTest(){
  try {
    loadAjv();
    loadTonalJs();
    SpreadsheetApp.getUi().alert('Libraries loaded OK.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Lib self-test failed: ' + (e && e.message ? e.message : e));
  }
}
function util_clearLibCache(){
  try {
    var msg = libraryClearCache();
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Clear cache failed: ' + (e && e.message ? e.message : e));
  }
}
function util_prewarmLibs(){
  try {
    var msg = prewarmLibraries();
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Prewarm failed: ' + (e && e.message ? e.message : e));
  }
}
