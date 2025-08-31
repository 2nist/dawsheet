from __future__ import annotations
import argparse
from pathlib import Path
import yaml

from apps.capture.main import Config, process_midi
from dawsheet.io.sheets import SheetsClient
from apps.tools.format_timeline import format_chart


def main():
    ap = argparse.ArgumentParser(description="Import a local MIDI file, write Timeline, and format chart")
    ap.add_argument('--config', required=True)
    ap.add_argument('--file', required=True, help='Path to local .mid file')
    ap.add_argument('--artist', default='')
    ap.add_argument('--title', default='')
    args = ap.parse_args()

    cfg_path = Path(args.config).resolve()
    midi_path = Path(args.file).resolve()

    if not midi_path.exists():
        raise FileNotFoundError(f"MIDI not found: {midi_path}")

    cfg_data = yaml.safe_load(cfg_path.read_text(encoding='utf-8'))
    cfg = Config(**cfg_data)

    # Override artist/title if provided
    if args.artist:
        cfg.project = {**cfg.project, 'artist': args.artist}
    if args.title:
        cfg.project = {**cfg.project, 'title': args.title}

    writer = SheetsWriter(cfg.google_auth)
    sheet_id = cfg.sheet['id']
    timeline_tab = cfg.sheet.get('timeline_tab', 'Timeline')
    charts_tab = cfg.sheet.get('charts_tab', 'Charts')

    # Process MIDI into Timeline (returns project_id)
    project_id = process_midi(midi_path, cfg, writer)

    # Ensure charts tab and save formatted chart
    writer.ensure_tab_headers(sheet_id, charts_tab, ['ProjectId', 'Chart', 'Updated'])
    chart_text = format_chart(project_id, writer, sheet_id, timeline_tab)
    writer.update_chart(sheet_id, charts_tab, project_id, chart_text)

    print(f"[import] DONE → ProjectId={project_id}")


if __name__ == '__main__':
    main()
