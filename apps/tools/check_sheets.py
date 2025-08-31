from __future__ import annotations
import sys
from pathlib import Path
import yaml

# Ensure package imports work when run as a module
from apps.capture.sheets_writer import SheetsWriter, HEADERS


def main(config_path: str = 'config.yaml') -> int:
    root = Path(__file__).resolve().parents[2]
    cfg = yaml.safe_load((root / config_path).read_text(encoding='utf-8'))
    sheet_id = cfg['sheet']['id']
    tab = cfg['sheet'].get('timeline_tab', 'Timeline')

    writer = SheetsWriter(cfg.get('google_auth', {}))

    # Ensure tab and headers exist/are upgraded
    writer.ensure_headers(sheet_id, tab)

    # Fetch header and a few data rows for display
    svc = writer._get_service()  # using internal for quick check
    header = writer._get_headers(sheet_id, tab)
    rng = f"{tab}!A2:U6"  # first 5 data rows within first 21 columns
    resp = svc.spreadsheets().values().get(spreadsheetId=sheet_id, range=rng).execute()
    rows = resp.get('values', [])

    print("Sheet:", sheet_id)
    print("Tab:", tab)
    print("Header:", header or '(empty)')
    print(f"Sample rows ({len(rows)}):")
    for r in rows:
        print(r)
    if not header:
        print("Note: Header was empty; set to", HEADERS)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'config.yaml'))
