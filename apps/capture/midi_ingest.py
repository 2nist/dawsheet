from __future__ import annotations
from typing import Dict, Any, List, Tuple
from pathlib import Path
import re

import mido
from shared.chord_detect import detect_chord_name


def _build_tempo_map(ppqn: int, tempo_events: List[Tuple[int, int]]) -> List[Dict[str, float]]:
    """Given list of (tick, tempo_us_per_beat) sorted by tick, return tempo_map
    as [{start_s: float, bpm: float}, ...].
    """
    if not tempo_events:
        # default 120 bpm
        return [{"start_s": 0.0, "bpm": 120.0}]
    tempo_events.sort(key=lambda x: x[0])
    # Deduplicate same tick keeping the last tempo at that tick
    dedup: List[Tuple[int, int]] = []
    for t, uspb in tempo_events:
        if dedup and dedup[-1][0] == t:
            dedup[-1] = (t, uspb)
        else:
            dedup.append((t, uspb))
    tempo_events = dedup

    # Compute start_s for each change by accumulating seconds
    start_s_list: List[float] = []
    secs = 0.0
    prev_tick = tempo_events[0][0]
    # If first change not at 0, assume its tempo applies from t=0
    if prev_tick != 0:
        start_s_list.append(0.0)
    for i, (tick, uspb) in enumerate(tempo_events):
        if i == 0:
            start_s_list.append(0.0)
        else:
            dticks = max(0, tick - prev_tick)
            prev_uspb = tempo_events[i-1][1]
            secs += (dticks / float(ppqn)) * (prev_uspb / 1_000_000.0)
            start_s_list.append(secs)
        prev_tick = tick
    tempo_map = [{"start_tick": t, "start_s": s, "bpm": 60_000_000.0 / uspb} for s, (t, uspb) in zip(start_s_list, tempo_events)]
    return tempo_map


def _snap_events_to_downbeats(events: List[Dict[str, Any]], ppqn: int, ts_num: int, ts_den: int,
                              snap_beats: float = 0.9) -> List[Dict[str, Any]]:
    """Snap event tick to nearest bar start (downbeat) if within snap_beats.

    Uses nearest multiple of ticks_per_bar for snapping to avoid gradual drift.
    """
    if not events:
        return events
    ticks_per_bar = int(round(ppqn * float(ts_num) * (4.0 / float(ts_den)))) or max(1, ppqn * ts_num)
    snap_ticks = int(round(ppqn * snap_beats))
    snapped = []
    for ev in sorted(events, key=lambda e: e.get('tick', 0)):
        t = int(ev.get('tick', 0))
        # Pre-quantize to 1/8-beat grid
        q = max(1, int(ppqn // 8))
        t = int(round(t / float(q)) * q)
        # nearest bar start = round(t / ticks_per_bar) * ticks_per_bar
        nearest = int(round(t / float(ticks_per_bar)) * ticks_per_bar)
        if abs(nearest - t) <= snap_ticks:
            t = nearest
        out = dict(ev)
        out['tick'] = max(0, t)
        snapped.append(out)
    # Merge consecutive duplicate labels and dedupe same-tick duplicates
    merged: List[Dict[str, Any]] = []
    prev_text = None
    prev_tick = None
    for ev in snapped:
        txt = (ev.get('text') or ev.get('marker') or '')
        t = ev['tick']
        if merged and merged[-1]['tick'] == t:
            # If same tick and same text, skip; else keep latest
            if (merged[-1].get('text') or merged[-1].get('marker') or '') == txt:
                continue
        if txt == prev_text and prev_tick is not None:
            # merge by skipping
            continue
        merged.append(ev)
        prev_text = txt
        prev_tick = t
    return merged


def tick_to_seconds(tick: int, ppqn: int, tempo_map: List[Dict[str, float]]) -> float:
    """Map an absolute tick to seconds using tempo_map entries with start_tick/start_s/bpm."""
    if not tempo_map:
        # default 120
        return (tick / float(ppqn)) * 0.5
    # Find last tempo segment with start_tick <= tick
    seg = None
    for entry in tempo_map:
        if entry.get('start_tick', 0) <= tick:
            seg = entry
        else:
            break
    if seg is None:
        seg = tempo_map[0]
    dticks = max(0, tick - int(seg.get('start_tick', 0)))
    sec_per_beat = 60.0 / float(seg['bpm'])
    return float(seg['start_s']) + (dticks / float(ppqn)) * sec_per_beat


def parse_midi(path: Path) -> Dict[str, Any]:
    mid = mido.MidiFile(str(path))
    ppqn = mid.ticks_per_beat
    last_tempo = 500000  # default 120 bpm
    ts_num, ts_den = 4, 4

    events = []
    tempo_events: List[Tuple[int, int]] = []
    # Collect note-ons for chord inference: {tick: set(pitches)} and per-note events
    active_notes: Dict[int, set] = {}
    note_rows: List[Dict[str, Any]] = []  # each: {tick_on, tick_off, note, vel, chan, program}
    channel_program: Dict[int, int] = {}  # channel -> program number
    # Gather meta across tracks and track max_tick
    max_tick = 0
    for tr in mid.tracks:
        abs_tick = 0
        for msg in tr:
            abs_tick += msg.time
            if abs_tick > max_tick:
                max_tick = abs_tick
            if msg.is_meta:
                if msg.type == 'set_tempo':
                    last_tempo = msg.tempo
                    tempo_events.append((abs_tick, last_tempo))
                elif msg.type == 'time_signature':
                    ts_num, ts_den = msg.numerator, msg.denominator
                else:
                    # Capture any textual meta content (text/marker/lyrics/cue_marker)
                    txt = getattr(msg, 'text', None)
                    if isinstance(txt, str):
                        kind = 'marker' if msg.type in ('marker','cue_marker') else 'text'
                        if kind == 'marker':
                            events.append({'tick': abs_tick, 'marker': txt})
                        else:
                            events.append({'tick': abs_tick, 'text': txt})
            else:
                # Note events (channel messages)
                if msg.type == 'program_change':
                    channel_program[getattr(msg, 'channel', 0)] = getattr(msg, 'program', 0)
                elif msg.type == 'note_on' and getattr(msg, 'velocity', 0) > 0:
                    # Quantize tick to nearest 1/8 beat for stability (round, not floor)
                    q = int(ppqn // 8) or 1
                    qt = int(round(abs_tick / float(q)) * q)
                    s = active_notes.setdefault(qt, set())
                    s.add(int(msg.note))
                    note_rows.append({'tick_on': abs_tick, 'note': int(msg.note), 'vel': int(msg.velocity), 'chan': int(getattr(msg, 'channel', 0)), 'program': int(channel_program.get(getattr(msg,'channel',0), 0))})
                elif msg.type in ('note_off',) or (msg.type == 'note_on' and getattr(msg, 'velocity', 0) == 0):
                    # Match last open note-on on same channel/note
                    chan = int(getattr(msg, 'channel', 0))
                    pitch = int(getattr(msg, 'note', 0))
                    for row in reversed(note_rows):
                        if 'tick_off' not in row and row['chan'] == chan and row['note'] == pitch:
                            row['tick_off'] = abs_tick
                            break

    bpm = 60_000_000.0 / last_tempo
    events.sort(key=lambda e: e['tick'])
    tempo_map = _build_tempo_map(ppqn, tempo_events)

    # Extract BPM from filename patterns like "*_130_BPM.mid" or "(130 BPM)"
    def _bpm_from_name(name: str) -> float | None:
        # Common patterns: _130_BPM, -130 BPM, (130 BPM), 130BPM
        m = re.search(r"(?i)(\d+(?:\.\d+)?)\s*[_\-\s]*BPM", name)
        if m:
            try:
                v = float(m.group(1))
                if 20.0 <= v <= 300.0:
                    return v
            except ValueError:
                pass
        return None

    bpm_hint = _bpm_from_name(path.name)
    if bpm_hint is not None:
        # If no explicit tempo events or the default 120 is in effect, prefer the filename BPM
        default_120 = (not tempo_events) or (len(tempo_map) == 1 and abs(tempo_map[0]['bpm'] - 120.0) < 1e-6)
        if default_120:
            tempo_map = [{"start_tick": 0, "start_s": 0.0, "bpm": float(bpm_hint)}]
            bpm = float(bpm_hint)

    # Filter out drum channel (10 -> index 9 in 0-based)
    def is_drum_row(r: Dict[str, Any]) -> bool:
        return int(r.get('chan', 0)) == 9

    # Keep only textual events that look like chords; else we'll infer from notes
    def _is_chordish(s: str) -> bool:
        s = (s or '').strip()
        if not s:
            return False
        # Must start with a pitch letter (+ optional accidental)
        if not re.match(r'^[A-Ga-g](?:#|b)?', s):
            return False
        # Must contain a chord quality indicator, a digit, or a slash bass
        if re.search(r'(maj|min|dim|aug|sus|add|\d|/|°)', s, re.IGNORECASE):
            return True
        return False

    chordish_events = []
    for ev in events:
        txt = (ev.get('text') or ev.get('marker') or '').strip()
        if _is_chordish(txt):
            chordish_events.append({'tick': int(ev.get('tick', 0)), 'text': txt})

    # If very few chordish events, attempt note-based inference as well
    need_infer = not chordish_events or len(chordish_events) < 3
    if need_infer:
        # Grid-based sustained-note chord inference
        #  - ignore drums (channel 10)
        #  - evaluate on half-beat grid for stability
        #  - merge consecutive identical chords
        grid_div = 2  # subdivisions per beat; TODO: make configurable
        min_unique = 2
        # Ensure all notes have an off; default to quarter note if missing
        nn = []
        for r in note_rows:
            if int(r.get('chan', 0)) == 9:
                continue
            on = int(r.get('tick_on', 0))
            off = int(r.get('tick_off', on + ppqn))
            if off <= on:
                off = on + max(1, ppqn // 2)
            nn.append({'on': on, 'off': off, 'note': int(r.get('note', 0))})
        if nn:
            # Determine grid step and range
            last_tick = max_tick if max_tick > 0 else max(x['off'] for x in nn)
            step = max(1, int(round(ppqn / grid_div)))
            prev_name = None
            prev_start = 0
            inferred_events = []
            t = 0
            while t <= last_tick:
                pcs = {x['note'] % 12 for x in nn if x['on'] <= t < x['off']}
                name = detect_chord_name(pcs) if len(pcs) >= min_unique else None
                if name != prev_name:
                    if prev_name is not None:
                        inferred_events.append({'tick': prev_start, 'text': prev_name})
                    prev_name = name
                    prev_start = t
                t += step
            if prev_name is not None:
                inferred_events.append({'tick': prev_start, 'text': prev_name})
            # Filter out None labels if any got through
            inferred_events = [e for e in inferred_events if e.get('text')]
            # Prefer downbeat-aligned events within a larger threshold per user (0.9 beats)
            inferred_events = _snap_events_to_downbeats(inferred_events, ppqn, ts_num, ts_den, snap_beats=0.9)
            if inferred_events:
                print(f"[midi] inferred {len(inferred_events)} chord events (grid) for {path.name}")
                # Prefer inferred events when they are richer than sparse textual markers
                if not chordish_events or len(inferred_events) > len(chordish_events):
                    chordish_events = inferred_events
                else:
                    chordish_events.extend(inferred_events)
        if not chordish_events and max_tick > 0:
            # Fallback: synthesize downbeat events per bar across the file length
            ticks_per_bar = int(ppqn * ts_num * (4 / float(ts_den)))
            if ticks_per_bar <= 0:
                ticks_per_bar = ppqn * 4
            num_bars = max(1, int(max_tick // max(1, ticks_per_bar)) + 1)
            for i in range(num_bars):
                chordish_events.append({'tick': i * ticks_per_bar, 'text': 'N.C.'})
            print(f"[midi] synthesized {len(chordish_events)} bar grid events for {path.name}")
    # If still no events after all attempts, log it
    if not chordish_events:
        print(f"[midi] no events derived from {path.name}; file empty?")

    # Compute total duration in seconds using tempo map and max_tick
    try:
        total_s = tick_to_seconds(max_tick, ppqn, tempo_map)
    except Exception:
        # Fallback approximate using default BPM at end
        total_s = (max_tick / float(ppqn)) * (60.0 / max(1e-6, bpm))

    return {
        'ppqn': ppqn,
        'bpm': bpm,
    'bpm_hint': bpm_hint,
        'tempo_map': tempo_map,
        'time_sig': (ts_num, ts_den),
    'events': sorted(chordish_events, key=lambda e: e['tick']),
    'notes': [r for r in note_rows if 'tick_off' in r],
    'duration_s': float(total_s),
    }
