from __future__ import annotations
import argparse
import csv
from pathlib import Path
from typing import List, Any

from apps.capture.sheets_writer import SheetsWriter, HEADERS
import yaml


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet-id', required=True)
    ap.add_argument('--tab', default='Timeline')
    ap.add_argument('--csv', required=True)
    ap.add_argument('--service-account', help='Path to service account JSON; overrides config')
    ap.add_argument('--config', help='Path to config.yaml to read google_auth.credentials_json if service-account not provided')
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise SystemExit(f"CSV not found: {csv_path}")

    # Read CSV rows and normalize length to HEADERS
    rows: List[List[Any]] = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        r = csv.reader(f)
        hdr = next(r, None)
        for row in r:
            rows.append(row)

    # Resolve credentials path
    creds_json = None
    if args.service_account:
        creds_json = args.service_account
    else:
        cfg_path = args.config or 'config.yaml'
        try:
            cfg = yaml.safe_load(Path(cfg_path).read_text(encoding='utf-8'))
            creds_json = cfg.get('google_auth', {}).get('credentials_json')
        except Exception:
            creds_json = None
    writer = SheetsWriter({"credentials_json": creds_json} if creds_json else {})
    # Ensure headers and append
    writer.ensure_headers(args.sheet_id, args.tab)
    # Pad or trim rows to header length
    fixed = []
    for row in rows:
        # Coerce to header length with None padding
        out = list(row[:len(HEADERS)]) + [None] * max(0, len(HEADERS) - len(row))
        fixed.append(out)
    writer.append_rows(args.sheet_id, args.tab, fixed)
    print(f"[import] Imported {len(fixed)} rows → {args.sheet_id}:{args.tab}")


if __name__ == '__main__':
    main()
