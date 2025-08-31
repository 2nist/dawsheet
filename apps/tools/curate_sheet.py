from __future__ import annotations
"""
Curate a Google Sheet for DAWSheet:
 - Ensure required tabs exist with canonical headers
 - Optionally delete unnecessary tabs (safe by default: only default/empty tabs)

Usage (from repo root):
  python -m apps.tools.curate_sheet --config DAWSheet-Project/config.yaml --dry-run
  python -m apps.tools.curate_sheet --config DAWSheet-Project/config.yaml --apply

Flags:
  --dry-run            Preview actions only (default)
  --apply              Apply changes (create tabs/headers, delete allowed tabs)
  --delete-nonempty    Allow deletion of non-empty non-required tabs (use with care)
"""

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple
import yaml

from dawsheet.io.sheets import SheetsClient, HEADERS as TIMELINE_HEADERS


# Canonical tab headers
SECTIONS_HEADERS = [
    "Name","BarStart","Bars","Style","Conf","SectionId","ProjectId","Chords","LyricsRef","Notes","EventId"
]
GUIDEDRUMS_HEADERS = [
    "Bar","Beat","Sixteenth","Pitch","Velocity","Dur_s","Source","ProjectId","EventId"
]
METADATA_HEADERS = ["Key", "Value"]
CHARTS_HEADERS = ["ProjectId", "Chart", "Updated"]


REQUIRED_TABS: Dict[str, List[str]] = {
    "Timeline": TIMELINE_HEADERS,
    "Sections": SECTIONS_HEADERS,
    "GuideDrums": GUIDEDRUMS_HEADERS,
    "Metadata": METADATA_HEADERS,
    "Charts": CHARTS_HEADERS,
}

# Tabs we will preserve if present, even if not in REQUIRED_TABS
OPTIONAL_SAFE_TABS: List[str] = [
    # Common tabs that may hold useful data
    "Instruments", "Lyrics", "Requests", "Control"
]

# Default Google tabs that are safe to remove if not used
DEFAULT_EMPTY_TAB_NAMES = {"Sheet1", "Sheet2", "Sheet3"}


@dataclass
class DeletionCandidate:
    title: str
    sheet_id: int
    non_empty: bool


def load_cfg(config_path: str) -> dict:
    p = Path(config_path)
    if not p.exists():
        raise FileNotFoundError(f"Config not found: {p}")
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def list_tabs(client: SheetsClient, spreadsheet_id: str) -> List[Tuple[int, str]]:
    svc = client._get_service()
    meta = svc.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    out: List[Tuple[int, str]] = []
    for sh in meta.get("sheets", []):
        props = sh.get("properties", {})
        out.append((props.get("sheetId"), props.get("title")))
    return out


def batch_tabs_nonempty(client: SheetsClient, spreadsheet_id: str, tabs: List[str]) -> Dict[str, bool]:
    """Return map of tab -> has any data rows (beyond header), using a single batchGet call."""
    if not tabs:
        return {}
    svc = client._get_service()
    ranges = [f"{t}!A2:Z2" for t in tabs]
    resp = svc.spreadsheets().values().batchGet(spreadsheetId=spreadsheet_id, ranges=ranges).execute()
    out: Dict[str, bool] = {}
    value_ranges = resp.get("valueRanges", [])
    for i, r in enumerate(value_ranges):
        # If any value present in row 2, consider non-empty
        vals = r.get("values", [])
        has = bool(vals and any(cell != "" for cell in vals[0]))
        # Map back to tab name from the requested ranges
        tab_name = tabs[i] if i < len(tabs) else None
        if tab_name is not None:
            out[tab_name] = has
    # For any missing responses, default to False (empty)
    for t in tabs:
        out.setdefault(t, False)
    return out


def ensure_required(client: SheetsClient, spreadsheet_id: str) -> List[str]:
    ensured: List[str] = []
    for tab, headers in REQUIRED_TABS.items():
    client._set_headers(tab, headers)
    ensured.append(tab)
    return ensured


def compute_deletions(client: SheetsClient, spreadsheet_id: str, allow_delete_nonempty: bool) -> List[DeletionCandidate]:
    candidates: List[DeletionCandidate] = []
    tabs = list_tabs(client, spreadsheet_id)
    required_and_optional = set(REQUIRED_TABS.keys()) | set(OPTIONAL_SAFE_TABS)
    extra = [(sid, title) for sid, title in tabs if title not in required_and_optional]
    extra_titles = [t for _, t in extra]
    nonempty_map = batch_tabs_nonempty(client, spreadsheet_id, extra_titles)
    for sid, title in extra:
        non_empty = nonempty_map.get(title, False)
        # Safe delete if default empty name or empty content; otherwise require explicit allowance
        if (title in DEFAULT_EMPTY_TAB_NAMES or not non_empty) or allow_delete_nonempty:
            candidates.append(DeletionCandidate(title=title, sheet_id=sid, non_empty=non_empty))
    return candidates


def apply_deletions(client: SheetsClient, spreadsheet_id: str, deletions: List[DeletionCandidate]) -> None:
    if not deletions:
        return
    svc = client._get_service()
    req = {
        "requests": [
            {"deleteSheet": {"sheetId": d.sheet_id}} for d in deletions
        ]
    }
    svc.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=req).execute()


def main() -> int:
    ap = argparse.ArgumentParser(description="Curate a DAWSheet: ensure required tabs/headers and clean up extras.")
    ap.add_argument("--config", default="DAWSheet-Project/config.yaml", help="Path to config.yaml with sheet.id and google_auth.credentials_json")
    ap.add_argument("--apply", action="store_true", help="Apply changes (create headers/tabs, delete candidates)")
    ap.add_argument("--dry-run", action="store_true", help="Preview only; do not modify the sheet")
    ap.add_argument("--delete-nonempty", action="store_true", help="Allow deletion of non-empty non-required tabs")
    args = ap.parse_args()

    cfg = load_cfg(args.config)
    sheet_id = cfg["sheet"]["id"]
    client = SheetsClient(spreadsheet_id=sheet_id)

    print(f"Sheet: {sheet_id}")
    # Merge preserve list from config
    preserve_from_cfg = list(cfg.get("sheet", {}).get("preserve_tabs", []) or [])
    if preserve_from_cfg:
        for t in preserve_from_cfg:
            if t not in OPTIONAL_SAFE_TABS:
                OPTIONAL_SAFE_TABS.append(t)
        print("Preserving tabs (config):", ", ".join(preserve_from_cfg))
    ensured = ensure_required(client, sheet_id)
    print("Ensured tabs with headers:", ", ".join(ensured))

    deletions = compute_deletions(client, sheet_id, allow_delete_nonempty=args.delete_nonempty)

    if not deletions:
        print("No unnecessary tabs found.")
    else:
        print("Deletion candidates:")
        for d in deletions:
            flag = "non-empty" if d.non_empty else "empty"
            print(f" - {d.title} (id={d.sheet_id}, {flag})")

    # Report: list non-required tabs that currently contain data
    all_tabs = list_tabs(client, sheet_id)
    nonrequired_titles = [t for _, t in all_tabs if t not in REQUIRED_TABS]
    nonempty_map = batch_tabs_nonempty(client, sheet_id, nonrequired_titles)
    nonreq_nonempty = [t for t in nonrequired_titles if nonempty_map.get(t, False)]
    if nonreq_nonempty:
        print("Non-required, non-empty tabs:")
        for t in nonreq_nonempty:
            print(f" - {t}")
    else:
        print("No non-required non-empty tabs found.")

    do_apply = args.apply and not args.dry_run
    if do_apply and deletions:
        apply_deletions(client, sheet_id, deletions)
        print(f"Deleted {len(deletions)} tab(s).")
    elif deletions:
        print("Run with --apply to delete the above tabs.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
