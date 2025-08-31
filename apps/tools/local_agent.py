from __future__ import annotations
import argparse
import json
import sys
import time
from pathlib import Path
import subprocess
from typing import List, Any

import yaml

from apps.capture.sheets_writer import SheetsWriter


def _get_rows(writer: SheetsWriter, sheet_id: str, tab: str) -> List[List[Any]]:
    svc = writer._get_service()  # internal
    res = svc.spreadsheets().values().get(spreadsheetId=sheet_id, range=f"{tab}!A2:C").execute()
    return res.get('values', [])


def _ensure_tab(writer: SheetsWriter, sheet_id: str, tab: str):
    # Make sure sheet exists
    writer._get_sheet_id(sheet_id, tab)


def _run(cmd: List[str], cwd: Path, background: bool = False):
    if background:
        subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.run(cmd, cwd=cwd, check=False)


def main():
    ap = argparse.ArgumentParser(description="Local Agent to execute DAWSheet actions from Control tab")
    ap.add_argument('--config', required=True)
    ap.add_argument('--tab', default='Control')
    ap.add_argument('--interval', type=float, default=2.0)
    ap.add_argument('--state', help='Path to save agent state (last processed count)')
    args = ap.parse_args()

    cfg_path = Path(args.config).resolve()
    project_root = cfg_path.parent

    cfg = yaml.safe_load(cfg_path.read_text(encoding='utf-8'))
    writer = SheetsWriter(cfg.get('google_auth', {}))
    sheet_id = cfg['sheet']['id']
    tab = args.tab

    # State file
    state_path = Path(args.state) if args.state else (project_root / 'local_agent_state.json')
    if state_path.exists():
        try:
            state = json.loads(state_path.read_text(encoding='utf-8'))
            last = int(state.get('last_count', 0))
        except Exception:
            last = 0
    else:
        last = 0

    _ensure_tab(writer, sheet_id, tab)
    print(f"[agent] watching {sheet_id}:{tab} every {args.interval}s; state at {state_path}")
    while True:
        try:
            rows = _get_rows(writer, sheet_id, tab)
            total = len(rows)
            if total > last:
                new_rows = rows[last:]
                for r in new_rows:
                    key = (r[0] if len(r) > 0 else '').strip().lower()
                    val = (r[1] if len(r) > 1 else '').strip()
                    print(f"[agent] cmd: {key} {val}")
                    if key == 'process_requests':
                        _run([sys.executable, '-m', 'apps.tools.process_requests', '--config', str(cfg_path), '--use-chordify-fetch'], cwd=project_root, background=True)
                    elif key == 'import_midi':
                        # val should be a JSON string: { file, artist, title }
                        try:
                            import json as _json
                            opts = _json.loads(val) if val else {}
                        except Exception:
                            opts = {'file': val}
                        args_list = [sys.executable, '-m', 'apps.tools.import_midi_file', '--config', str(cfg_path), '--file', opts.get('file','')]
                        if opts.get('artist'):
                            args_list += ['--artist', opts['artist']]
                        if opts.get('title'):
                            args_list += ['--title', opts['title']]
                        _run(args_list, cwd=project_root, background=True)
                    elif key == 'format_chart':
                        _run([sys.executable, '-m', 'apps.tools.format_timeline', '--config', str(cfg_path), '--project-id', val], cwd=project_root)
                    elif key == 'reset_timeline':
                        _run([sys.executable, '-m', 'apps.tools.reset_sheet', '--config', str(cfg_path)], cwd=project_root)
                    elif key == 'check_sheet':
                        _run([sys.executable, '-m', 'apps.tools.check_sheets', '--config', str(cfg_path)], cwd=project_root)
                    elif key == 'start_watcher':
                        # background watcher
                        _run([sys.executable, '-m', 'apps.capture.main', '--config', str(cfg_path)], cwd=project_root, background=True)
                    elif key == 'start_chrome':
                        # Try common Chrome paths (Windows)
                        chrome = Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe")
                        if not chrome.exists():
                            chrome = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
                        if chrome.exists():
                            _run([str(chrome), '--remote-debugging-port=9222'], cwd=project_root, background=True)
                        else:
                            print('[agent] Chrome not found')
                    elif key == 'import_csv':
                        csv_path = val or str((Path.home() / 'Downloads' / 'snapped_lyrics.csv').resolve())
                        _run([sys.executable, '-m', 'apps.tools.lyrics_import_to_sheet', '--sheet-id', sheet_id, '--tab', 'Timeline', '--csv', csv_path, '--config', str(cfg_path)], cwd=project_root)
                    elif key == 'create_agent_task':
                        # Register a scheduled task to start the agent at logon
                        task_name = 'DAWSheet Local Agent'
                        tr_cmd = f'"{sys.executable}" -m apps.tools.local_agent --config "{cfg_path}"'
                        try:
                            subprocess.run([
                                'schtasks', '/Create', '/TN', task_name, '/SC', 'ONLOGON',
                                '/TR', tr_cmd, '/RL', 'LIMITED', '/F', '/W', str(project_root)
                            ], check=False)
                            # Append reminder row automatically
                            _run([sys.executable, '-m', 'apps.tools.append_control', str(cfg_path), 'REMINDER', 'Add sidebar button for new task'], cwd=project_root)
                        except Exception as ce:
                            print(f"[agent] failed to create task: {ce}")
                    else:
                        print(f"[agent] unknown command: {key}")
                last = total
                state_path.write_text(json.dumps({'last_count': last}), encoding='utf-8')
        except KeyboardInterrupt:
            print("[agent] stopping")
            break
        except Exception as e:
            print(f"[agent] error: {e}")
        time.sleep(args.interval)


if __name__ == '__main__':
    main()
