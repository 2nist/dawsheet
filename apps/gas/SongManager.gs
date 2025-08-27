// SongManager.gs
// Sidebar to manage song master sources and aliases, with hooks for per-file-type tools.

function openSongManagerSidebar() {
  const html = HtmlService.createTemplateFromFile('SongManagerUI')
    .evaluate()
    .setTitle('DAWSheet • Song Manager')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Return [{ songId, title, masterSource }] sorted by title. */
function sm_listSongsWithMasters() {
  const lib = getSheetData('Song_Library');
  const masters = getSheetData('Song_Masters');
  const masterById = {};
  masters.forEach(r => { if (r.songId) masterById[r.songId] = r.masterSource || ''; });
  return lib
    .map(r => ({ songId: r.songId, title: r.title, masterSource: masterById[r.songId] || '' }))
    .sort((a,b) => String(a.title||'').localeCompare(String(b.title||'')));
}

/** Set master source for a song (json|midi|lab|manual or ''). */
function sm_setMaster(songId, source) {
  if (!songId) throw new Error('Missing songId');
  source = String(source||'');
  if (source && !['json','midi','lab','manual'].includes(source)) {
    throw new Error('Invalid master source: ' + source);
  }
  return setSongMaster(songId, source);
}

/** Get aliases for a song: [{ alias, source }]. */
function sm_getAliases(songId) {
  if (!songId) return [];
  const rows = getSheetData('Song_Aliases');
  return rows.filter(r => r.songId === songId).map(r => ({ alias: r.alias, source: r.source || '' }));
}

/** Add an alias for a song. Normalizes to title slug; marks source 'manual'. */
function sm_addAlias(songId, aliasRaw) {
  if (!songId) throw new Error('Missing songId');
  const norm = normalizeTitleSlug_(aliasRaw);
  if (!norm) throw new Error('Alias is empty');
  addSongAlias_(norm, songId, 'manual');
  return 'Alias added: ' + norm;
}

/** Remove an alias row by alias string (affects any songId). */
function sm_removeAlias(aliasRaw) {
  const norm = normalizeTitleSlug_(aliasRaw);
  const rows = getSheetData('Song_Aliases');
  const next = rows.filter(r => String(r.alias||'') !== norm);
  setSheetData('Song_Aliases', next, ['alias','songId','source']);
  return 'Alias removed: ' + norm;
}

/** Convenience to open Batch Import from the Song Manager UI. */
function sm_openBatchImport() {
  openBatchImportSidebar();
  return 'Opened Batch Import sidebar';
}

function sm_getDefaultArtist(){ return getDefaultArtist_(); }
function sm_setDefaultArtist(artist){ return setDefaultArtist(artist); }

/** Set artist on Song_Library rows where artist is empty, using default artist. */
function sm_backfillMissingArtists(){
  var def = getDefaultArtist_();
  if (!def) return 'No default artist set.';
  var lib = getSheetData('Song_Library');
  var changed = 0;
  lib.forEach(function(r){ if (!String(r.artist||'').trim()) { r.artist = def; changed++; } });
  setSheetData('Song_Library', lib, ['songId','title','artist','bpm','key','mode','timeSignature','tags','notes']);
  return 'Backfilled artist on ' + changed + ' song(s).';
}

/** Delete a song across all sheets. Optionally remove Lyrics rows matching title. */
function sm_deleteSongEverywhere(songId, includeLyrics) {
  if (!songId) throw new Error('Missing songId');
  includeLyrics = !!includeLyrics;
  // Find the title before removal
  const lib = getSheetData('Song_Library');
  const row = lib.find(r => r.songId === songId);
  const title = row ? String(row.title || '') : '';

  // Remove from core sheets
  const libNext = lib.filter(r => r.songId !== songId);
  setSheetData('Song_Library', libNext, ['songId','title','artist','bpm','key','mode','timeSignature','tags','notes']);

  const sections = getSheetData('Song_Sections').filter(s => s.songId !== songId);
  setSheetData('Song_Sections', sections, ['songId','sectionId','sectionName','lengthBars','chords','lyricsRef','notes']);

  const arr = getSheetData('Arrangements').filter(a => a.songId !== songId);
  setSheetData('Arrangements', arr, ['songId','arrangementIndex','sectionId','startBar','repeat','sceneRef','macroRef']);

  const aliases = getSheetData('Song_Aliases').filter(a => a.songId !== songId);
  setSheetData('Song_Aliases', aliases, ['alias','songId','source']);

  const masters = getSheetData('Song_Masters').filter(m => m.songId !== songId);
  setSheetData('Song_Masters', masters, ['songId','masterSource','lockedFields']);

  const ann = getSheetData('Annotations').filter(x => x.songId !== songId);
  setSheetData('Annotations', ann, ['songId','index','start','end','label']);

  // Optionally remove lyrics rows that match the title (best-effort; may affect duplicates)
  if (includeLyrics && title) {
    const lyr = getSheetData('Lyrics').filter(l => String(l.title||'').toLowerCase() !== title.toLowerCase());
    setSheetData('Lyrics', lyr, ['title','album','year','lyrics']);
  }

  return `Deleted '${songId}' across sheets` + (includeLyrics && title ? ` (including Lyrics for '${title}')` : '');
}
