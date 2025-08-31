from __future__ import annotations
from typing import List, Any, Dict, Tuple, Optional

# Enhanced, rule-based section inference built on bar-level features and n-gram repeats.

BarLabel = Tuple[int, int]  # inclusive bar start, inclusive bar end (1-based)


def _bars_from_rows(rows: List[List[Any]], beats_per_bar: float = 4.0) -> List[Dict[str, Any]]:
    """Aggregate timeline rows into bars with features.

    Assumes rows schema indices:
      - Bar idx=0, Beat idx=1 (1-based within bar), Chord idx=5, Dur_beats idx=7
    Returns a list of bars, each with:
      {index, chords: [str], text: 'C G Am F', changes: int, unique: int}
    """
    bars: List[Dict[str, Any]] = []
    cur_idx = None
    acc: List[str] = []
    for r in rows:
        bar_idx = int(r[0]) if r and r[0] else 1
        chord = (r[5] or '').strip()
        if chord.upper() == 'N.C.':
            chord = ''
        if cur_idx is None:
            cur_idx = bar_idx
        if bar_idx != cur_idx:
            if acc:
                text = ' '.join([c for c in acc if c])
            else:
                text = ''
            uniq = []
            prev = None
            changes = 0
            for c in acc:
                if c and c != prev:
                    changes += 1 if prev is not None else 0
                    prev = c
                if c and c not in uniq:
                    uniq.append(c)
            bars.append({
                'index': cur_idx,
                'chords': acc[:],
                'text': text,
                'changes': changes,
                'unique': len(uniq),
            })
            cur_idx = bar_idx
            acc = []
        if chord:
            acc.append(chord)
    # flush last
    if cur_idx is not None:
        text = ' '.join([c for c in acc if c]) if acc else ''
        uniq = []
        prev = None
        changes = 0
        for c in acc:
            if c and c != prev:
                changes += 1 if prev is not None else 0
                prev = c
            if c and c not in uniq:
                uniq.append(c)
        bars.append({
            'index': cur_idx,
            'chords': acc[:],
            'text': text,
            'changes': changes,
            'unique': len(uniq),
        })
    return bars


def _collect_repeating_blocks(bar_texts: List[str], ngram_bars: int, min_occurs: int = 2) -> List[Tuple[Tuple[str, ...], int, List[BarLabel]]]:
    """Return list of (ngram_tuple, count, [ranges]) sorted by count desc.

    Each range is 1-based inclusive (start_bar, end_bar).
    """
    if not bar_texts:
        return []
    grams: Dict[Tuple[str, ...], int] = {}
    positions: Dict[Tuple[str, ...], List[int]] = {}
    for i in range(0, max(0, len(bar_texts) - ngram_bars + 1)):
        g = tuple(bar_texts[i:i + ngram_bars])
        if not any(g):
            continue
        grams[g] = grams.get(g, 0) + 1
        positions.setdefault(g, []).append(i)
    items: List[Tuple[Tuple[str, ...], int, List[BarLabel]]] = []
    for g, cnt in grams.items():
        if cnt >= min_occurs:
            ranges = [(i + 1, i + len(g)) for i in positions.get(g, [])]
            items.append((g, cnt, ranges))
    items.sort(key=lambda x: (-x[1], positions[x[0]][0] if x[0] in positions else 0))
    return items


def _label_range(labels: Dict[int, str], start: int, end: int, name: str):
    for b in range(max(1, start), max(start, end) + 1):
        labels[b] = name


def infer_sections(rows: List[List[Any]], ngram_bars: int = 8, config: Optional[Dict[str, Any]] = None) -> List[List[Any]]:
    """Infer sections and write into rows in-place (col 6 'Section').

    Config keys (all optional):
      sections.chorus_min_occurs: int (default 2)
      sections.intro_max_bars: int (default 4)
      sections.prechorus_max_bars: int (default 4)
      sections.postchorus_bars: int (default 2)
      sections.bridge_min_bars: int (default 4)
      sections.enforce_phrase_multiple: int (default 2)  # round ranges to multiples of phrase bars
      sections.phrase_bars: int (default 4)
    """
    if not rows:
        return rows
    cfg = config or {}
    sec_cfg = cfg.get('sections', {}) if isinstance(cfg, dict) else {}
    chorus_min_occurs = int(sec_cfg.get('chorus_min_occurs', 2))
    intro_max_bars = int(sec_cfg.get('intro_max_bars', 4))
    prechorus_max_bars = int(sec_cfg.get('prechorus_max_bars', 4))
    postchorus_bars = int(sec_cfg.get('postchorus_bars', 2))
    bridge_min_bars = int(sec_cfg.get('bridge_min_bars', 4))
    phrase_bars = int(sec_cfg.get('phrase_bars', 4))
    enforce_phrase_multiple = int(sec_cfg.get('enforce_phrase_multiple', 2))

    # Build bars and text signatures
    bars = _bars_from_rows(rows)
    bar_texts = [b['text'] for b in bars]

    # 1) Detect repeated blocks; choose Chorus and Verse candidates by frequency and order
    reps = _collect_repeating_blocks(bar_texts, ngram_bars=ngram_bars, min_occurs=chorus_min_occurs)
    labels: Dict[int, str] = {}
    chorus_ranges: List[BarLabel] = []
    verse_ranges: List[BarLabel] = []
    if reps:
        top = reps[0]
        # If there's a second distinct block, decide which is chorus vs verse
        second = reps[1] if len(reps) > 1 else None
        if second is None:
            # Only one repeating pattern -> call it Chorus
            chorus_ranges = top[2]
        else:
            # Heuristic: higher count => Chorus; if tie, the one that first appears later is likely Chorus
            (g1, c1, r1), (g2, c2, r2) = top, second
            first1 = r1[0][0] if r1 else 1
            first2 = r2[0][0] if r2 else 1
            if c1 > c2 or (c1 == c2 and first1 > first2):
                chorus_ranges, verse_ranges = r1, r2
            else:
                chorus_ranges, verse_ranges = r2, r1
        # Label chorus occurrences
        for (s, e) in chorus_ranges:
            _label_range(labels, s, e, 'Chorus')
        # Label verse occurrences (don't overwrite chorus)
        for (s, e) in verse_ranges:
            for b in range(s, e+1):
                labels.setdefault(b, 'Verse')
    # 2) Intro/Outro based on extremes of labeled bars
    if labels:
        first_labeled = min(labels.keys())
        last_labeled = max(labels.keys())
        if first_labeled > 1:
            _label_range(labels, 1, first_labeled - 1, 'Intro')
        if last_labeled < len(bars):
            _label_range(labels, last_labeled + 1, len(bars), 'Outro')
    else:
        # No repeats: treat everything as Verse
        for b in range(1, len(bars)+1):
            labels[b] = 'Verse'

    # Fill any remaining unlabeled interior bars as Verse
    for b in range(1, len(bars)+1):
        labels.setdefault(b, 'Verse')

    # Phrase multiple enforcement is intentionally not applied to Intro/Outro capping as per user guidance.

    # Write back to rows: set Section column index 6
    # We need to map each row to its bar index
    for r in rows:
        bar_idx = int(r[0]) if r and r[0] else 1
        name = labels.get(bar_idx, '')
        # don't overwrite existing explicit labels (if any)
        r[6] = name
    return rows
