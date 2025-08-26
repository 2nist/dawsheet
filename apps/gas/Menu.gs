/**
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
        .addItem('Batch Import (.json / .mid)', 'openBatchImportSidebar')
        .addItem('Song Library Import Hub', 'openImportHubSidebar')
    )
    .addSeparator()
    .addSubMenu(
      ui.createMenu('Utilities')
        .addItem('Lib Self-Test (AJV/Tonal)', 'util_libSelfTest')
        .addItem('Clear Lib Cache (AJV/Tonal)', 'util_clearLibCache')
    )
    .addToUi();
}

// Optional: keep these as no-ops if not already defined elsewhere.
function openImportHubSidebar() {
  if (typeof import_openHubSidebar === 'function') return import_openHubSidebar();
  SpreadsheetApp.getUi().alert('Import Hub not wired yet. Use Import → Batch Import for now.');
}

// Bridge names from older code to new menu labels.
function openEditTriggersUi(){ return openTriggerEditor(); }
function openRoutingSidebar(){ return openRouting(); }
function util_libSelfTest(){ SpreadsheetApp.getUi().alert('Self-test not implemented.'); }
function util_clearLibCache(){ SpreadsheetApp.getUi().alert('Clear cache not implemented.'); }
  }
}
