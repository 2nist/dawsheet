from __future__ import annotations
import argparse
import yaml
from pathlib import Path
from typing import Dict, List, Any

from dawsheet.io.sheets import SheetsClient


def safe_int(x, default=0):
    try:
        return int(float(x))
    except Exception:
        return default


def backfill_sections(sheet_id: str, writer: SheetsClient) -> Dict[str, Any]:
    # Read Sections and Timeline
    sections = writer.read_rows('Sections')
    timeline = writer.read_rows('Timeline')

    # Build earliest bar by section name from Timeline
    earliest_bar: Dict[str, int] = {}
    for r in timeline:
        name = (r.get('Section') or '').strip()
        if not name:
            continue
        bar = safe_int(r.get('Bar'), 0)
        if bar <= 0:
            continue
        if name not in earliest_bar or bar < earliest_bar[name]:
            earliest_bar[name] = bar

    # Determine section order by earliest bar
    ordered_section_names = sorted(earliest_bar.keys(), key=lambda n: earliest_bar[n])
    # Map section name to next start bar
    next_start_by_name: Dict[str, int] = {}
    for i, name in enumerate(ordered_section_names):
        if i + 1 < len(ordered_section_names):
            next_start_by_name[name] = earliest_bar[ordered_section_names[i+1]]
        else:
            next_start_by_name[name] = 0  # unknown, will leave Bars as-is if present

    # Current headers for Sections
    # Use private method to retrieve actual header order
    headers = writer._get_headers('Sections')

    updated_rows: List[List[Any]] = []
    changes = 0
    for row in sections:
        name = (row.get('Name') or row.get('sectionName') or '').strip()
        # Prefer Name; fallback to older column if present
        bar_start = safe_int(row.get('BarStart') or 0)
        bars = safe_int(row.get('Bars') or 0)

        # Backfill BarStart if missing
        if (not bar_start or bar_start <= 0) and name in earliest_bar:
            bar_start = earliest_bar[name]
            row['BarStart'] = bar_start
            changes += 1

        # Backfill Bars if missing and we know next start
        if (not bars or bars <= 0) and bar_start > 0:
            next_start = next_start_by_name.get(name, 0)
            if next_start > bar_start:
                bars = max(1, next_start - bar_start)
                row['Bars'] = bars
                changes += 1

        # Recompose row values in the sheet's current header order
        updated_rows.append([row.get(h, '') for h in headers])

    # Write back all rows to Sections (replace existing A2:)
    if sections:
        # Replace rows using set_rows (preserve header)
        writer.set_rows('Sections', [ {headers[i]: r[i] for i in range(len(headers))} for r in updated_rows ], headers=headers)

    return {'updated_cells': len(updated_rows) * len(headers), 'rows': len(updated_rows), 'changes': changes}


def main():
    ap = argparse.ArgumentParser(description='Backfill Sections BarStart and Bars from Timeline.')
    ap.add_argument('--config', required=True, help='Path to config.yaml')
    ap.add_argument('--sheet-id', required=False, help='Override sheet id; defaults to config')
    args = ap.parse_args()

    cfg = yaml.safe_load(Path(args.config).read_text(encoding='utf-8'))
    sheet_id = args.sheet_id or cfg['sheet']['id']
    writer = SheetsClient(spreadsheet_id=sheet_id)

    res = backfill_sections(sheet_id, writer)
    print(f"[sections] backfill complete → rows={res['rows']} changes={res['changes']} cells={res['updated_cells']}")


if __name__ == '__main__':
    main()
