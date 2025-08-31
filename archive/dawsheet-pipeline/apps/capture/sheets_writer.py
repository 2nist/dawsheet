from __future__ import annotations
from typing import List, Dict, Any
import time

HEADERS = [
    'Bar','Beat','BeatAbs','Time_s','Timecode','Chord','Section','Dur_beats','Dur_s',
    'Lyric','Lyric_conf','Chord_conf','Section_conf','Source','ProjectId','EventId'
]

class SheetsWriter:
    def __init__(self, auth_cfg: Dict[str, Any]):
        # TODO: wire google-auth; MVP stub prints rows
        self.auth_cfg = auth_cfg

    def ensure_headers(self, sheet_id: str, tab: str):
        print(f"[Sheets] ensure headers for {sheet_id}:{tab}: {HEADERS}")

    def append_rows(self, sheet_id: str, tab: str, rows: List[List[Any]]):
        print(f"[Sheets] appending {len(rows)} rows to {sheet_id}:{tab}")
        # In real impl, call spreadsheets.values.batchUpdate
        for r in rows[:3]:
            print("  ", r)
        if len(rows) > 3:
            print(f"  ... {len(rows)-3} more")
