// CompareTool.gs
function openCompareSidebar(){
  const html = HtmlService.createTemplateFromFile('CompareUI')
    .evaluate().setTitle('Comparative Analyzer').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

function cmp_getSummary(songId){
  const s = getSong(songId);
  const chords = {}; var bars=0;
  (s.sections||[]).forEach(function(sec){
    (sec.chords||[]).forEach(function(c){
      var k = c.symbol; chords[k]=(chords[k]||0)+1;
      bars += (Number(c.beats)||4)/4;
    });
  });
  return {
    songId: s.songId, title: s.meta.title, key: s.meta.key, bpm: s.meta.bpm,
    chordCount: Object.keys(chords).map(function(k){ return [k, chords[k]]; }).sort(function(a,b){ return b[1]-a[1]; }),
    totalBars: bars,
    form: (s.arrangement||[]).map(function(a){ return {sectionId:a.sectionId, repeat:a.repeat||1}; })
  };
}

function cmp_compare(aId, bId){
  return { A: cmp_getSummary(aId), B: cmp_getSummary(bId) };
}
