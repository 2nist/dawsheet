"""Small generator that emits a minimal Python client and TypeScript types
from the OpenAPI YAML for internal use. This is intentionally tiny and
dependency-free (no openapi-python-client required).
"""
from __future__ import annotations
import yaml
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'openapi' / 'openapi.yaml'

def load_spec():
    return yaml.safe_load(SPEC.read_text(encoding='utf-8'))

def emit_python_client(spec):
    out = []
    out.append('import requests')
    out.append('from typing import List, Dict, Any')
    out.append('\n')
    out.append('class APIClient:')
    out.append("    def __init__(self, base_url='http://localhost:8000'):")
    out.append('        self.base_url = base_url')
    out.append('\n')
    out.append("    def healthz(self):")
    out.append("        return requests.get(f'{self.base_url}/healthz')")
    out.append('\n')
    out.append("    def import_songrecord(self, sheet_id: str, tab: str, payload: Dict[str,Any]):")
    out.append("        params = {'sheet_id': sheet_id, 'tab': tab}")
    out.append("        return requests.post(f'{self.base_url}/import/songrecord', json=payload, params=params)")
    return '\n'.join(out)

def emit_ts_types(spec):
    comp = spec.get('components',{}).get('schemas',{})
    ev = comp.get('Event',{})
    sr = comp.get('SongRecord',{})
    out = []
    out.append('export interface Event {')
    for name, prop in ev.get('properties',{}).items():
        t = 'any'
        if prop.get('type') == 'number': t = 'number'
        if prop.get('type') == 'string': t = 'string'
        out.append(f'  {name}: {t};')
    out.append('}\n')
    out.append('export interface SongRecord {')
    for name, prop in sr.get('properties',{}).items():
        if name == 'events':
            out.append('  events: Event[];')
        else:
            t = 'string'
            out.append(f'  {name}?: {t};')
    out.append('}\n')
    return '\n'.join(out)

def main():
    spec = load_spec()
    py = emit_python_client(spec)
    ts = emit_ts_types(spec)
    (ROOT / 'generated').mkdir(exist_ok=True)
    (ROOT / 'generated' / 'api_client.py').write_text(py, encoding='utf-8')
    (ROOT / 'generated' / 'types.ts').write_text(ts, encoding='utf-8')
    print('Wrote generated/api_client.py and generated/types.ts')

if __name__ == '__main__':
    main()
