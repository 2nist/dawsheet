# Beatles batch tools

This document explains the small Beatles batch tooling in `tools/beatles_batch.py`, the GAS batch importer UI (`apps/gas/UiBatchImport.html` + `apps/gas/BatchImport.gs`), and how to run tests and an optional integration smoke test.

## Purpose

- Convert Isophonics-style `.lab` files into SongRecord v1 JSON files (one per song).
- Produce a diagnostics sidecar `<song_id>.diag.json` per song.
- Optionally POST generated SongRecord JSON to the DAWSheet backend `/import/songrecord` endpoint.
- Provide a GAS UI to run a Drive-folder based batch import (post or send files to backend).

## Location

- CLI: `tools/beatles_batch.py`
- GAS UI: `apps/gas/UiBatchImport.html`
- GAS server helper: `apps/gas/BatchImport.gs`
- Tests: `tests/test_beatles_batch.py`, `tests/test_beatles_post.py`, `tests/test_integration_import.py`

## Requirements

- Python 3.10+ (virtualenv recommended)
- dev/test dependencies (see project `pyproject.toml` / `requirements.txt`). At minimum for tests:
  - pytest
  - requests

Install into the workspace venv (example):

```powershell
& ".venv/Scripts/Activate.ps1"
pip install -r requirements.txt
pip install pytest requests
```

## CLI Usage

Generate SongRecord JSON and diagnostics:

```powershell
python tools/beatles_batch.py --root "C:\path\to\beatles" --out "outdir"
```

Generate and POST to a running backend (synchronous):

```powershell
python tools/beatles_batch.py --root "C:\path\to\beatles" --out "outdir" --post --backend-url http://localhost:8000 --sheet-id YOUR_SHEET_ID --tab Timeline
```

CLI flags

- `--root` (required): root folder to scan for `*.lab` files
- `--out` (required): output directory for generated JSON files
- `--post`: if set, POST each generated SongRecord to the backend
- `--backend-url`: base URL of backend (defaults to none; required for `--post`)
- `--sheet-id`, `--tab`: optional query params passed to backend when posting

Output

- `<song_id>.json` — top-level SongRecord JSON
- `<song_id>.diag.json` — diagnostics sidecar

## GAS Batch Import (Ui)

1. Open the GAS project or use the existing project that contains `UiBatchImport.html` and `BatchImport.gs`.
2. Set the script property `PROXY_ENDPOINT` to your backend base URL (e.g. `http://localhost:8000`).
3. Open the `Batch Import` sidebar (call `showUiBatchImport()` from GAS or add a menu item) and provide the Drive folder ID that contains the SongRecord JSON files.
4. Optionally set `sheetId` and `tab` in the UI; those will be appended as query params when the GAS code posts each JSON to `/import/songrecord`.

Notes

- The GAS helper expects each Drive file to already be a top-level SongRecord JSON (the CLI writes that format). If you have legacy wrapped files, migrate or use a compatibility mode.

## Tests

Run unit tests (skipping integration tests unless configured):

```powershell
& ".venv/Scripts/Activate.ps1"
python -m pytest -q -k "not integration"
```

Integration smoke test

- The test `tests/test_integration_import.py` will be skipped unless the following environment variables are set:
  - `BACKEND_URL` — e.g. `http://localhost:8000`
  - `TEST_SHEET_ID` — spreadsheet id to use for smoke run

Run it locally like this (PowerShell):

```powershell
$env:BACKEND_URL='http://localhost:8000'
$env:TEST_SHEET_ID='SHEET_ID'
python -m pytest tests/test_integration_import.py -q
```

## Troubleshooting

- If posts fail, check the backend logs and confirm `/import/songrecord` is reachable and that you supplied `sheet_id` or have `DAWSHEET_SPREADSHEET_ID` configured in the backend environment.
- For large batches, consider using `--post` on a machine with stable network or implement parallel posting with retry/backoff (future enhancement).

## Next steps (suggested)

- Add retry/backoff & concurrency flags to the CLI for robust ingest of large batches.
- Add a small helper to migrate legacy wrapped JSON files into the new top-level SongRecord format.

License: MIT-style (same as project)
