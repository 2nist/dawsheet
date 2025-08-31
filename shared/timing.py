from __future__ import annotations
from typing import Tuple, List, Dict
import bisect
import math


def ticks_to_beats(ticks: int, ppqn: int) -> float:
    return ticks / float(ppqn)


def ticks_to_seconds(ticks: int, ppqn: int, bpm: float) -> float:
    return (ticks / float(ppqn)) * (60.0 / max(1e-6, bpm))


def _build_beattime_prefix(tempo_map: List[Dict[str, float]]):
    """Precompute cumulative beats at each tempo change for fast queries.
    tempo_map: [{"start_s": float, "bpm": float}, ...] sorted by start_s.
    Returns dict with 'starts' and 'beats' cumulative arrays.
    """
    if not tempo_map:
        raise ValueError("tempo_map must have at least one segment")
    starts = [seg["start_s"] for seg in tempo_map]
    beats = [0.0]
    cum = 0.0
    for i in range(1, len(tempo_map)):
        prev = tempo_map[i - 1]
        curr = tempo_map[i]
        dur_s = max(0.0, curr["start_s"] - prev["start_s"])
        bps = prev["bpm"] / 60.0
        cum += dur_s * bps
        beats.append(cum)
    return {"starts": starts, "beats": beats}


def _beats_at_time(t: float, tempo_map: List[Dict[str, float]], prefix=None) -> float:
    """Return absolute beats from t=0..t using tempo_map. Piecewise-linear in segments."""
    if prefix is None:
        prefix = _build_beattime_prefix(tempo_map)
    starts = prefix["starts"]
    cbeats = prefix["beats"]
    i = bisect.bisect_right(starts, t) - 1
    i = max(0, min(i, len(tempo_map) - 1))
    seg = tempo_map[i]
    local_s = t - seg["start_s"]
    bps = seg["bpm"] / 60.0
    return cbeats[i] + max(0.0, local_s) * bps


def map_time_to_beat(t: float, tempo_map: List[Dict[str, float]], ts_num: int,
                     pickup_beats: float = 0.0) -> Tuple[int, float, float]:
    """Map seconds -> (Bar, Beat, BeatAbs) with tempo and pickup compensation.

    - tempo_map: list of segments sorted by start_s: {start_s, bpm}
    - ts_num: beats per bar
    - pickup_beats: beats before Bar 1 downbeat (0 if none)
    """
    if ts_num <= 0:
        raise ValueError("ts_num must be >= 1")
    prefix = _build_beattime_prefix(tempo_map)
    beat_abs = _beats_at_time(t, tempo_map, prefix)
    S = float(pickup_beats)
    rel = beat_abs - S
    if rel < 0:
        bar = 0
        beat = 1 + rel
    else:
        bar = 1 + math.floor(rel / ts_num)
        beat = 1 + (rel % ts_num)
    return int(bar), float(beat), float(beat_abs)


def bpm_at_time(t: float, tempo_map: List[Dict[str, float]]) -> float:
    """Return the BPM in effect at absolute time t given tempo_map."""
    if not tempo_map:
        return 120.0
    starts = [seg["start_s"] for seg in tempo_map]
    i = bisect.bisect_right(starts, t) - 1
    i = max(0, min(i, len(tempo_map) - 1))
    return float(tempo_map[i]["bpm"])

