from __future__ import annotations
import re

def normalize_symbol(s: str) -> str:
    if not s:
        return ''
    s = s.strip()
    s = s.replace('♯','#').replace('♭','b')
    s = s.replace('–','-').replace('—','-').replace('−','-')
    # Basic normalization examples
    s = re.sub(r'([A-G])b', lambda m: {'Ab':'G#','Bb':'A#','Db':'C#','Eb':'D#','Gb':'F#'}.get(m.group(0), m.group(0)), s)
    s = s.replace('maj7+', 'maj7(#11)')
    return s
