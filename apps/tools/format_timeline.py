from __future__ import annotations
import argparse
import yaml
from pathlib import Path
from collections import defaultdict

from dawsheet.io.sheets import SheetsClient

def format_chart(project_id: str, client: SheetsClient, timeline_tab: str) -> str:
    """Reads Timeline data for a project and generates a formatted chord chart.

    Uses canonical Timeline headers: Time_s, Dur_s, Lyric, Chord, EventType, Section, ProjectId.
    """

    all_rows = client.read_rows(timeline_tab)

    project_rows = [row for row in all_rows if row.get('ProjectId') == project_id]
    if not project_rows:
        return f"No data found for ProjectId: {project_id}"

    # Separate chords and lyric bars, sort by start time (Time_s)
    def f2(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return 0.0

    chords = sorted(
        [row for row in project_rows if row.get('EventType') == 'Chord'],
        key=lambda x: f2(x.get('Time_s')),
    )
    lyric_bars = sorted(
        [row for row in project_rows if row.get('EventType') == 'LyricBar'],
        key=lambda x: f2(x.get('Time_s')),
    )

    if not lyric_bars:
        return f"No 'LyricBar' events found for formatting. ProjectId: {project_id}"

    # Group lyric bars by section (preserve encounter order)
    sections = defaultdict(list)
    for bar in lyric_bars:
        section = (bar.get('Section') or 'Unknown').strip() or 'Unknown'
        sections[section].append(bar)

    # Build the chart string
    chart_lines = [f"Chart for Project: {project_id}\n"]

    for section_name, bars in sections.items():
        chart_lines.append(f"[{section_name}]")

        for bar in bars:
            line_start_s = f2(bar.get('Time_s'))
            line_dur_s = f2(bar.get('Dur_s'))
            line_end_s = line_start_s + line_dur_s
            lyric_text = (bar.get('Lyric') or '').rstrip()

            # Determine rendering width; if no lyrics, use a reasonable width based on beats
            if lyric_text:
                width = len(lyric_text)
            else:
                beats = f2(bar.get('Dur_beats')) or 4.0
                width = max(16, int(beats * 4))

            # Find chords that fall within this lyric bar's time range
            bar_chords = [
                c for c in chords
                if line_start_s <= f2(c.get('Time_s')) < line_end_s
            ]

            chord_line = [' '] * width

            for chord in bar_chords:
                chord_time_s = f2(chord.get('Time_s'))
                chord_name = (chord.get('Chord') or '').strip()

                if not chord_name:
                    continue

                # Calculate position
                rel = (chord_time_s - line_start_s) / line_dur_s if line_dur_s > 0 else 0.0
                rel = max(0.0, min(0.999, rel))
                char_index = int(rel * width)

                # Place the chord label, ensuring it doesn't overflow
                for i, ch in enumerate(chord_name):
                    pos = char_index + i
                    if pos < width:
                        chord_line[pos] = ch
                    else:
                        break

            chart_lines.append("".join(chord_line).rstrip())
            chart_lines.append(lyric_text)
        chart_lines.append("")  # blank line between sections

    return "\n".join(chart_lines)

def main():
    ap = argparse.ArgumentParser(description="Generate a formatted chord chart from Timeline data.")
    ap.add_argument('--config', required=True, help="Path to the config.yaml file.")
    ap.add_argument('--project-id', required=True, help="The ProjectId to generate the chart for.")
    args = ap.parse_args()

    cfg_path = Path(args.config).resolve()
    cfg = yaml.safe_load(cfg_path.read_text(encoding='utf-8'))
    
    sheet_id = cfg['sheet']['id']
    client = SheetsClient(spreadsheet_id=sheet_id)
    timeline_tab = cfg['sheet'].get('timeline_tab', 'Timeline')
    charts_tab = cfg['sheet'].get('charts_tab', 'Charts')
    client._set_headers(charts_tab, ['ProjectId', 'Chart', 'Updated'])
    # Generate the chart
    chart_content = format_chart(args.project_id, client, timeline_tab)
    # Save the chart to the 'Charts' tab
    client.upsert_rows(charts_tab, [{'ProjectId': args.project_id, 'Chart': chart_content, 'Updated': ''}], key_fields=['ProjectId'])
    
    print(f"Chart for ProjectId '{args.project_id}' has been generated and saved to the '{charts_tab}' tab.")
    print("\n--- Chart Preview ---\n")
    print(chart_content)

if __name__ == '__main__':
    main()
