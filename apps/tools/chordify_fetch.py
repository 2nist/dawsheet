from __future__ import annotations
import argparse
import os
import re
import time
from pathlib import Path
from typing import Optional

import yaml

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except Exception as e:  # pragma: no cover
    sync_playwright = None
    PWTimeout = Exception

from apps.capture.main import Config, process_midi
from dawsheet.io.sheets import SheetsClient


def _recent_download(downloads_dir: Path, since_epoch: float) -> Optional[Path]:
    """Return the most recent .mid file created/modified after 'since_epoch'."""
    best: Optional[Path] = None
    best_time = since_epoch
    for p in downloads_dir.glob("*.mid"):
        mt = p.stat().st_mtime
        if mt >= best_time:
            best = p
            best_time = mt
    return best


def _open_or_new_page(cdp) -> any:
    # Prefer an existing context/page if available
    contexts = cdp.contexts
    if contexts:
        for ctx in contexts:
            pages = ctx.pages
            if pages:
                return pages[0]
        return contexts[0].new_page()
    # Some Chrome builds expose browser.contexts empty; create new default context
    return cdp.new_context().new_page()


def _search_and_download(page, artist: str, title: str) -> None:
    # Navigate to Chordify search page
    q = f"{artist} {title}".strip()
    page.goto(f"https://chordify.net/search/{page.context._impl_obj._browser._connection._transport._ws._url if False else ''}", timeout=30000)
    page.goto("https://chordify.net/", timeout=30000)
    # Use site search UI
    try:
        page.get_by_role("textbox").click(timeout=5000)
    except PWTimeout:
        pass
    page.keyboard.type(q)
    page.keyboard.press("Enter")
    page.wait_for_load_state("domcontentloaded", timeout=30000)
    # Click first reasonable result containing title tokens
    tokens = [t for t in re.split(r"\s+", title.strip()) if t]
    locator = None
    for t in tokens + [title]:
        try:
            locator = page.get_by_role("link", name=re.compile(re.escape(t), re.I))
            if locator and locator.count() > 0:
                locator.first.click(timeout=8000)
                break
        except PWTimeout:
            continue
    # Wait song page
    page.wait_for_load_state("networkidle", timeout=30000)
    # Open download menu and choose MIDI (time aligned)
    try:
        page.get_by_role("button", name=re.compile("download", re.I)).click(timeout=8000)
    except PWTimeout:
        # Try text match
        page.get_by_text(re.compile("download", re.I)).first.click(timeout=8000)
    # Click MIDI (time aligned)
    try:
        page.get_by_role("menuitem", name=re.compile("midi.*time", re.I)).click(timeout=8000)
    except PWTimeout:
        # Fallback: any element with text MIDI and time aligned
        page.get_by_text(re.compile("MIDI.*time.*aligned", re.I)).first.click(timeout=8000)


def main():
    ap = argparse.ArgumentParser(description="Use logged-in Chrome to download Chordify time-aligned MIDI and build Timeline")
    ap.add_argument('--artist', required=True)
    ap.add_argument('--title', required=True)
    ap.add_argument('--config', default=str(Path(__file__).resolve().parents[2] / 'config.yaml'))
    ap.add_argument('--downloads', default=str(Path(os.path.expandvars(r"C:\\Users\\CraftAuto-Sales\\Downloads"))))
    ap.add_argument('--cdp', default='http://localhost:9222', help='Chrome DevTools endpoint')
    args = ap.parse_args()

    if sync_playwright is None:
        print("[chordify] Playwright not installed. pip install playwright; playwright install chromium")
        return

    downloads_dir = Path(args.downloads)
    t0 = time.time()

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(args.cdp)
        page = _open_or_new_page(browser)
        _search_and_download(page, args.artist, args.title)
        # Wait for download file to appear
        for _ in range(60):  # up to ~60s
            dl = _recent_download(downloads_dir, t0)
            if dl and dl.exists():
                midi_path = dl
                break
            time.sleep(1.0)
        else:
            print("[chordify] No new MIDI download detected.")
            return
        print(f"[chordify] Downloaded: {midi_path.name}")

    # Process into Timeline
    cfg_data = yaml.safe_load(Path(args.config).read_text(encoding='utf-8'))
    cfg = Config(**cfg_data)
    writer = SheetsClient(spreadsheet_id=cfg['sheet']['id'])
    process_midi(midi_path, cfg, writer)


if __name__ == '__main__':
    main()
