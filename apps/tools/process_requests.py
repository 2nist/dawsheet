from __future__ import annotations
import argparse
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import yaml

from apps.capture.main import Config, process_midi
from apps.capture.sheets_writer import SheetsWriter
from apps.tools.request_song import _find_best_midi


def _get_service(writer: SheetsWriter):
    return writer._get_service()  # type: ignore[attr-defined]


def _get_headers(svc, sheet_id: str, tab: str) -> List[str]:
    res = svc.spreadsheets().values().get(spreadsheetId=sheet_id, range=f"{tab}!1:1").execute()
    vals = res.get('values', [])
    return vals[0] if vals else []


def _get_rows(svc, sheet_id: str, tab: str) -> List[List[Any]]:
    res = svc.spreadsheets().values().get(spreadsheetId=sheet_id, range=f"{tab}!A2:Z").execute()
    return res.get('values', [])


def _set_row_status(svc, sheet_id: str, tab: str, header_idx: Dict[str, int], row_num: int, status: str, result: str, project_id: str):
    # row_num is 2-based (A2 is first data row). We'll write E..G by header indices if available
    statuses = {
        'Status': status,
        'Result': result,
        'ProjectId': project_id,
    }
    # Build the row values aligned to headers E..G region
    # We'll issue three separate updates to simplify
    body = {'values': [[status]]}
    col = header_idx.get('Status', 4) + 1  # 0-based -> 1-based
    svc.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=f"{tab}!{_col(col)}{row_num}:{_col(col)}{row_num}",
        valueInputOption='RAW',
        body=body
    ).execute()
    body = {'values': [[result]]}
    col = header_idx.get('Result', 5) + 1
    svc.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=f"{tab}!{_col(col)}{row_num}:{_col(col)}{row_num}",
        valueInputOption='RAW',
        body=body
    ).execute()
    body = {'values': [[project_id]]}
    col = header_idx.get('ProjectId', 6) + 1
    svc.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=f"{tab}!{_col(col)}{row_num}:{_col(col)}{row_num}",
        valueInputOption='RAW',
        body=body
    ).execute()


def _col(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def main():
    ap = argparse.ArgumentParser(description="Process DAWSheet song Requests from the Google Sheet")
    ap.add_argument('--config', required=True)
    ap.add_argument('--downloads', default=str(Path.home() / 'Downloads'))
    ap.add_argument('--tab', default='Requests')
    ap.add_argument('--use-chordify-fetch', action='store_true', help='If no local MIDI found, attempt browser-assisted Chordify fetch')
    args = ap.parse_args()

    cfg_data = yaml.safe_load(Path(args.config).read_text(encoding='utf-8'))
    cfg = Config(**cfg_data)
    writer = SheetsWriter(cfg.google_auth)
    sheet_id = cfg.sheet['id']
    tab = args.tab

    # Use the writer to get all rows as dicts
    all_rows = writer.get_rows_as_dicts(sheet_id, tab)
    if not all_rows:
        print("[requests] No rows to process.")
        return

    downloads = Path(args.downloads)
    processed = 0
    for row_data in all_rows:
        row_idx = row_data.get('_row_idx', -1)
        if row_idx == -1:
            continue

        artist = (row_data.get('Artist') or '').strip()
        title = (row_data.get('Title') or '').strip()
        status = (row_data.get('Status') or '').strip().upper()

        if not artist or not title:
            continue
        if status not in ('', 'PENDING'):
            continue

        try:
            # Update status to WORKING
            writer.update_request_status(sheet_id, tab, row_idx, 'WORKING', 'Searching for MIDI...')

            # Try to locate local MIDI first
            midi_path = _find_best_midi(downloads, artist, title)
            if not midi_path and args.use_chordify_fetch:
                writer.update_request_status(sheet_id, tab, row_idx, 'WORKING', 'Attempting Chordify download...')
                # Attempt Chordify fetch via subprocess
                cmd = [
                    str(Path(__file__).resolve().parents[2] / '.venv' / 'Scripts' / 'python.exe'),
                    '-m', 'apps.tools.chordify_fetch',
                    '--artist', artist,
                    '--title', title,
                    '--config', str(Path(args.config).resolve()),
                ]
                subprocess.run(cmd, check=False, capture_output=True, text=True)
                midi_path = _find_best_midi(downloads, artist, title)

            if not midi_path:
                writer.update_request_status(sheet_id, tab, row_idx, 'ERROR', 'No MIDI found or downloaded')
                continue

            # Process into Timeline with artist/title override in cfg
            writer.update_request_status(sheet_id, tab, row_idx, 'WORKING', f'Processing {midi_path.name}...')
            cfg.project = {**cfg.project, 'artist': artist, 'title': title}
            
            # process_midi returns the generated project_id
            project_id = process_midi(midi_path, cfg, writer)

            writer.update_request_status(sheet_id, tab, row_idx, 'DONE', f'Success: {midi_path.name}', project_id)
            processed += 1
        except Exception as e:
            # Capture the full traceback for better debugging
            import traceback
            err_msg = f"Error: {e}\n{traceback.format_exc()}"
            writer.update_request_status(sheet_id, tab, row_idx, 'ERROR', err_msg)
            continue
    print(f"[requests] Processed {processed} request(s)")


if __name__ == '__main__':
    main()
