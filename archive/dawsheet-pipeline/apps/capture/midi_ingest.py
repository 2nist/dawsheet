from __future__ import annotations
from typing import Dict, Any
from pathlib import Path

import mido


def parse_midi(path: Path) -> Dict[str, Any]:
    mid = mido.MidiFile(str(path))
    ppqn = mid.ticks_per_beat
    tempo = 500000  # default 120 bpm
    ts_num, ts_den = 4, 4

    events = []
    abs_tick = 0

    # Gather meta across all tracks (first occurrence wins)
    for i, tr in enumerate(mid.tracks):
        abs_tick = 0
        for msg in tr:
            abs_tick += msg.time
            if msg.is_meta:
                if msg.type == 'set_tempo':
                    tempo = msg.tempo
                elif msg.type == 'time_signature':
                    ts_num, ts_den = msg.numerator, msg.denominator
                elif msg.type in ('text','marker'):
                    txt = getattr(msg, 'text', '')
                    if msg.type == 'marker':
                        events.append({'tick': abs_tick, 'marker': txt})
                    else:
                        events.append({'tick': abs_tick, 'text': txt})

    bpm = 60_000_000.0 / tempo
    events.sort(key=lambda e: e['tick'])

    return {
        'ppqn': ppqn,
        'bpm': bpm,
        'time_sig': (ts_num, ts_den),
        'events': events,
    }
