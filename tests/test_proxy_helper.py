from pathlib import Path
import json

def test_post_commands(monkeypatch):
    calls = {}
    class DummyResp:
        def __init__(self):
            self.status_code = 202
            self._text = json.dumps({'ack_id':'abc','status':'ok'})
        def raise_for_status(self):
            return
        def json(self):
            return json.loads(self._text)
        @property
        def text(self):
            return self._text

    def fake_post(url, json=None, timeout=None):
        calls['url'] = url
        calls['json'] = json
        calls['timeout'] = timeout
        return DummyResp()

    monkeypatch.setattr('dawsheet.io.proxy.requests.post', fake_post)
    from dawsheet.io.proxy import post_commands
    ack = post_commands('http://example.test', 'dev-1', [{'type':'NOTE.PLAY','note':60}])
    assert ack['ack_id'] == 'abc'
    assert calls['url'].endswith('/command')
    assert calls['json']['body']['device_id'] == 'dev-1'
