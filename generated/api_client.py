import requests
from typing import List, Dict, Any


class APIClient:
    def __init__(self, base_url='http://localhost:8000'):
        self.base_url = base_url


    def healthz(self):
        return requests.get(f'{self.base_url}/healthz')


    def import_songrecord(self, sheet_id: str, tab: str, payload: Dict[str,Any]):
        params = {'sheet_id': sheet_id, 'tab': tab}
        return requests.post(f'{self.base_url}/import/songrecord', json=payload, params=params)