from __future__ import annotations
from typing import Dict, Any, List
import uuid

from shared.timing import map_time_to_beat, bpm_at_time
from shared.lyrics_utils import subindex, is_melisma


# Stub realtime ASR. Wire faster-whisper or WhisperLive here when ready.
class RealtimeASR:
    def __init__(self, cfg: Dict[str, Any]):
        self.cfg = cfg
        self.running = False

    def start(self):
        self.running = True
        print("[ASR] realtime ASR started (stub)")

    def stop(self):
        self.running = False
        print("[ASR] realtime ASR stopped")

    @staticmethod
    def words_to_rows(words: List[Dict[str, Any]], tempo_map: List[Dict[str, float]],
                      ts_num: int, pickup_beats: float, project_id: str,
                      bpm_default: float) -> List[List[Any]]:
        """Convert a batch of recognized words to Timeline rows (EventType=Lyric).
        Each word dict should contain: {text, start_s, end_s?, conf?}
        For live capture, end_s may be None; fill WordStart_s only.
        SubIdx is computed after mapping to grid by (Bar,Beat).
        """
        # First pass: compute mapping and provisional rows
        tmp_rows: List[List[Any]] = []
        word_objs: List[Dict[str, Any]] = []  # copy with Bar/Beat/Start
        for w in words:
            ws = float(w.get('start_s', 0.0) or 0.0)
            we = w.get('end_s', None)
            conf = w.get('conf', None)
            bar, beat, beat_abs = map_time_to_beat(ws, tempo_map, ts_num, pickup_beats)
            word_objs.append({'Bar': bar, 'Beat': beat, 'WordStart_s': ws, 'WordEnd_s': we})
            row = [
                bar,                 # Bar
                round(beat,3),       # Beat
                round(beat_abs,3),   # BeatAbs
                round(ws,3),         # Time_s (start)
                _timecode(ws),       # Timecode
                None,                # Chord
                None,                # Section
                None,                # Dur_beats
                (round(we-ws,3) if we is not None else None),  # Dur_s
                w.get('text',''),    # Lyric
                (float(conf) if conf is not None else None),   # Lyric_conf
                'Lyric',             # EventType
                round(ws,3),         # WordStart_s
                (round(float(we),3) if we is not None else None), # WordEnd_s
                None,                # SubIdx (fill later)
                None,                # Melisma (fill later)
                None,                # Chord_conf
                None,                # Section_conf
                'asr',               # Source
                project_id,          # ProjectId
                str(uuid.uuid4()),   # EventId
            ]
            tmp_rows.append(row)

        # Compute SubIdx per (Bar,Beat)
        subs = subindex(word_objs)
        for row, wobj, sub in zip(tmp_rows, word_objs, subs):
            row[14] = int(sub)  # SubIdx at index 14
            # Melisma if end is known and spans >= 1 beat using local tempo
            local_bpm = bpm_at_time(wobj['WordStart_s'], tempo_map) if tempo_map else bpm_default
            mel = is_melisma(wobj, bpm=local_bpm, ts_num=ts_num, threshold_beats=1.0)
            row[15] = bool(mel)

        return tmp_rows


def _timecode(t: float) -> str:
    m = int(t//60)
    s = int(t%60)
    ms = int((t - int(t)) * 1000)
    return f"{m:02d}:{s:02d}.{ms:03d}"
