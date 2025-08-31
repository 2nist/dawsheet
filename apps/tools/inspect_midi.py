from __future__ import annotations
import sys
from pathlib import Path
from collections import Counter
import mido


def inspect(path: Path) -> int:
    if not path.exists():
        print(f"File not found: {path}")
        return 2
    mid = mido.MidiFile(str(path))
    ppqn = mid.ticks_per_beat
    length_s = getattr(mid, 'length', None)
    meta_types = Counter()
    text_samples = []
    max_tick = 0
    for tr in mid.tracks:
        abs_tick = 0
        for msg in tr:
            abs_tick += msg.time
            max_tick = max(max_tick, abs_tick)
            if msg.is_meta:
                meta_types[msg.type] += 1
                if msg.type in ("text","marker","lyrics","lyric","cue_marker","track_name"):
                    txt = getattr(msg, 'text', '')
                    if txt:
                        if len(text_samples) < 10:
                            text_samples.append((abs_tick, msg.type, txt))
    print(f"MIDI: {path.name}")
    print(f"PPQN: {ppqn}")
    if length_s is not None:
        print(f"Length_s: {length_s:.3f}")
    print(f"MaxTick: {max_tick}")
    print("Meta counts:")
    for k,v in meta_types.most_common():
        print(f"  {k}: {v}")
    if text_samples:
        print("Samples (tick, type, text):")
        for t, ty, tx in text_samples:
            print(f"  {t}: {ty} -> {tx}")
    else:
        print("No text/marker/lyrics meta found.")
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python -m apps.tools.inspect_midi <path>")
        sys.exit(1)
    sys.exit(inspect(Path(sys.argv[1])))
