from __future__ import annotations
import argparse
from pathlib import Path
import sys

from apps.tools.ingest_from_chordify_midi import main as ingest_main
from apps.tools.lyrics_import_to_sheet import main as import_main


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--midi', required=True)
    ap.add_argument('--project-id', required=True)
    ap.add_argument('--sheet-id', required=True)
    ap.add_argument('--artist')
    ap.add_argument('--title')
    ap.add_argument('--snap', choices=['1/4','1/8'], default='1/4')
    ap.add_argument('--service-account')
    args, unknown = ap.parse_known_args()

    # Run ingest step (writes snapped_lyrics.csv next to MIDI)
    midi_path = Path(args.midi)
    out_dir = midi_path.parent
    sys.argv = [sys.argv[0], '--midi', str(midi_path), '--project-id', args.project_id, '--snap', args.snap, '--out', str(out_dir)]
    if args.artist:
        sys.argv += ['--artist', args.artist]
    if args.title:
        sys.argv += ['--title', args.title]
    ingest_main()

    csv_path = out_dir / 'snapped_lyrics.csv'
    if not csv_path.exists():
        print('[wrap] No snapped_lyrics.csv produced (likely LRCLIB not found). Exiting.')
        return
    # Run import step
    sys.argv = [sys.argv[0], '--sheet-id', args.sheet_id, '--tab', 'Timeline', '--csv', str(csv_path)]
    if args.service_account:
        sys.argv += ['--service-account', args.service_account]
    import_main()


if __name__ == '__main__':
    main()
