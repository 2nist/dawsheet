import requests
from typing import List, Dict, Any, Optional

def post_commands(base_url: str, device_id: str, commands: List[Dict[str,Any]], timeout: int = 10) -> Dict[str,Any]:
    url = base_url.rstrip('/') + '/command'
    envelope = { 'cmd': 'BATCH.COMMANDS', 'id': 'py-' + __import__('uuid').uuid4().hex, 'body': { 'device_id': device_id, 'commands': commands } }
    resp = requests.post(url, json=envelope, timeout=timeout)
    resp.raise_for_status()
    try:
        return resp.json()
    except Exception:
        return { 'raw': resp.text }
