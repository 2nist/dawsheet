from __future__ import annotations
import sys
from pathlib import Path
import yaml

# Ensure package imports work when run as a module
from dawsheet.io.sheets import SheetsClient, HEADERS


def main(config_path: str = 'config.yaml') -> int:
    root = Path(__file__).resolve().parents[2]
    cfg = yaml.safe_load((root / config_path).read_text(encoding='utf-8'))
    sheet_id = cfg['sheet']['id']
    tab = cfg['sheet'].get('timeline_tab', 'Timeline')

    client = SheetsClient(spreadsheet_id=sheet_id)
    # Ensure tab and headers exist/are upgraded
    client.ensure_headers(tab, HEADERS)
    header = client._get_headers(tab)
    rows = client.read_rows(tab)[:5]

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
