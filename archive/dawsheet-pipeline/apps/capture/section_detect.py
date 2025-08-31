from __future__ import annotations
from typing import List, Any

# Very lightweight n-gram section inference by repeating chord windows

def infer_sections(rows: List[List[Any]], ngram_bars: int = 8) -> List[List[Any]]:
    # rows follow schema; we look at Chord col index 5, Dur_beats index 7 to approximate bars
    # Build a coarse bar index assuming 4 beats/bar; then compute n-grams and tag most frequent as Chorus
    bar = 1
    beat_accum = 0.0
    bar_chords = []  # list of chords per bar
    tmp = []
    for r in rows:
        chord = (r[5] or '').strip()
        dur_beats = float(r[7] or 4.0)
        tmp.append(chord)
        beat_accum += dur_beats
        if beat_accum >= 4.0 - 1e-3:
            # finalize bar
            bar_chords.append(' '.join([t for t in tmp if t]))
            tmp = []
            beat_accum = 0.0
            bar += 1
    if tmp:
        bar_chords.append(' '.join([t for t in tmp if t]))

    # n-gram hashing
    grams = {}
    for i in range(0, max(0, len(bar_chords) - ngram_bars + 1)):
        g = tuple(bar_chords[i:i+ngram_bars])
        if g:
            grams[g] = grams.get(g, 0) + 1
    chorus_range = None
    if grams:
        best = max(grams.items(), key=lambda kv: kv[1])[0]
        # find first occurrence
        for i in range(len(bar_chords) - len(best) + 1):
            if tuple(bar_chords[i:i+len(best)]) == best:
                chorus_range = (i+1, i+len(best))  # bars are 1-indexed
                break

    # Write section label into rows’ Section column (index 6) approximately
    if chorus_range:
        bar = 1
        beat_accum = 0.0
        for r in rows:
            dur_beats = float(r[7] or 4.0)
            if chorus_range[0] <= bar <= chorus_range[1]:
                r[6] = 'Chorus'
            else:
                if r[6] is None:
                    r[6] = ''
            beat_accum += dur_beats
            if beat_accum >= 4.0 - 1e-3:
                beat_accum = 0.0
                bar += 1
    return rows
