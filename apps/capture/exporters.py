from __future__ import annotations
from typing import List, Any
from pathlib import Path
import json
import csv


def write_exports(out_dir: Path, stem: str, rows: List[List[Any]]):
    out_dir.mkdir(parents=True, exist_ok=True)
    # JSON
    (out_dir / f"{stem}.json").write_text(json.dumps(rows, indent=2), encoding='utf-8')
    # CSV
    with open(out_dir / f"{stem}.csv", 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerows(rows)
    # LRC
    with open(out_dir / f"{stem}.lrc", 'w', encoding='utf-8') as f:
        for r in rows:
            # Only export lyric rows
            if len(r) > 11 and r[11] != 'Lyric':
                continue
            # WordStart_s is at index 12 in the new schema
            t = float((len(r) > 12 and r[12]) or r[3] or 0.0)
            m = int(t//60); s = int(t%60); cs = int((t-int(t))*100)
            tag = f"[{m:02d}:{s:02d}.{cs:02d}]"
            # Lyric text at index 9
            f.write(tag + (str(r[9]) if len(r) > 9 and r[9] else '') + "\n")
    # VTT
    with open(out_dir / f"{stem}.vtt", 'w', encoding='utf-8') as f:
        f.write("WEBVTT\n\n")
        for r in rows:
            if len(r) > 11 and r[11] != 'Lyric':
                continue
            # t0 from WordStart_s; fallback to Time_s. t1 from WordEnd_s; fallback to Dur_s
            t0 = float((len(r) > 12 and r[12]) or r[3] or 0.0)
            t1 = float((len(r) > 13 and r[13]) or (t0 + float(r[8] or 0.5)))
            def tc(t):
                h = int(t//3600); m = int((t%3600)//60); s = t%60
                return f"{h:02d}:{m:02d}:{s:06.3f}".replace('.', ',')
            txt = r[9] if len(r) > 9 and r[9] else ''
            f.write(f"{tc(t0)} --> {tc(t1)}\n{txt}\n\n")
