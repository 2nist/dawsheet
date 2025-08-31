import json
from pathlib import Path
from typing import Dict, Any, List

import yaml


def words_to_rows(words: List[Dict[str, Any]], tempo_map, ts_num, pickup_beats,
                  project_id: str, bpm_default: float) -> List[List[Any]]:
    """Offline-aligned words to Timeline rows (EventType=Lyric). Mirrors realtime behavior.
    words: [{text,start_s,end_s,conf}]
    """
    from ..capture.realtime_asr import RealtimeASR
    return RealtimeASR.words_to_rows(words, tempo_map, ts_num, pickup_beats, project_id, bpm_default)


def align_main(config_path: str, audio_path: str):
    cfg = yaml.safe_load(Path(config_path).read_text(encoding='utf-8'))
    print("Offline align placeholder. Configure whisperX/aeneas here.")


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    ap.add_argument('--audio', required=True)
    args = ap.parse_args()
    align_main(args.config, args.audio)
