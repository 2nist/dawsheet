// ChordSubTool.gs
// Minimal chord substitution suggestions with light Tonal.js usage and safe fallbacks.

/** Minimal functional map and borrow rules; expand over time. */
const CHORD_FUNCTIONS = {
  I:"maj", ii:"min", iii:"min", IV:"maj", V:"dom", vi:"min", "vii°":"dim"
};
const COMMON_SUBS = {
  V: ["V7","V9","bII7(tritone)"],
  ii: ["ii7","iiø7"],
  I: ["I6","Imaj7","vi"],
  IV: ["ii","iv(borrowed)"],
  vi: ["I6","iii"]
};
const BORROWED = { major: ["bIII","bVI","bVII","iv"], minor: ["bII","bVII","IV"] };

/** Return suggestions for a progression in a given key. */
function cs_suggestSubstitutions(key, progression){
  try { loadTonalJs(); } catch(_) {}
  const hasTonal = typeof Tonal !== 'undefined' && Tonal && Tonal.Key && Tonal.Progression;
  const romanizer = (sym)=>{
    try {
      if (hasTonal) return Tonal.Progression.toRomanNumerals(key || 'C', [String(sym)])[0] || String(sym);
    } catch(_) {}
    return String(sym);
  };
  const out = (progression||[]).map(function(sym,i){
    const rn = romanizer(sym);
    const core = String(rn).replace(/[^IViv]+/g,'');
    const base = COMMON_SUBS[core] || [];
    const borrowed = BORROWED.major || [];
    return { index:i+1, chord:String(sym), roman: rn, suggestions: base.concat(borrowed) };
  });
  return out;
}

/** Sidebar open + server endpoint */
function openChordSubSidebar(){
  const html = HtmlService.createTemplateFromFile('ChordSubUI')
    .evaluate().setTitle('Chord Substitution').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

function cs_getForSong(songId){
  const s = getSong(songId);
  const chords = (s.sections && s.sections[0] && s.sections[0].chords) ? s.sections[0].chords.map(function(c){return c.symbol;}) : [];
  return cs_suggestSubstitutions(s.meta && s.meta.key || 'C', chords);
}
