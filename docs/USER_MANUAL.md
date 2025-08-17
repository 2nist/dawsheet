# DAWSheet User Manual (Revised)

## Overview
DAWSheet is a sheet-native orchestration platform that maps spreadsheet-driven commands to real-time MIDI/DAW control and a song library. It integrates Google Sheets (Apps Script), a Java proxy (real-time MIDI/OSC bridge), and optional Logic Pro automation via JXA (macOS JavaScript for Automation).

This manual documents the mapped command types, how commands flow through the system, setup steps, validation/test procedures, and actionable templates (JXA + MIDI) to test integration with Logic Pro.

### Checklist (what I'll provide in this doc)

- Command & schema mapping (what's implemented now)
- Unmapped / future commands (roadmap)
- How to export MIDI and import into Logic Pro
- JXA test script template + instructions to control Logic (tempo, markers, transport)
- Validation checklist and test cases you can run locally

## Core concepts and flow

- User edits sheet (Grid, Command Key, or Song sheets)
- Apps Script parses the cell and emits a Command Envelope (JSON) to Pub/Sub
- Java proxy subscribes to `dawsheet.commands` and converts envelopes to MIDI/OSC/DAW actions
- Optional: Backend exports arranged MIDI files and a JXA script to automate Logic project import and project-level controls

## Command Mapping (implemented)

The repository defines a schema-driven mapping (see `/spec/commands.schema.json`). Implemented types include:

- NOTE.PLAY — single notes (channel, note, velocity, duration)
- CHORD.PLAY — simultaneous notes for chords
- CC.SET — Control Change messages (controller number, value)
- PROGRAM.CHANGE — Program/patch changes
- SCENE.TRIGGER / SCENE.RECALL — high-level scene or preset activation

Recommended CC mappings for Logic (suggested)
- CC 102 = TRANSPORT PLAY/STOP (send 127 to toggle play)
- CC 103 = TRANSPORT RECORD (127 to trigger record)
- CC 20..29 = SECTION JUMP (CC 20 = section 0, CC 21 = section 1, ...)

## Unmapped / Future Commands (roadmap)

- MACRO.EXPAND — user-defined macro bundles
- ADV_TRANSFORM.* — groove, humanize, AI-assisted transforms
- DAW.ADAPTER.* — per-DAW feature mappings (Ableton Link, Logic Scenes)
- REMOTE.CONTROL — mobile/web remote control bindings

## Editing & Extending

- To add a new command type: add schema to `/spec/`, update `tools/generate-types.mjs`, add handling in `apps/proxy-java` (router/adapter), and add parsing support in `apps/gas` if the command originates in Sheets.
- Keep one source of truth for command names (schema files). Update docs and tests when you add a command.

## Testing & Validation (Step-by-step)

1. Local unit tests

  - Java proxy: `cd apps/proxy-java && ./gradlew test`

2. Apps Script manual tests

  - Open the Sheet, run `onOpen`, use the DAWSheet menu, edit a cell in the command grid and verify Pub/Sub publish (or log output).

3. End-to-end logic import test (Logic Pro on macOS)

  - Export MIDI files from DAWSheet (see "Exporting MIDI" below)
  - Run the JXA script (template provided) to import MIDI, set tempo, create markers, and place regions
  - Verify transport and marker navigation

Exporting MIDI from DAWSheet
----------------------------
Your backend should create one MIDI file per logical track/instrument. Filenames should include track name and lane index, e.g. `01_Bass.mid`, `02_Lead.mid`.

Suggested metadata file (JSON) accompanying exports:

{
  "tempo": 120,
  "tracks": [
   { "file": "01_Bass.mid", "channel": 1, "name": "Bass" },
   { "file": "02_Lead.mid", "channel": 1, "name": "Lead" }
  ],
  "sections": [ { "name": "Intro", "startBar": 1 }, { "name": "Verse", "startBar": 9 } ]
}

JXA Script Template (Logic) — testing/Step 1
-------------------------------------------
See `adapters/logic/logic-jxa.js` for the full JXA template. It provides functions to:

- Activate Logic Pro
- Set project tempo
- Import MIDI files (using File > Import > MIDI File via GUI automation)
- Create arrangement markers from `sections` metadata
- Move playhead to marker and control transport (play/stop/record)

Important testing notes for JXA
- GUI scripting reliability depends on macOS permissions: enable "Automation" and "Accessibility" for terminal/osascript
- The import flow in Logic may require the project to be open and focused
- The template uses `osascript -l JavaScript adapters/logic/logic-jxa.js -- <path-to-export-dir>` to run

Validation checklist for a successful run
----------------------------------------
- [ ] All MIDI files imported into tracks
- [ ] Project tempo matches exported tempo
- [ ] Markers created and named as expected
- [ ] Playhead jumps to chosen marker
- [ ] Play/Stop/Record commands are accepted by Logic

Troubleshooting
---------------
- If markers aren't created: check menu navigation changes across Logic versions; GUI elements may differ.
- If imports fail: try manual import first to confirm file validity, then re-run JXA.
- If transport keystrokes don't work: ensure Logic has keyboard focus and system Accessibility permissions

References & Next steps
-----------------------
- See `adapters/logic/logic-setup.md` for a one-time user setup guide (CoreMIDI, Logic setup)
- Use `adapters/logic/logic-jxa.js` as a starting test script, adapt to your Logic version
- Keep schema and adapters in sync as new commands are added

Appendix: Quick commands
------------------------
Open Java proxy tests:

```
cd apps/proxy-java
./gradlew test
```

Run JXA test (macOS):

```
osascript -l JavaScript adapters/logic/logic-jxa.js -- /path/to/exported/midi/and/metadata
```

End of manual (living document). Update `/docs` when features change.
