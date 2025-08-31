from __future__ import annotations
import re
from typing import List, Dict


def parse_lrc_to_words(text: str) -> List[Dict]:
    """Supports [mm:ss.xx] and [mm:ss] tags; returns list of dicts with Lyric and start/end.
    Output rows: {"Lyric", "WordStart_s", "WordEnd_s": None, "EventType":"Lyric"}
    """
    rows: List[Dict] = []
    tag = re.compile(r"\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]")
    for line in text.splitlines():
        times = tag.findall(line)
        if not times:
            continue
        lyric = tag.sub("", line).strip()
        for mm, ss, ms in times:
            t = int(mm) * 60 + int(ss) + (int(ms) / 100 if ms else 0.0)
            if lyric:
                rows.append({
                    "Lyric": lyric,
                    "WordStart_s": float(t),
                    "WordEnd_s": None,
                    "EventType": "Lyric",
                })
    return rows


def parse_vtt_to_words(text: str) -> List[Dict]:
    """Naive WebVTT parser for 00:00:00.000 --> 00:00:02.000 + text lines.
    Returns rows with Lyric and WordStart_s/WordEnd_s.
    """
    rows: List[Dict] = []
    cue = re.compile(r"(\d{2}):(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}\.\d{3})")
    lines = iter(text.splitlines())
    for line in lines:
        m = cue.match(line.strip())
        if not m:
            continue
        h1, m1, s1, h2, m2, s2 = m.groups()

        def t(h: str, m: str, s: str) -> float:
            sec, ms = s.split(".")
            return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000.0

        start = t(h1, m1, s1)
        end = t(h2, m2, s2)
        payload = []
        for ln in lines:
            if not ln.strip():
                break
            payload.append(ln)
        lyric = " ".join(payload).strip()
        if lyric:
            rows.append({
                "Lyric": lyric,
                "WordStart_s": float(start),
                "WordEnd_s": float(end),
                "EventType": "Lyric",
            })
    return rows
