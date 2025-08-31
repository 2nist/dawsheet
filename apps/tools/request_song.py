from __future__ import annotations
import argparse
import os
from pathlib import Path
from typing import List, Tuple
import re
import yaml

from apps.capture.main import Config, process_midi
from apps.capture.sheets_writer import SheetsWriter
from apps.tools.ingest_from_chordify_midi import _parse_meta_from_name


def _norm_tokens(s: str) -> List[str]:
    s = (s or "").lower()
    s = re.sub(r"(?i)\b(chordify|official|lyrics?|video|audio|time[-_ ]?aligned|music\s+video)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return [t for t in s.split(" ") if t]


def _score_filename(name: str, artist: str, title: str) -> float:
    toks_name = set(_norm_tokens(name))
    toks_query = set(_norm_tokens(f"{artist} {title}"))
    if not toks_name or not toks_query:
        return 0.0
    inter = len(toks_name & toks_query)
    union = len(toks_name | toks_query)
    return inter / union


def _find_best_midi(search_dir: Path, artist: str, title: str) -> Path | None:
    if not search_dir.exists():
        return None
    cands: List[Tuple[float, float, Path]] = []  # (score, mtime, path)
    for p in search_dir.glob("*.mid"):
        score = _score_filename(p.name, artist, title)
        # Prefer names that contain 'Chordify' slightly
        if 'chordify' in p.name.lower():
            score += 0.05
        mtime = p.stat().st_mtime
        if score > 0:
            cands.append((score, mtime, p))
        else:
            # Try parsing meta for better match
            meta = _parse_meta_from_name(p.name)
            a2 = meta.get('artist') or ''
            t2 = meta.get('title') or ''
            if a2 or t2:
                score2 = _score_filename(f"{a2} {t2}", artist, title)
                if score2 > 0:
                    cands.append((score2 + 0.02, mtime, p))
    if not cands:
        return None
    cands.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return cands[0][2]


def main():
    ap = argparse.ArgumentParser(description="Request a song by artist/title: locate Chordify MIDI and build Timeline with lyrics.")
    ap.add_argument('--artist', required=True)
    ap.add_argument('--title', required=True)
    ap.add_argument('--note', help='Optional hint to help find the right version (ignored for now).')
    ap.add_argument('--config', default=str(Path(__file__).resolve().parents[2] / 'config.yaml'))
    ap.add_argument('--search-dir', default=str(Path(os.path.expandvars(r"C:\\Users\\CraftAuto-Sales\\Downloads"))))
    args = ap.parse_args()

    search_dir = Path(args.search_dir)
    midi_path = _find_best_midi(search_dir, args.artist, args.title)
    if not midi_path:
        print(f"[request] No matching MIDI found in {search_dir} for {args.artist} - {args.title}.")
        print("[request] Tip: Download the Chordify time-aligned MIDI first; we will auto-pick it.")
        return

    # Load config and run the same pipeline as watcher
    cfg_data = yaml.safe_load(Path(args.config).read_text(encoding='utf-8'))
    cfg = Config(**cfg_data)
    writer = SheetsWriter(cfg.google_auth)
    print(f"[request] Using MIDI: {midi_path.name}")
    process_midi(midi_path, cfg, writer)


if __name__ == '__main__':
    main()
