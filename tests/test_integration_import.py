import os
import json
from pathlib import Path
import pytest
import requests
from tools.beatles_batch import build_songrecord_from_lab


def is_integration_enabled():
    return bool(os.getenv('BACKEND_URL')) and bool(os.getenv('TEST_SHEET_ID'))


@pytest.mark.skipif(not is_integration_enabled(), reason='integration test requires BACKEND_URL and TEST_SHEET_ID')
def test_post_songrecord_to_backend(tmp_path: Path):
    # Build a minimal SongRecord and post it to the backend import endpoint
    sr = build_songrecord_from_lab([{'time_s': 0.0, 'label': 'Intro'}], 'test_song', 'Test Song')
    url = os.getenv('BACKEND_URL').rstrip('/') + '/import/songrecord'
    params = {'sheet_id': os.getenv('TEST_SHEET_ID'), 'tab': os.getenv('TEST_TAB', 'Timeline')}
    resp = requests.post(url, json=sr, params=params, timeout=10)
    assert resp.status_code == 202
    data = resp.json()
    assert 'written' in data
