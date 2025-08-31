from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime
import yaml

from dawsheet.io.sheets import SheetsClient


def main(config_path: str, key: str, value: str) -> int:
    cfg = yaml.safe_load(Path(config_path).read_text(encoding='utf-8'))
    sheet_id = cfg['sheet']['id']
    client = SheetsClient(spreadsheet_id=sheet_id)
    tab = 'Control'
    # Ensure headers
    headers = ['Key','Value','Updated']
    client._set_headers(tab, headers)
    now = datetime.now().isoformat(sep=' ', timespec='seconds')
    client.append_rows(tab, [{headers[0]: key, headers[1]: value, headers[2]: now}])
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('Usage: python -m apps.tools.append_control <config.yaml> <Key> <Value>')
        sys.exit(1)
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3]))
