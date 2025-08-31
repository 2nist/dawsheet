from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime
import yaml

from apps.capture.sheets_writer import SheetsWriter


def main(config_path: str, key: str, value: str) -> int:
    cfg = yaml.safe_load(Path(config_path).read_text(encoding='utf-8'))
    writer = SheetsWriter(cfg.get('google_auth', {}))
    sheet_id = cfg['sheet']['id']
    tab = 'Control'
    # Ensure headers
    headers = ['Key','Value','Updated']
    writer.ensure_tab_headers(sheet_id, tab, headers)
    # Append row
    now = datetime.now().isoformat(sep=' ', timespec='seconds')
    writer.append_rows_with_headers(sheet_id, tab, headers, [[key, value, now]])
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('Usage: python -m apps.tools.append_control <config.yaml> <Key> <Value>')
        sys.exit(1)
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3]))
