from __future__ import annotations
import sys, os
# Ensure project root is on sys.path so `dawsheet` package can be imported
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
import types
# Inject fake google modules before importing the project module so imports succeed
fake_mod = types.ModuleType('fake')
sys.modules['google'] = types.ModuleType('google')
sys.modules['google.auth'] = types.ModuleType('google.auth')
sys.modules['google.auth.exceptions'] = types.SimpleNamespace(TransportError=Exception)
sys.modules['googleapiclient'] = types.ModuleType('googleapiclient')
sys.modules['googleapiclient.discovery'] = types.SimpleNamespace(build=lambda *a, **k: None)
sys.modules['googleapiclient.errors'] = types.SimpleNamespace(HttpError=Exception)
sys.modules['google.oauth2'] = types.ModuleType('google.oauth2')
sys.modules['google.oauth2.service_account'] = types.SimpleNamespace(Credentials=object)
sys.modules['httplib2'] = types.SimpleNamespace(error=types.SimpleNamespace(ServerNotFoundError=Exception))

from dawsheet.io.sheets import SheetsClient, HEADERS

class FakeValues:
    def __init__(self, headers=None, rows=None):
        self._headers = headers or []
        self._rows = rows or []
    def get(self, spreadsheetId=None, range=None):
        class Exec:
            def __init__(self, data):
                self._data = data
            def execute(self):
                return self._data
        # return header row if range is 1:1
        if range and range.endswith('1:1'):
            if self._headers:
                return Exec({'values': [self._headers]})
            return Exec({'values': []})
        # return data rows for A2:Z
        return Exec({'values': self._rows})
    def append(self, spreadsheetId=None, range=None, valueInputOption=None, insertDataOption=None, body=None):
        # append provided values to internal rows and return a fake response
        vals = body.get('values', []) if body else []
        self._rows.extend(vals)
        class Exec:
            def execute(self):
                return {'updates': {'updatedRows': len(vals)}}
        return Exec()
    def update(self, spreadsheetId=None, range=None, valueInputOption=None, body=None):
        # set header row
        vals = body.get('values', []) if body else []
        if vals:
            self._headers = vals[0]
        class Exec:
            def execute(self):
                return {}
        return Exec()

class FakeSpreadsheets:
    def __init__(self):
        self.values_helper = FakeValues(headers=list(HEADERS))
    def get(self, spreadsheetId=None):
        class Exec:
            def execute(inner_self):
                return {'sheets': [{'properties': {'title': 'Timeline', 'sheetId': 123}}]}
        return Exec()
    def batchUpdate(self, spreadsheetId=None, body=None):
        class Exec:
            def execute(inner_self):
                return {'replies': [{'addSheet': {'properties': {'sheetId': 123}}}]}
        return Exec()
    def values(self):
        return self.values_helper

class FakeService:
    def __init__(self):
        self._ss = FakeSpreadsheets()
    def spreadsheets(self):
        return self._ss


def run():
    c = SheetsClient(spreadsheet_id='FAKE_SHEET')
    # monkeypatch the _get_service method
    def fake_get_service():
        print('[smoke] using FakeService')
        return FakeService()
    c._get_service = fake_get_service

    print('[smoke] ensure_headers -> should detect headers present')
    c.ensure_headers('Timeline', HEADERS)
    print('[smoke] append_rows -> adding two rows')
    rows = [
        {HEADERS[i]: f'val{i}' for i in range(len(HEADERS))},
        {HEADERS[i]: f'v{i}' for i in range(len(HEADERS))}
    ]
    n = c.append_rows('Timeline', rows)
    print(f'[smoke] append_rows returned: {n}')

    print('[smoke] read_rows -> should return rows')
    out = c.read_rows('Timeline')
    print(f'[smoke] read_rows returned {len(out)} rows')
    for r in out[:3]:
        print(r)

if __name__ == '__main__':
    run()
