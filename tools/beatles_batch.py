#!/usr/bin/env python3
"""Beatles batch -> SongRecord v1 generator (MVP)

Usage:
  python tools/beatles_batch.py --root /path/to/beatles --out outdir
"""
from __future__ import annotations
import argparse
from pathlib import Path
import json
from typing import List, Dict, Any, Optional
import re
import requests


def parse_lab_file(path: Path) -> List[Dict[str, Any]]:
    """Parse a simple Isophonics .lab file into list of events {time,label}"""
    out = []
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'): continue
        parts = line.split(None, 1)
        if len(parts) == 1:
            try:
                t = float(parts[0])
                out.append({'time_s': t, 'label': ''})
            except Exception:
                continue
        else:
            try:
                t = float(parts[0])
                lbl = parts[1].strip()
                out.append({'time_s': t, 'label': lbl})
            except Exception:
                # fallback: no numeric time
                out.append({'time_s': 0.0, 'label': line})
    return out


def build_songrecord_from_lab(lab_events: List[Dict[str, Any]], song_id: str, title: str) -> Dict[str, Any]:
    events = []
    for i, e in enumerate(lab_events):
        ev = {
            'beat_abs': e.get('time_s', 0.0),
            'time_s': e.get('time_s', 0.0),
            'timecode': None,
            'chord': e.get('label', ''),
            'section': None,
            'dur_beats': None,
            'dur_s': None,
            'lyric': None,
            'event_id': f"lab-{i}",
        }
        events.append(ev)
    sr = {
        'id': song_id,
        'title': title,
        'artist': None,
        'source': 'beatles-batch',
        'project_id': None,
        'events': events,
    }
    return sr


def infer_metadata_from_path(root: Path, lab: Path) -> Dict[str, Optional[str]]:
    """Infer artist and title from file path and filename using simple heuristics."""
    rel = lab.relative_to(root)
    parent = rel.parent
    artist_guess = None
    title_guess = None
    # Prefer filename pattern: 'Artist - Title' or '01 - Artist - Title'
    fname = lab.stem
    m = re.match(r'^(?:\d+\s*[-_\.]?\s*)?(.+?)\s*[-–—]\s*(.+)$', fname)
    if m:
        artist_guess = m.group(1).strip().replace('_', ' ')
        title_guess = m.group(2).strip().replace('_', ' ')
        return {'artist': artist_guess, 'title': title_guess}
    # fallback: artist from parent folder
    if parent and parent != Path('.'):
        artist_guess = parent.name.replace('_', ' ')
    # title: clean filename
    title_guess = fname.replace('_', ' ').replace('-', ' ').strip()
    if title_guess[:3].isdigit() and title_guess[3:4] in (' ', '_', '-'):
        title_guess = title_guess[4:].strip()
    return {'artist': artist_guess or None, 'title': title_guess or None}


def analyze_batch(root: Path, outdir: Path, post: bool = False, backend_url: Optional[str] = None, sheet_id: Optional[str] = None, tab: Optional[str] = None):
    root = Path(root)
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    project_guess = root.name
    for lab in root.rglob('*.lab'):
        rel = lab.relative_to(root)
        song_id = rel.with_suffix('').as_posix().replace('/', '_')
        # infer metadata
        meta = infer_metadata_from_path(root, lab)
        title = meta.get('title') or lab.stem
        lab_events = parse_lab_file(lab)
        sr = build_songrecord_from_lab(lab_events, song_id, title)
        # metadata heuristics
        if meta.get('artist'):
            sr['artist'] = meta.get('artist')
        sr['project_id'] = project_guess
        # diagnostics
        diag = {
            'songId': song_id,
            'lab_events': len(lab_events),
            'sections': sum(1 for e in lab_events if e.get('label') and not e.get('label').lower().startswith('n')),
            'passed': len(lab_events) > 0,
        }
        # Write the SongRecord as the top-level JSON file and diagnostics as a sidecar.
        out_json = outdir / f"{song_id}.json"
        out_json.write_text(json.dumps(sr, indent=2), encoding='utf-8')
        diag_json = outdir / f"{song_id}.diag.json"
        diag_json.write_text(json.dumps(diag, indent=2), encoding='utf-8')
        print('wrote', out_json, diag_json)
        # Optionally POST to backend import endpoint
        if post and backend_url:
            try:
                url = backend_url.rstrip('/') + '/import/songrecord'
                params = {}
                if sheet_id:
                    params['sheet_id'] = sheet_id
                if tab:
                    params['tab'] = tab
                resp = requests.post(url, json=sr, params=params, timeout=15)
                print('posted', url, 'status', resp.status_code)
            except Exception as e:
                print('post error for', song_id, str(e))


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--post', action='store_true', help='POST generated SongRecords to backend')
    p.add_argument('--backend-url', help='Backend base URL to POST to (e.g. http://localhost:8000)')
    p.add_argument('--sheet-id', help='Optional sheet_id to pass when posting')
    p.add_argument('--tab', help='Optional tab name to pass when posting')
    args = p.parse_args(argv)
    analyze_batch(Path(args.root), Path(args.out), post=bool(args.post), backend_url=args.backend_url, sheet_id=args.sheet_id, tab=args.tab)


if __name__ == '__main__':
    main()
