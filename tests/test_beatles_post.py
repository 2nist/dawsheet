from pathlib import Path
import json


def test_analyze_batch_post(monkeypatch, tmp_path: Path):
    calls = []

    class DummyResp:
        status_code = 202

    def fake_post(url, json=None, params=None, timeout=None):
        calls.append({'url': url, 'json': json, 'params': params})
        return DummyResp()

    monkeypatch.setattr('tools.beatles_batch.requests.post', fake_post)
    # prepare a small lab tree
    root = tmp_path / 'root'
    root.mkdir()
    lab = root / 'song.lab'
    lab.write_text('0.0 Intro\n')
    out = tmp_path / 'out'
    from tools.beatles_batch import analyze_batch

    analyze_batch(root, out, post=True, backend_url='http://example.test', sheet_id='SHEET123', tab='Timeline')
    assert len(calls) == 1
    c = calls[0]
    assert c['url'].endswith('/import/songrecord')
    assert c['params']['sheet_id'] == 'SHEET123'
    assert c['params']['tab'] == 'Timeline'
    assert c['json']['id'].startswith('song') or c['json']['id'] == 'song'
