import argparse
from __future__ import annotations
import sys
from pathlib import Path
import yaml

from apps.capture.sheets_writer import SheetsWriter


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', default='config.yaml')
    args = ap.parse_args()
    cfg = yaml.safe_load(Path(args.config).read_text(encoding='utf-8'))
    writer = SheetsWriter(cfg['google_auth'])
    sheet_id = cfg['sheet']['id']
    timeline_tab = cfg['sheet'].get('timeline_tab', 'Timeline')
    inst_tab = cfg['sheet'].get('instruments_tab', 'Instruments')
    drum_tab = cfg['sheet'].get('drums_tab', 'Drums')

    # Ensure headers exist
    writer.ensure_headers(sheet_id, timeline_tab)
    writer.ensure_tab_headers(sheet_id, inst_tab, ['TickOn','TickOff','Chan','Program','Note','Vel','PPQN','ProjectId'])
    writer.ensure_tab_headers(sheet_id, drum_tab, ['TickOn','TickOff','Note','Name','Vel','PPQN','ProjectId'])

    # Clear data rows (keeping headers)
    writer.clear_tab_data(sheet_id, timeline_tab)
    writer.clear_tab_data(sheet_id, inst_tab)
    writer.clear_tab_data(sheet_id, drum_tab)


if __name__ == '__main__':
    main()
