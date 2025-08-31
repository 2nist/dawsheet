from __future__ import annotations
import sys
from pathlib import Path
import yaml

from apps.capture.main import Config, SheetsWriter, handle_mid, handle_lrc, handle_vtt


def main(path_str: str, config_path: str = 'config.yaml') -> int:
    p = Path(path_str)
    if not p.exists() or p.is_dir():
        print(f"Path not found or is a directory: {p}")
        return 2
    cfg = Config(**yaml.safe_load(Path(config_path).read_text(encoding='utf-8')))
    writer = SheetsWriter(cfg.google_auth)
    suf = p.suffix.lower()
    if suf == '.mid':
        handle_mid(p, cfg, writer)
    elif suf == '.lrc':
        handle_lrc(p, cfg, writer)
    elif suf == '.vtt':
        handle_vtt(p, cfg, writer)
    else:
        print(f"Unsupported extension: {suf}")
        return 3
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python -m apps.tools.ingest_file <path> [config.yaml]")
        sys.exit(1)
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'config.yaml'))
