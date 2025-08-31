from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional

from apps.capture.midi_ingest import parse_midi
from apps.adv.lyrics_lrclib_ingest import fetch_lrc, parse_lrc_to_words
from apps.adv.lyrics_utils import find_global_offset, snap_words_to_grid, rows_to_timeline_csv
from apps.adv.pickup_estimator import estimate_pickup_beats


def _parse_meta_from_name(name: str) -> Dict[str, Optional[str]]:
    base = Path(name).stem
    # Remove trailing BPM tokens and copy suffixes like (1)
    base = re.sub(r"(?i)[_\-\s]*\(?\d+(?:\.\d+)?\)?[_\-\s]*BPM.*$", "", base)
    base = re.sub(r"\s*\(\d+\)$", "", base)
    # Try patterns like: Artist - Title.mid or Artist_Title.mid
    bpm = None
    m = re.search(r"(?i)(\d+(?:\.\d+)?)\s*BPM", base)
    if m:
        bpm = m.group(1)
    # Artist - Title
    m2 = re.search(r"^(?P<artist>[^-\_\(\[]+)\s*[-_]\s*(?P<title>[^\(\[]+)", base)
    artist = (m2.group('artist').strip() if m2 else None)
    title = (m2.group('title').strip() if m2 else None)
    # Fallback: Chordify_Title_-_Artist (Chordify often uses Title-Artist-Lyrics)
    if not artist or not title:
        base2 = base
        if base2.lower().startswith('chordify'):
            # Strip leading 'Chordify' and common suffix tokens
            base2 = re.sub(r"(?i)^chordify[_\-\s]*", "", base2)
            base2 = re.sub(r"(?i)(?:_?lyrics|_?time[_\-]?aligned|_?official|_?audio)", "", base2)
            base2 = base2.replace("__", "_").strip("_ -")
            parts = [p for p in re.split(r"[_]", base2) if p]
            if parts:
                hy = parts[0]
                tokens = [t for t in hy.split('-') if t]
                # Remove common noise tokens from consideration
                noise = {"lyrics", "official", "video", "audio", "from", "time", "aligned"}
                clean_tokens = [t for t in tokens if t.lower() not in noise]

                cand_artist = None
                cand_title = None

                if clean_tokens:
                    # Heuristic A: If a trailing noise token like 'lyrics' existed originally,
                    # treat the last 2-3 tokens before it as the artist (common: Pink-Floyd-Lyrics)
                    has_lyrics = any(t.lower() == 'lyrics' for t in tokens)
                    if has_lyrics and len(clean_tokens) >= 3:
                        # Consider last 2 tokens as artist; if they start with 'The', include 3
                        last2 = clean_tokens[-2:]
                        last3 = clean_tokens[-3:]
                        if last3[0].lower() == 'the':
                            artist_tokens = last3
                            title_tokens = clean_tokens[:-3]
                        else:
                            artist_tokens = last2
                            title_tokens = clean_tokens[:-2]
                        cand_artist = ' '.join(artist_tokens).strip()
                        cand_title = ' '.join(title_tokens).replace('-', ' ').strip()
                    # Heuristic B: If we detect a known pattern Title-Artist (no explicit 'lyrics'),
                    # prefer taking the last 2-3 tokens as artist as well (e.g., ...-Pink-Floyd)
                    if not cand_artist and len(clean_tokens) >= 3:
                        last2 = clean_tokens[-2:]
                        last3 = clean_tokens[-3:]
                        if last3[0].lower() == 'the':
                            artist_tokens = last3
                            title_tokens = clean_tokens[:-3]
                        else:
                            artist_tokens = last2
                            title_tokens = clean_tokens[:-2]
                        cand_artist = ' '.join(artist_tokens).strip()
                        cand_title = ' '.join(title_tokens).replace('-', ' ').strip()

                    # Fallback Heuristic C: Original (first tokens as artist)
                    if not cand_artist:
                        if clean_tokens[0].lower() == 'the' and len(clean_tokens) >= 3:
                            artist_tokens = clean_tokens[:3]
                        elif len(clean_tokens) >= 2:
                            artist_tokens = clean_tokens[:2]
                        else:
                            artist_tokens = clean_tokens[:1]
                        cand_artist = ' '.join(artist_tokens).strip()
                        cand_title = ' '.join(clean_tokens[len(artist_tokens):]).replace('-', ' ').strip()

                # If title empty, try the next underscore part as title
                if (not cand_title or not cand_title.strip()) and len(parts) >= 2:
                    cand_title = parts[1].replace('-', ' ').strip()

                # Cleanup common noise in title
                if cand_title:
                    cand_title = re.sub(r"(?i)\b(official|lyrics|video|audio|from)\b", " ", cand_title).strip()
                    cand_title = re.sub(r"\s+", " ", cand_title)

                if cand_title:
                    title = title or cand_title
                if cand_artist:
                    artist = artist or cand_artist
    return {"artist": artist, "title": title, "bpm": bpm}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--midi', required=True)
    ap.add_argument('--artist')
    ap.add_argument('--title')
    ap.add_argument('--project-id', required=True)
    ap.add_argument('--snap', choices=['1/4','1/8'], default='1/4')
    ap.add_argument('--out', help='Output directory for artifacts (defaults next to MIDI)')
    args = ap.parse_args()

    midi_path = Path(args.midi)
    info = parse_midi(midi_path)
    tempo_map = info.get('tempo_map') or [{"start_s": 0.0, "bpm": float(info.get('bpm', 120.0))}]
    ts_num, ts_den = info.get('time_sig', (4,4))

    meta = _parse_meta_from_name(midi_path.name)
    artist = args.artist or meta.get('artist') or ''
    title = args.title or meta.get('title') or ''
    bpm_hint = meta.get('bpm')

    out_dir = Path(args.out) if args.out else midi_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write tempo_map.json and grid_info.json
    (out_dir / 'tempo_map.json').write_text(json.dumps(tempo_map, indent=2))
    grid_info = {"ts_num": int(ts_num), "ts_den": int(ts_den), "pickup_beats": 0.0, "bpm_hint": (float(bpm_hint) if bpm_hint else None)}
    try:
        grid_info["pickup_beats"] = float(estimate_pickup_beats(tempo_map, int(ts_num)))
    except Exception:
        grid_info["pickup_beats"] = 0.0
    (out_dir / 'grid_info.json').write_text(json.dumps(grid_info, indent=2))

    # Fetch LRCLIB
    if not artist or not title:
        print('[lyrics] Missing artist/title; cannot query LRCLIB')
        return
    duration_hint = None
    try:
        duration_hint = float(info.get('duration_s')) if info.get('duration_s') is not None else None
    except Exception:
        duration_hint = None
    lrc = fetch_lrc(artist, title, duration_s=duration_hint)
    if not lrc:
        print(f"[lyrics] No LRCLIB result for {artist} - {title}. Exiting without CSV.")
        return
    words = parse_lrc_to_words(lrc)
    if not words:
        print('[lyrics] LRC parsed but no words; exiting.')
        return

    snap_div = 4 if args.snap == '1/4' else 8
    off = find_global_offset(words, tempo_map, int(ts_num), float(grid_info['pickup_beats']), snap_div=snap_div)
    for w in words:
        if w.get('WordStart_s') is not None:
            w['WordStart_s'] = float(w['WordStart_s']) + off
        if w.get('WordEnd_s') is not None:
            w['WordEnd_s'] = float(w['WordEnd_s']) + off
        w['Lyric_conf'] = float(w.get('Lyric_conf', 0.95))

    snapped = snap_words_to_grid(words, tempo_map, int(ts_num), float(grid_info['pickup_beats']), snap_div=snap_div)
    # Set source and project id during CSV write
    csv_path = out_dir / 'snapped_lyrics.csv'
    n = rows_to_timeline_csv(snapped, str(csv_path), args.project_id, source='lrclib')
    print(f"[lyrics] LRCLIB lyrics snapped: {n} rows → {csv_path}")


if __name__ == '__main__':
    main()
