// Sidebar.gs
// Sidebar lifecycle and server-side handlers for UI actions

function showSongLibrarySidebar() {
  const html = HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('DAWSheet Song Library')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getSongsForSidebar() {
  const songs = getSongs();
  return songs.map(s => ({ songId: s.songId, title: s.meta.title }));
}

function sendSelectedSongToTimeline(selectedSongId) {
  if (!selectedSongId) throw new Error('No song selected');
  const commands = songToCommands(selectedSongId, '1');
  publishCommands(commands);
  return `Song '${selectedSongId}' arrangement sent to Timeline!`;
}

function loadSelectedSongIntoLiveSet(selectedSongId) {
  if (!selectedSongId) throw new Error('No song selected');
  const song = getSong(selectedSongId);
  if (!song.commands_ref || !song.commands_ref.length) {
    return `Song '${song.meta.title}' has no associated commands to load.`;
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Command_Key');
  if (!sheet) throw new Error("The 'Command_Key' sheet was not found.");
  console.log(`Loading command refs for song '${song.meta.title}':`, song.commands_ref);
  SpreadsheetApp.getUi().alert('Live Set Update', `Commands referenced by song '${song.meta.title}' conceptually loaded. Check the script console for details.`, SpreadsheetApp.getUi().ButtonSet.OK);
  return `Commands for song '${song.meta.title}' loaded into Live Set (conceptual).`;
}
