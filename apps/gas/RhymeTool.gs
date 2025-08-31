// RhymeTool.gs
function openRhymeSidebar(){
  const html = HtmlService.createTemplateFromFile('RhymeUI')
    .evaluate().setTitle('Rhyme Scheme').setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

function rhyme_analyze(rawLyrics){
  const lines = String(rawLyrics||'').split(/\r?\n/).map(function(s){return s.trim();}).filter(function(x){return !!x;});
  const sig = function(w){
    const s = String(w||'').toLowerCase().replace(/[^a-z]/g,'');
    const m = s.match(/[aeiouy][a-z]*$/); return m ? m[0] : s.slice(-2);
  };
  const lastWord = function(s){ var parts = String(s||'').split(/\s+/); return (parts.pop()||'').replace(/[^a-zA-Z']/g,''); };
  const buckets = {}; var labelChar = 'A'.charCodeAt(0);
  const scheme = [];
  lines.forEach(function(line){
    const w = lastWord(line); const k = sig(w);
    var label = null;
    for (var kk in buckets){ if (kk === k) { label = buckets[kk]; break; } }
    if(!label){ label = String.fromCharCode(labelChar++); buckets[k]=label; }
    scheme.push({ line: line, rhymeKey: k, label: label });
  });
  return scheme;
}
