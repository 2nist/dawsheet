from __future__ import annotations
import re

_FLAT_TO_SHARP = {'Ab':'G#','Bb':'A#','Db':'C#','Eb':'D#','Gb':'F#'}

def normalize_symbol(s: str) -> str:
    if not s:
        return ''
    s = s.strip()
    s = s.replace('♯','#').replace('♭','b')
    s = s.replace('–','-').replace('—','-').replace('−','-')
    # Collapse spaces
    s = re.sub(r'\s+', ' ', s)
    # Uppercase leading note name, keep suffix
    m = re.match(r'^\s*([A-Ga-g])([#b]?)(.*)$', s)
    if not m:
        return s
    root = m.group(1).upper() + m.group(2)
    tail = m.group(3) or ''
    # Convert flats in root to the sharp enharmonic for consistency
    if len(root) == 2 and root[1] == 'b':
        root = _FLAT_TO_SHARP.get(root, root)
    # Common aliases
    tail = tail.replace('maj', 'maj').replace('min', 'm')
    tail = tail.replace('min7', 'm7').replace('maj9', 'maj9')
    tail = tail.replace('sus4', 'sus4').replace('sus2', 'sus2')
    tail = tail.replace('dim', 'dim').replace('aug', '#5')
    # Housekeeping
    tail = tail.strip()
    return (root + tail).strip()
