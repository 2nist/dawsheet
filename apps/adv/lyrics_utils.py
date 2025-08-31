from __future__ import annotations
from typing import List, Dict, Tuple, Optional
import csv
import math
import uuid

from shared.timing import map_time_to_beat
from shared.timing import bpm_at_time


def timecode(t: float) -> str:
    m = int(t // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    return f"{m:02d}:{s:02d}.{ms:03d}"


def _nearest_grid_time(t: float, tempo_map: List[Dict[str, float]], ts_num: int, pickup_beats: float, snap_div: int) -> float:
    bar, beat, _ = map_time_to_beat(t, tempo_map, ts_num, pickup_beats)
    # snap beat to nearest fraction 1/snap_div
    whole = math.floor(beat)
    frac = beat - whole
    snapped_frac = round(frac * snap_div) / snap_div
    snapped_beat = whole + snapped_frac
    # map snapped bar/beat back to absolute seconds via inverse by sampling neighbor times
    # Simple: iterate small epsilon around t to find nearest grid time within ±1 beat duration
    # For our use, mapping exact time isn't critical; we keep original t for Time_s, snapping is reflected via bar/beat.
    return t


def find_global_offset(words: List[Dict], tempo_map: List[Dict[str, float]], ts_num: int, pickup_beats: float, snap_div: int = 4) -> float:
    """Estimate global offset seconds to align words to nearest grid.

    Uses robust median of (grid_time - word_time). We approximate grid_time via same t
    since map_time_to_beat already references tempo_map; the offset acts as a constant shift.
    Clamp to ±1.5s to avoid wild corrections.
    """
    if not words:
        return 0.0
    diffs = []
    for w in words:
        t = float(w.get("WordStart_s") or 0.0)
        # approximate target grid time by computing bar/beat and reconstituting to nearest grid fraction in beats
        bar, beat, _ = map_time_to_beat(t, tempo_map, ts_num, pickup_beats)
        whole = math.floor(beat)
        frac = beat - whole
        snapped_frac = round(frac * snap_div) / snap_div
        # convert snapped delta in beats to seconds using local bpm
        # local bpm from tempo_map at time t
        from shared.timing import bpm_at_time
        bpm = bpm_at_time(t, tempo_map)
        sec_per_beat = 60.0 / max(1e-6, bpm)
        delta_beats = (snapped_frac - frac)
        grid_time = t + (delta_beats * sec_per_beat)
        diffs.append(grid_time - t)
    diffs.sort()
    med = diffs[len(diffs)//2]
    return float(max(-1.5, min(1.5, med)))


def snap_words_to_grid(words: List[Dict], tempo_map: List[Dict[str, float]], ts_num: int, pickup_beats: float, snap_div: int = 4) -> List[Dict]:
    """Snap words to grid, assigning Bar, Beat, BeatAbs, Time_s, SubIdx, Melisma.

    - Beat is snapped to 1/snap_div within the bar (1-based beat number with fractional step).
    - SubIdx is 0..snap_div-1 for the snapped fraction within the beat.
    - Melisma is 1 if the word spans into the next sub-beat boundary, else 0.
    """
    out: List[Dict] = []
    for w in words:
        start = float(w.get("WordStart_s") or 0.0)
        end = float(w.get("WordEnd_s") or (start + 0.25))
        bar, beat, beat_abs = map_time_to_beat(start, tempo_map, ts_num, pickup_beats)
        whole = math.floor(beat)
        frac = beat - whole
        snapped_frac = round(frac * snap_div) / snap_div
        snapped_beat = whole + snapped_frac
        subidx = int(round(snapped_frac * snap_div)) % snap_div
        # melisma: check if end crosses into next sub fraction
        end_bar, end_beat, _ = map_time_to_beat(end, tempo_map, ts_num, pickup_beats)
        end_whole = math.floor(end_beat)
        end_frac = end_beat - end_whole
        end_subidx = int(math.floor(end_frac * snap_div))
        melisma = 1 if (end_bar > bar) or (end_whole > whole) or (end_subidx > subidx) else 0
        out.append({
            "Bar": int(bar),
            "Beat": round(snapped_beat, 3),
            "BeatAbs": round(beat_abs, 3),
            "Time_s": round(start, 3),
            "Timecode": timecode(start),
            "Lyric": w.get("Lyric", ""),
            "Lyric_conf": float(w.get("Lyric_conf", 0.95)),
            "EventType": "Lyric",
            "WordStart_s": round(start, 3),
            "WordEnd_s": round(end, 3),
            "SubIdx": int(subidx),
            "Melisma": int(melisma),
            "Chord": None,
            "Section": None,
            "Dur_beats": None,
            "Dur_s": None,
            "Chord_conf": None,
            "Section_conf": None,
            # Source and ProjectId to be set by caller
        })
    return out


def rows_to_timeline_csv(rows: List[Dict], csv_path: str, project_id: str, source: str) -> int:
    """Write rows (dict) to CSV in Timeline column order. Returns number of rows written."""
    headers = [
        'Bar','Beat','BeatAbs','Time_s','Timecode','Chord','Section','Dur_beats','Dur_s',
        'Lyric','Lyric_conf','EventType','WordStart_s','WordEnd_s','SubIdx','Melisma',
        'Chord_conf','Section_conf','Source','ProjectId','EventId'
    ]
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(headers)
        for r in rows:
            w.writerow([
                r.get('Bar'), r.get('Beat'), r.get('BeatAbs'), r.get('Time_s'), r.get('Timecode'),
                r.get('Chord'), r.get('Section'), r.get('Dur_beats'), r.get('Dur_s'),
                r.get('Lyric'), r.get('Lyric_conf'), r.get('EventType'), r.get('WordStart_s'), r.get('WordEnd_s'),
                r.get('SubIdx'), r.get('Melisma'), r.get('Chord_conf'), r.get('Section_conf'),
                source, project_id, str(uuid.uuid4()),
            ])
    return len(rows)


def rows_to_timeline_lists(rows: List[Dict], project_id: str, source: str) -> List[List]:
    """Convert snapped lyric dict rows to Timeline-ordered row lists.

    Leaves EventId generation to the sheet appender if desired; here we include UUIDs.
    """
    out: List[List] = []
    import uuid as _uuid
    for r in rows:
        out.append([
            r.get('Bar'), r.get('Beat'), r.get('BeatAbs'), r.get('Time_s'), r.get('Timecode'),
            r.get('Chord'), r.get('Section'), r.get('Dur_beats'), r.get('Dur_s'),
            r.get('Lyric'), r.get('Lyric_conf'), r.get('EventType'), r.get('WordStart_s'), r.get('WordEnd_s'),
            r.get('SubIdx'), r.get('Melisma'), r.get('Chord_conf'), r.get('Section_conf'),
            source, project_id, str(_uuid.uuid4()),
        ])
    return out


# --- Grouped lyric utilities ---
def _build_beattime_prefix(tempo_map: List[Dict[str, float]]):
    """Precompute cumulative beats at each tempo change for fast beat->time mapping.

    Returns dict with 'starts' (seconds) and 'beats' (cumulative beats at each start).
    """
    if not tempo_map:
        raise ValueError("tempo_map must have at least one segment")
    starts = [float(seg.get("start_s", 0.0)) for seg in tempo_map]
    beats = [0.0]
    cum = 0.0
    for i in range(1, len(tempo_map)):
        prev = tempo_map[i - 1]
        curr = tempo_map[i]
        dur_s = max(0.0, float(curr.get("start_s", 0.0)) - float(prev.get("start_s", 0.0)))
        bps = float(prev.get("bpm", 120.0)) / 60.0
        cum += dur_s * bps
        beats.append(cum)
    return {"starts": starts, "beats": beats}


def _time_at_beat_abs(beat_abs: float, tempo_map: List[Dict[str, float]]) -> float:
    """Compute wall-clock seconds for an absolute beat index using tempo_map."""
    if not tempo_map:
        return 0.0
    prefix = _build_beattime_prefix(tempo_map)
    starts = prefix["starts"]
    cbeats = prefix["beats"]
    # Find segment where beat_abs falls
    # cbeats is non-decreasing; locate rightmost index with cbeats[i] <= beat_abs
    import bisect as _bisect
    i = _bisect.bisect_right(cbeats, beat_abs) - 1
    i = max(0, min(i, len(tempo_map) - 1))
    seg = tempo_map[i]
    remaining_beats = max(0.0, beat_abs - cbeats[i])
    bps = float(seg.get("bpm", 120.0)) / 60.0
    return float(starts[i]) + (remaining_beats / max(1e-6, bps))


def group_words_by_bar(
    snapped_words: List[Dict],
    tempo_map: List[Dict[str, float]],
    ts_num: int,
    pickup_beats: float,
    joiner: str = " ",
) -> List[Dict]:
    """Aggregate snapped lyric word rows into one Timeline row per bar.

    - Uses downbeat (Beat=1) of each bar for Time_s/Timecode alignment.
    - Lyric is the space-joined words in that bar.
    - Dur_beats is ts_num (one full bar); Dur_s computed from local bpm at bar start.
    - Chord is taken from the first word in the bar that has a Chord label, if any.
    """
    if not snapped_words:
        return []
    # Group words by Bar
    by_bar: Dict[int, List[Dict]] = {}
    for w in snapped_words:
        b = int(w.get("Bar", 0) or 0)
        if b not in by_bar:
            by_bar[b] = []
        by_bar[b].append(w)
    out: List[Dict] = []
    for bar in sorted(by_bar.keys()):
        words = sorted(by_bar[bar], key=lambda x: float(x.get("WordStart_s") or x.get("Time_s") or 0.0))
        if not words:
            continue
        text = joiner.join([str(w.get("Lyric", "")).strip() for w in words if str(w.get("Lyric", "")).strip()])
        if not text:
            continue
        # Compute downbeat time for this bar via absolute beat index
        beat_abs_downbeat = float(pickup_beats) + float(ts_num) * float(max(0, bar - 1))
        t0 = _time_at_beat_abs(beat_abs_downbeat, tempo_map)
        # Duration in seconds for one bar at local bpm
        bpm = bpm_at_time(t0, tempo_map)
        sec_per_beat = 60.0 / max(1e-6, bpm)
        dur_s = float(ts_num) * sec_per_beat
        # Confidence: average of word confidences in bar
        confs = [float(w.get("Lyric_conf", 0.95)) for w in words if w.get("Lyric_conf") is not None]
        avg_conf = sum(confs) / len(confs) if confs else 0.95
        # Chord: first available in bar
        chord = None
        for w in words:
            c = w.get("Chord")
            if c:
                chord = c
                break
        out.append({
            "Bar": int(bar),
            "Beat": 1.0,
            "BeatAbs": round(beat_abs_downbeat, 3),
            "Time_s": round(t0, 3),
            "Timecode": timecode(t0),
            "Chord": chord,
            "Section": None,
            "Dur_beats": float(ts_num),
            "Dur_s": round(dur_s, 3),
            "Lyric": text,
            "Lyric_conf": round(avg_conf, 3),
            "EventType": "LyricBar",
            "WordStart_s": round(t0, 3),
            "WordEnd_s": round(t0 + dur_s, 3),
            "SubIdx": 0,
            "Melisma": 0,
            "Chord_conf": None,
            "Section_conf": None,
        })
    return out
