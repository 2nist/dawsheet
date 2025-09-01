import sys, os
from fastapi.testclient import TestClient

# Ensure project root on sys.path so local package imports work
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
	sys.path.insert(0, ROOT)

from webapp.server import app

client = TestClient(app)
resp = client.get('/healthz')
print(resp.status_code)
print(resp.json())
