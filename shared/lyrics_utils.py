from __future__ import annotations
from typing import List, Dict


def subindex(words: List[Dict]) -> List[int]:
    """Assign 0-based SubIdx per (Bar, Beat) ordered by WordStart_s.
    Returns list of SubIdx aligned to input order.
    """
    buckets = {}
    for i, w in enumerate(words):
        bar = int(w.get('Bar', 0))
        beat = round(float(w.get('Beat', 0.0)), 6)
        ws = float(w.get('WordStart_s', 0.0) or 0.0)
        buckets.setdefault((bar, beat), []).append((i, ws))
    result = [0] * len(words)
    for key, arr in buckets.items():
        arr.sort(key=lambda x: x[1])
        for sub, (i, _) in enumerate(arr):
            result[i] = sub
    return result


def is_melisma(word: Dict, bpm: float, ts_num: int, threshold_beats: float = 1.0) -> bool:
    """Returns True if the word's duration >= threshold_beats.
    If WordEnd_s is missing, returns False.
    """
    ws = word.get('WordStart_s')
    we = word.get('WordEnd_s')
    if ws is None or we is None:
        return False
    dur_s = max(0.0, float(we) - float(ws))
    beat_s = 60.0 / float(bpm if bpm > 0 else 60.0)
    beats = dur_s / beat_s
    return beats >= float(threshold_beats)
