# DAWSheet Project – Next Actionable Steps

This plan captures immediate integration work to bring this into the main DAWSheet repo, plus near-term enhancements, tests, and styling.

## 0) Repo move and hygiene

- Initialize git (done here) and make an initial commit.
- Add remote to the main DAWSheet repository and push a feature branch.
- Secrets hygiene: service account JSON is ignored via .gitignore; keep config.example.yaml checked in, avoid committing real config.yaml.
- Consolidate requirements to a single root requirements.txt. webapp/requirements.txt now references the root file.

## 1) Integration into main repo

- Directory layout: keep apps/, webapp/, shared/, tests/, docs/ at the repo root.
- Remove old/duplicated modules once the main branch is updated:
  - Duplicate Sheets writers/readers across locations → converge on apps/capture/sheets_writer.py and webapp/backend/io interface, or unify them under shared/io/.
  - Drop the legacy dawsheet-pipeline/ folder (or archive) after verifying no unique modules are needed.
- Config normalization:
  - Single config.yaml with sections for sheet, google_auth, midi, export.
  - Document GOOGLE_APPLICATION_CREDENTIALS or google_auth.credentials_json.

## 2) Product features to complete

- Analyze preview (Bridge):
  - LRCLIB snap-to-grid preview lanes.
  - Section detection preview and manual adjusters (Bars/BarStart).
  - Key/mode estimator and display.
  - Drums style hints and generation preview.
- Library/Index:
  - Basic index of ProjectId/Title/Artist (from Metadata/Requests), filter/search, open in Sheets.
- DAW Bridge:
  - Export buttons are wired; add “send” hooks (OSC/MIDI) as opt-in.

## 3) Exports and I/O

- Prefer Sections for markers; fall back to Timeline if missing.
- GuideDrums: validate schema and add style presets.
- Add simple health-check for GOOGLE_SA_JSON at server start; friendly UI error on missing creds.

## 4) Testing

- Unit
  - shared.timing, lyrics_utils (existing tests OK; add edge cases).
  - exports builders (timeline_json, markers_csv, midi_builder with deterministic seed).
- API
  - FastAPI routers: export*/import* smoke tests using TestClient with a fake reader/writer.
- Integration
  - End-to-end local .mid import → Timeline/Charts write → export endpoints respond.
- Add pytest + coverage configuration and CI job.

## 5) Styling and DX

- Add Ruff/Black config in pyproject.toml; run ruff check/format gate in CI.
- Pre-commit hooks for lint/format.
- Small README updates for webapp (how to run uvicorn, set env var for creds, and SheetId usage).

## 6) Cleanup candidates (post-merge)

- Remove empty or unused test\_\*.py utilities at repo root if superseded.
- Deduplicate sheets_writer.py (apps vs webapp/backend/io) – choose one API and adapt callers.
- Delete analysis-backend/ if replaced by current webapp; otherwise clarify ownership/usage.

## 7) Milestones

- M1: Merge scaffold into main repo with curated tabs, exports working, docs updated.
- M2: Analyze preview lanes with LRCLIB and sections; tests for exports; CI in place.
- M3: Library index and DAW bridge senders; polish UI and presets.

## Try it (local)

- Activate venv and install deps: pip install -r requirements.txt
- Run web app: uvicorn webapp.backend.server:app --port 8000 --reload
- Open http://localhost:8000, enter Sheet ID and ProjectId, test export buttons.
