import argparse
from __future__ import annotations
import sys
from pathlib import Path
import yaml

from dawsheet.io.sheets import SheetsClient


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', default='config.yaml')
    args = ap.parse_args()
    cfg = yaml.safe_load(Path(args.config).read_text(encoding='utf-8'))
    sheet_id = cfg['sheet']['id']
    client = SheetsClient(spreadsheet_id=sheet_id)
    timeline_tab = cfg['sheet'].get('timeline_tab', 'Timeline')
    inst_tab = cfg['sheet'].get('instruments_tab', 'Instruments')
    drum_tab = cfg['sheet'].get('drums_tab', 'Drums')

    # Ensure headers exist
    client.ensure_headers(timeline_tab, [])
    client._set_headers(inst_tab, ['TickOn','TickOff','Chan','Program','Note','Vel','PPQN','ProjectId'])
    client._set_headers(drum_tab, ['TickOn','TickOff','Note','Name','Vel','PPQN','ProjectId'])

    # Clear data rows (keeping headers) by replacing rows with empty set
    client.set_rows(timeline_tab, [], headers=client._get_headers(timeline_tab))


if __name__ == '__main__':
    main()
