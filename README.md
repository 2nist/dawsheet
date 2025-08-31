# DAWSheet — active layout

This repository contains spreadsheet-first tools to import, analyze, and export musical project data between Google Sheets and DAWs.

Active folders:

- apps/ — core Python apps (capture, tools, proxy helpers)
- webapp/ — FastAPI web backend and frontend for exports and bridge
- apps/gas — Google Apps Script used by Sheets (deploy via clasp)
- apps/proxy-java — Java proxy for MIDI output (Gradle project)

Archived or legacy code should live in `archive/` (see `archive/README.md`).

Refer to `README.pipeline.md` for pipeline-specific developer notes and CI guidance.
