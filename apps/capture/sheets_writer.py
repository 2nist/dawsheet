from __future__ import annotations
from typing import List, Dict, Any, Optional, Callable
import time
import itertools
import os
from pathlib import Path
import socket

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.service_account import Credentials as SACredentials
from google.auth import exceptions as google_auth_exceptions
import httplib2

# Final Timeline header order
HEADERS: List[str] = [
    'Bar','Beat','BeatAbs','Time_s','Timecode','Chord','Section','Dur_beats','Dur_s',
    'Lyric','Lyric_conf','EventType','WordStart_s','WordEnd_s','SubIdx','Melisma',
    'Chord_conf','Section_conf','Source','ProjectId','EventId'
]


def upgrade_headers(existing: List[str]) -> List[str]:
    """Return a header row upgraded to the final schema.
    If EventType/Word* fields are missing, insert them immediately after Lyric_conf.
    Ensures final order and deduplicates.
    """
    if not existing:
        return list(HEADERS)
    # Normalize: map case-insensitive matches to canonical HEADERS names
    canon_by_lower = {h.lower(): h for h in HEADERS}
    normalized: List[str] = []
    seen_set = set()
    for h in existing:
        canon = canon_by_lower.get(h.lower(), h)
        if canon not in seen_set:
            normalized.append(canon)
            seen_set.add(canon)
    existing = normalized
    # Map existing headers for quick membership checks
    seen = {h: True for h in existing}
    need = ['EventType','WordStart_s','WordEnd_s','SubIdx','Melisma']
    out = list(existing)
    # Insert after Lyric_conf when any of the new fields are missing
    if not all(h in seen for h in need):
        try:
            idx_lc = out.index('Lyric_conf')
            insert_at = idx_lc + 1
        except ValueError:
            # If Lyric_conf is missing, append at the end as fallback
            insert_at = len(out)
        for i, h in enumerate(need):
            if h not in seen:
                out.insert(insert_at + i, h)
                seen[h] = True
    # Now reorder to match final HEADERS where possible
    ordered = [h for h in HEADERS if h in seen]
    # Preserve any unknown trailing headers
    tail = [h for h in out if h not in ordered]
    return ordered + tail


def _retry(fn: Callable, *args, **kwargs):
    """Call fn with retries on common transient errors.

    Note: Pass a callable that performs the request and returns the final result,
    e.g., lambda: svc.spreadsheets().values().get(...).execute()
    so execute() exceptions are also retried.
    """
    delay = 0.5
    last_exc = None
    for attempt in range(6):
        try:
            return fn(*args, **kwargs)
        except HttpError as e:
            # Retry rate limits and transient server errors
            if e.resp is not None and e.resp.status in (429, 500, 503):
                time.sleep(delay)
                delay = min(delay * 2, 8.0)
                last_exc = e
                continue
            raise
        except (
            google_auth_exceptions.TransportError,
            httplib2.error.ServerNotFoundError,
            socket.gaierror,
            TimeoutError,
            ConnectionError,
            OSError,
        ) as e:
            # Network/DNS hiccups; backoff and retry
            time.sleep(delay)
            delay = min(delay * 2, 8.0)
            last_exc = e
            continue
    # Exhausted retries
    if last_exc:
        raise last_exc
    raise RuntimeError("_retry exhausted without exception but no result returned")


class SheetsWriter:
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

    def __init__(self, auth_cfg: Dict[str, Any]):
        self.auth_cfg = auth_cfg
        self._service = None

    def _get_service(self):
        if self._service:
            return self._service
        cred_path = self.auth_cfg.get('credentials_json') or os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if not cred_path:
            raise RuntimeError("Google credentials not configured: set google_auth.credentials_json in config.yaml or the GOOGLE_APPLICATION_CREDENTIALS env var.")
        p = Path(cred_path)
        if not p.exists():
            raise RuntimeError(f"Google credentials file not found at: {p.resolve() if p.is_absolute() else p}")
        creds = SACredentials.from_service_account_file(str(p), scopes=self.SCOPES)
        self._service = build('sheets', 'v4', credentials=creds, cache_discovery=False)
        return self._service

    def _get_sheet_id(self, spreadsheet_id: str, tab: str) -> int:
        svc = self._get_service()
        meta = _retry(lambda: svc.spreadsheets().get(spreadsheetId=spreadsheet_id).execute())
        for sh in meta.get('sheets', []):
            props = sh.get('properties', {})
            if props.get('title') == tab:
                return props['sheetId']
        # Create sheet if missing
        req = {
            'requests': [{
                'addSheet': {
                    'properties': {'title': tab}
                }
            }]
        }
        res = _retry(lambda: svc.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=req).execute())
        sheet_id = res['replies'][0]['addSheet']['properties']['sheetId']
        return sheet_id

    def _get_headers(self, spreadsheet_id: str, tab: str) -> List[str]:
        svc = self._get_service()
        rng = f"{tab}!1:1"
        val = _retry(lambda: svc.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=rng).execute())
        values = val.get('values', [])
        return values[0] if values else []

    def _set_headers(self, spreadsheet_id: str, tab: str, headers: List[str]):
        svc = self._get_service()
        # Ensure enough columns by appending columns if needed
        sheet_id = self._get_sheet_id(spreadsheet_id, tab)
        current_headers = self._get_headers(spreadsheet_id, tab)
        current_cols = len(current_headers) if current_headers else 0
        if len(headers) > current_cols:
            req = {
                'requests': [{
                    'appendDimension': {
                        'sheetId': sheet_id,
                        'dimension': 'COLUMNS',
                        'length': len(headers) - current_cols
                    }
                }]
            }
            _retry(lambda: svc.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=req).execute())
        # Write the header row
        body = {'values': [headers]}
        _retry(lambda: svc.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{tab}!1:1",
            valueInputOption='RAW',
            body=body,
        ).execute())

    def ensure_tab_headers(self, sheet_id: str, tab: str, headers: List[str]):
        try:
            self._get_sheet_id(sheet_id, tab)
            existing = self._get_headers(sheet_id, tab)
            if existing != headers:
                self._set_headers(sheet_id, tab, headers)
        except Exception as e:
            print(f"[Sheets] ensure_tab_headers error: {e}")

    def append_rows_with_headers(self, sheet_id: str, tab: str, headers: List[str], rows: List[List[Any]]):
        # No-op if nothing to append
        if not rows:
            return
        # Pad/truncate each row to match header length
        try:
            current = self._get_headers(sheet_id, tab)
            if not current:
                current = list(headers)
                self._set_headers(sheet_id, tab, current)
            n = len(current)
            norm = [list(itertools.islice((r + [None] * n), n)) for r in rows]
            body = {'values': norm}
            svc = self._get_service()
            _retry(lambda: svc.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range=f"{tab}!A2",
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body=body,
            ).execute())
            print(f"[Sheets] appended {len(norm)} rows → {sheet_id}:{tab}")
        except Exception as e:
            print(f"[Sheets] append_rows error: {e}")

    # Back-compat API for Timeline
    def ensure_headers(self, sheet_id: str, tab: str):
        try:
            self._get_sheet_id(sheet_id, tab)
            existing = self._get_headers(sheet_id, tab)
            upgraded = upgrade_headers(existing)
            if existing != upgraded:
                self._set_headers(sheet_id, tab, upgraded)
        except Exception as e:
            print(f"[Sheets] ensure_headers error: {e}")

    def append_rows(self, sheet_id: str, tab: str, rows: List[List[Any]]):
        if not rows:
            return
        headers = self._get_headers(sheet_id, tab)
        if not headers:
            headers = list(HEADERS)
            self._set_headers(sheet_id, tab, headers)
        self.append_rows_with_headers(sheet_id, tab, headers, rows)

    def clear_tab_data(self, sheet_id: str, tab: str):
        """Clears all data rows in a tab, leaving the header intact."""
        sheet_id_num = self._get_sheet_id(sheet_id, tab)
        req = {
            'requests': [{
                'deleteDimension': {
                    'range': {
                        'sheetId': sheet_id_num,
                        'dimension': 'ROWS',
                        'startIndex': 1  # Deletes from row 2 onwards
                    }
                }
            }]
        }
        try:
            svc = self._get_service()
            _retry(lambda: svc.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body=req).execute())
            print(f"[Sheets] cleared data rows → {sheet_id}:{tab}")
        except Exception as e:
            print(f"[Sheets] clear_tab_data error: {e}")

    def update_chart(self, sheet_id: str, tab: str, project_id: str, chart_content: str):
        """Finds a row by ProjectId and updates it, or appends a new row."""
        svc = self._get_service()
        
        # Get all data to find the row index
        all_rows = self.get_rows_as_dicts(sheet_id, tab)
        
        row_idx = -1
        for i, row in enumerate(all_rows):
            if row.get('ProjectId') == project_id:
                row_idx = i + 2  # +2 because get_rows_as_dicts is 0-indexed and sheets are 1-indexed with a header
                break
        
        values = [[project_id, chart_content, time.strftime('%Y-%m-%d %H:%M:%S')]]
        body = {'values': values}

        if row_idx != -1:
            # Update existing row
            range_to_update = f"{tab}!A{row_idx}:C{row_idx}"
            _retry(lambda: svc.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_to_update,
                valueInputOption='RAW',
                body=body
            ).execute())
        else:
            # Append new row
            _retry(lambda: svc.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range=f"{tab}!A2",
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute())

    def get_rows_as_dicts(self, sheet_id: str, tab: str) -> List[Dict[str, Any]]:
        """Fetches all rows from a tab and returns them as a list of dictionaries."""
        svc = self._get_service()
        try:
            headers = self._get_headers(sheet_id, tab)
            if not headers:
                return []
            
            range_name = f"{tab}!A2:Z"
            result = _retry(lambda: svc.spreadsheets().values().get(spreadsheetId=sheet_id, range=range_name).execute())
            values = result.get('values', [])
            
            if not values:
                return []

            # Combine headers with row values into dicts, including original row index
            dict_rows = []
            for i, row in enumerate(values):
                row_dict = {'_row_idx': i + 1} # 0-based index for internal use, matches sheet row number - 1
                for j, header in enumerate(headers):
                    if j < len(row):
                        row_dict[header] = row[j]
                    else:
                        row_dict[header] = None
                dict_rows.append(row_dict)
            return dict_rows
        except Exception as e:
            print(f"[Sheets] get_rows_as_dicts error: {e}")
            return []
