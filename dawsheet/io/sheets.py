from __future__ import annotations
from typing import List, Dict, Optional, Sequence, Any
import os
from pathlib import Path
import time
import itertools
import socket

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.service_account import Credentials as SACredentials
from google.auth import exceptions as google_auth_exceptions
import httplib2


# Final Timeline header order (shared constant)
HEADERS: List[str] = [
    'Bar','Beat','BeatAbs','Time_s','Timecode','Chord','Section','Dur_beats','Dur_s',
    'Lyric','Lyric_conf','EventType','WordStart_s','WordEnd_s','SubIdx','Melisma',
    'Chord_conf','Section_conf','Source','ProjectId','EventId'
]


def upgrade_headers(existing: List[str]) -> List[str]:
    if not existing:
        return list(HEADERS)
    canon_by_lower = {h.lower(): h for h in HEADERS}
    normalized: List[str] = []
    seen_set = set()
    for h in existing:
        canon = canon_by_lower.get(h.lower(), h)
        if canon not in seen_set:
            normalized.append(canon)
            seen_set.add(canon)
    existing = normalized
    seen = {h: True for h in existing}
    need = ['EventType','WordStart_s','WordEnd_s','SubIdx','Melisma']
    out = list(existing)
    if not all(h in seen for h in need):
        try:
            idx_lc = out.index('Lyric_conf')
            insert_at = idx_lc + 1
        except ValueError:
            insert_at = len(out)
        for i, h in enumerate(need):
            if h not in seen:
                out.insert(insert_at + i, h)
                seen[h] = True
    ordered = [h for h in HEADERS if h in seen]
    tail = [h for h in out if h not in ordered]
    return ordered + tail


def _retry(fn, *args, **kwargs):
    delay = 0.5
    last_exc = None
    for _ in range(6):
        try:
            return fn(*args, **kwargs)
        except HttpError as e:
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
            time.sleep(delay)
            delay = min(delay * 2, 8.0)
            last_exc = e
            continue
    if last_exc:
        raise last_exc
    raise RuntimeError("_retry exhausted without exception but no result returned")


class SheetsClient:
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

    def __init__(self, creds_env: str = "GOOGLE_APPLICATION_CREDENTIALS", spreadsheet_id: str = ""):
        self.creds_env = creds_env
        self._service = None
        self.spreadsheet_id = spreadsheet_id

    def _get_service(self):
        if self._service:
            return self._service
        cred_path = os.getenv(self.creds_env)
        if not cred_path:
            raise RuntimeError("Google credentials not configured: set GOOGLE_APPLICATION_CREDENTIALS or pass service account path in config")
        p = Path(cred_path)
        if not p.exists():
            raise RuntimeError(f"Google credentials file not found at: {p}")
        creds = SACredentials.from_service_account_file(str(p), scopes=self.SCOPES)
        self._service = build('sheets', 'v4', credentials=creds, cache_discovery=False)
        return self._service

    def _get_sheet_id(self, tab: str) -> int:
        svc = self._get_service()
        meta = _retry(lambda: svc.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute())
        for sh in meta.get('sheets', []):
            props = sh.get('properties', {})
            if props.get('title') == tab:
                return props['sheetId']
        req = {'requests': [{'addSheet': {'properties': {'title': tab}}}]}
        res = _retry(lambda: svc.spreadsheets().batchUpdate(spreadsheetId=self.spreadsheet_id, body=req).execute())
        return res['replies'][0]['addSheet']['properties']['sheetId']

    def _get_headers(self, tab: str) -> List[str]:
        svc = self._get_service()
        rng = f"{tab}!1:1"
        val = _retry(lambda: svc.spreadsheets().values().get(spreadsheetId=self.spreadsheet_id, range=rng).execute())
        values = val.get('values', [])
        return values[0] if values else []

    def ensure_headers(self, sheet: str, headers: List[str]) -> None:
        # compatibility: self.spreadsheet_id can be passed during init or via sheet param
        if not self.spreadsheet_id:
            self.spreadsheet_id = sheet
            tab = headers and headers[0] if headers else 'Timeline'
            # fallback: user should call ensure_headers with (sheet, headers)
        else:
            tab = sheet
        try:
            self._get_sheet_id(tab)
            existing = self._get_headers(tab)
            if existing != headers:
                self._set_headers(tab, headers)
        except Exception as e:
            raise

    def _set_headers(self, tab: str, headers: List[str]):
        svc = self._get_service()
        sheet_id = self._get_sheet_id(tab)
        current_headers = self._get_headers(tab)
        current_cols = len(current_headers) if current_headers else 0
        if len(headers) > current_cols:
            req = {'requests': [{'appendDimension': {'sheetId': sheet_id, 'dimension': 'COLUMNS', 'length': len(headers) - current_cols}}]}
            _retry(lambda: svc.spreadsheets().batchUpdate(spreadsheetId=self.spreadsheet_id, body=req).execute())
        body = {'values': [headers]}
        _retry(lambda: svc.spreadsheets().values().update(spreadsheetId=self.spreadsheet_id, range=f"{tab}!1:1", valueInputOption='RAW', body=body).execute())

    def set_rows(self, sheet: str, rows: List[Dict], headers: Optional[List[str]] = None) -> int:
        # Replace all data rows in tab, preserving header
        tab = sheet
        svc = self._get_service()
        if headers:
            self._set_headers(tab, headers)
        # Clear rows (delete rows 2..)
        sheet_id_num = self._get_sheet_id(tab)
        req = {'requests': [{'deleteDimension': {'range': {'sheetId': sheet_id_num, 'dimension': 'ROWS', 'startIndex': 1}}}]}
        _retry(lambda: svc.spreadsheets().batchUpdate(spreadsheetId=self.spreadsheet_id, body=req).execute())
        if not rows:
            return 0
        # Prepare values using header order if provided
        hdrs = headers or self._get_headers(tab)
        values = [[r.get(c, '') for c in hdrs] for r in rows]
        _retry(lambda: svc.spreadsheets().values().append(spreadsheetId=self.spreadsheet_id, range=f"{tab}!A2", valueInputOption='RAW', insertDataOption='INSERT_ROWS', body={'values': values}).execute())
        return len(values)

    def append_rows(self, sheet: str, rows: List[Dict]) -> int:
        tab = sheet
        if not rows:
            return 0
        svc = self._get_service()
        headers = self._get_headers(tab)
        if not headers:
            # derive headers from first row
            headers = list(rows[0].keys())
            self._set_headers(tab, headers)
        n = len(headers)
        norm = [list(itertools.islice(( [r.get(h, '') for h in headers] + [None] * n), n)) for r in rows]
        _retry(lambda: svc.spreadsheets().values().append(spreadsheetId=self.spreadsheet_id, range=f"{tab}!A2", valueInputOption='RAW', insertDataOption='INSERT_ROWS', body={'values': norm}).execute())
        return len(norm)

    def upsert_rows(self, sheet: str, rows: List[Dict], key_fields: Sequence[str]) -> int:
        # Simplified upsert: reads all rows, matches by key_fields, updates or appends
        tab = sheet
        svc = self._get_service()
        headers = self._get_headers(tab)
        if not headers and rows:
            headers = list(rows[0].keys())
            self._set_headers(tab, headers)
        existing = self.read_rows(tab)
        idx = { tuple((r.get(k) for k in key_fields)): i for i, r in enumerate(existing) }
        updates = []
        appends = []
        for r in rows:
            key = tuple((r.get(k) for k in key_fields))
            if key in idx:
                rownum = idx[key] + 2
                values = [[r.get(h, '') for h in headers]]
                updates.append({'range': f"{tab}!A{rownum}:{chr(ord('A')+len(headers)-1)}{rownum}", 'values': values})
            else:
                appends.append([r.get(h, '') for h in headers])
        if updates:
            _retry(lambda: svc.spreadsheets().values().batchUpdate(spreadsheetId=self.spreadsheet_id, body={'valueInputOption':'RAW', 'data': updates}).execute())
        if appends:
            _retry(lambda: svc.spreadsheets().values().append(spreadsheetId=self.spreadsheet_id, range=f"{tab}!A2", valueInputOption='RAW', insertDataOption='INSERT_ROWS', body={'values': appends}).execute())
        return len(updates) + len(appends)

    def read_rows(self, sheet: str) -> List[Dict[str, Any]]:
        tab = sheet
        svc = self._get_service()
        headers = self._get_headers(tab)
        if not headers:
            return []
        range_name = f"{tab}!A2:Z"
        result = _retry(lambda: svc.spreadsheets().values().get(spreadsheetId=self.spreadsheet_id, range=range_name).execute())
        values = result.get('values', [])
        out = []
        for i, row in enumerate(values):
            d = {'_row_idx': i+1}
            for j, h in enumerate(headers):
                d[h] = row[j] if j < len(row) else None
            out.append(d)
        return out
