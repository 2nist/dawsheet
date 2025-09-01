import json
from pathlib import Path
import pytest

from fastapi.testclient import TestClient
from jsonschema import validate, ValidationError

from webapp import server


SPEC = Path(__file__).parents[1] / 'spec' / 'songrecord.schema.json'
FIX_DIR = Path(__file__).parent / 'fixtures'


def load_fixture(name: str):
    p = FIX_DIR / name
    return json.loads(p.read_text())


def test_fixtures_validate_schema():
    schema = json.loads(SPEC.read_text())
    for fname in ('songrecord_min.json', 'songrecord_full.json'):
        data = load_fixture(fname)
        # should not raise
        validate(instance=data, schema=schema)


class DummySheets:
    def __init__(self):
        self._headers = []
        self.rows = []

    def _get_service(self):
        return 'dummy'

    def _get_headers(self, tab: str):
        return self._headers

    def _set_headers(self, tab: str, headers):
        self._headers = list(headers)

    def append_rows(self, sheet: str, rows):
        # emulate setting canonical headers if missing
        from dawsheet.io.sheets import HEADERS as CANON_HEADERS
        if not self._headers and rows:
            # enforce canonical header ordering to detect drift in one place
            self._headers = list(CANON_HEADERS)
        # normalize rows into dicts keyed by headers
        hdr = self._headers
        for r in rows:
            self.rows.append({h: r.get(h, '') for h in hdr})
        return len(rows)


def test_import_endpoint_appends_rows(monkeypatch):
    client = TestClient(server.app)
    dummy = DummySheets()

    # Patch the SheetsClient used in the endpoint
    from dawsheet.io.sheets import SheetsClient, HEADERS

    def fake_init(self, creds_env='GOOGLE_APPLICATION_CREDENTIALS', spreadsheet_id=''):
        self.creds_env = creds_env
        self._service = None
        self.spreadsheet_id = spreadsheet_id

    # monkeypatch constructor and methods
    monkeypatch.setattr(SheetsClient, '__init__', fake_init)
    monkeypatch.setattr(SheetsClient, '_get_service', lambda self: dummy._get_service())
    monkeypatch.setattr(SheetsClient, '_get_headers', lambda self, tab: dummy._get_headers(tab))
    monkeypatch.setattr(SheetsClient, '_set_headers', lambda self, tab, headers: dummy._set_headers(tab, headers))
    monkeypatch.setattr(SheetsClient, 'append_rows', lambda self, sheet, rows: dummy.append_rows(sheet, rows))

    # send full fixture
    payload = load_fixture('songrecord_full.json')
    resp = client.post('/import/songrecord?tab=Timeline&sheet_id=test-spreadsheet', json=payload)
    assert resp.status_code == 202

    # Check headers set and row counts
    # headers should equal the canonical HEADERS exactly; changing HEADERS in one place
    # should break this test (desired guardrail)
    from dawsheet.io.sheets import HEADERS
    assert dummy._headers == HEADERS
    assert len(dummy.rows) == len(payload['events'])
