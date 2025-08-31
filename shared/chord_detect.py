from __future__ import annotations
from typing import Iterable, Optional, Tuple, Set

NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

# Templates defined as intervals from root (0)
TEMPLATES: list[Tuple[str, Set[int]]] = [
    # Sevenths (prioritize richer definitions)
    ("maj7", {0,4,7,11}),
    ("7",    {0,4,7,10}),
    ("m7",   {0,3,7,10}),
    ("m7b5", {0,3,6,10}),
    ("dim7", {0,3,6,9}),
    # Triads
    ("",     {0,4,7}),      # major
    ("m",    {0,3,7}),
    ("dim",  {0,3,6}),
    ("aug",  {0,4,8}),
    # Suspended / power
    ("sus2", {0,2,7}),
    ("sus4", {0,5,7}),
    ("5",    {0,7}),        # power chord
]

ALLOWED_EXTENSIONS = {2,5,9}  # allow 9th/11th/13th color tones without disqualifying


def detect_chord_name(pitches: Iterable[int]) -> Optional[str]:
    """Return chord name like 'Cmaj7', 'Am', 'G7', or None if not enough info.
    Accepts MIDI note numbers or pitch classes; requires at least 2-3 unique pcs.
    """
    pcs = {p % 12 for p in pitches}
    if len(pcs) < 2:
        return None
    # Try each root; score by template match size and penalty for extras
    best: tuple[int, int, str, int] | None = None  # (-match_size, extras, suffix, root)
    for root in range(12):
        rel = {(pc - root) % 12 for pc in pcs}
        for suffix, tpl in TEMPLATES:
            if tpl.issubset(rel):
                extras = len([x for x in rel - tpl if x in ALLOWED_EXTENSIONS])
                # prefer larger templates, fewer extras, and standard suffix order
                score = (-len(tpl), extras, suffix, root)
                if best is None or score < best:
                    best = score
    if not best:
        return None
    _, _, suffix, root = best
    return f"{NOTE_NAMES[root]}{suffix}"
