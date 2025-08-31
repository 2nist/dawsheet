from __future__ import annotations
import sys
from pathlib import Path
import yaml
from typing import List, Dict, Any

from dawsheet.io.sheets import SheetsClient


def fetch_timeline(client: SheetsClient, tab: str) -> Dict[str, Any]:
    headers = client._get_headers(tab)
    dict_rows = client.read_rows(tab)
    rows = [[r.get(h, '') for h in headers] for r in dict_rows]
    return {"headers": headers, "rows": rows}


def summarize_sections(data: Dict[str, Any]) -> str:
    headers: List[str] = data["headers"]
    rows: List[List[str]] = data["rows"]
    if not headers or not rows:
        return "No header or rows found."
    # Column indices
    def idx(name: str) -> int:
        try:
            return headers.index(name)
        except ValueError:
            return -1
    bar_i = idx('Bar')
    sec_i = idx('Section')
    chord_i = idx('Chord')
    if bar_i < 0 or sec_i < 0:
        return "Timeline missing Bar/Section columns."

    # Build contiguous section runs
    runs = []  # (section, start_bar, end_bar)
    last_sec = None
    start_bar = None
    last_bar = None
    for r in rows:
        # Pad row
        while len(r) <= max(bar_i, sec_i):
            r.append('')
        sec = (r[sec_i] or '').strip()
        try:
            bar = int(float(r[bar_i]))
        except Exception:
            continue
        if last_sec is None:
            last_sec = sec or ''
            start_bar = bar
            last_bar = bar
            continue
        if sec == last_sec and bar == (last_bar + 1 or bar):
            last_bar = bar
        else:
            runs.append((last_sec or '', start_bar, last_bar))
            last_sec = sec or ''
            start_bar = bar
            last_bar = bar
    if last_sec is not None and start_bar is not None and last_bar is not None:
        runs.append((last_sec or '', start_bar, last_bar))

    # Count labels
    counts: Dict[str, int] = {}
    for sec, s, e in runs:
        counts[sec] = counts.get(sec, 0) + (e - s + 1)

    # Build output
    lines = []
    lines.append("Section bar counts:")
    for k, v in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        lines.append(f"  {k or '(blank)'}: {v} bars")

    lines.append("\nFirst 10 contiguous runs:")
    for sec, s, e in runs[:10]:
        lines.append(f"  {sec or '(blank)'}: bars {s}-{e}")

    # Show a few early rows for context
    lines.append("\nSample rows (first 8):")
    for r in rows[:8]:
        chord = r[chord_i] if chord_i >=0 and chord_i < len(r) else ''
        sec = r[sec_i] if sec_i >= 0 and sec_i < len(r) else ''
        bar = r[bar_i]
        lines.append(f"  Bar {bar}: {chord} [{sec}]")

    return "\n".join(lines)


def main(config_path: str = 'config.yaml') -> int:
    root = Path(__file__).resolve().parents[2]
    cfg = yaml.safe_load((root / config_path).read_text(encoding='utf-8'))
    sheet_id = cfg['sheet']['id']
    tab = cfg['sheet'].get('timeline_tab', 'Timeline')

        client = SheetsClient(spreadsheet_id=sheet_id)
        data = fetch_timeline(client, tab)
        print(summarize_sections(data))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'config.yaml'))
