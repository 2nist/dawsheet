# DAWSheet Unified PRD
*A Modular, Sheet-Native Digital Audio Workstation Controller + Song Library*

---

## Mission
DAWSheet is a **Google Sheets–based creative environment** for music composition, live control, and arrangement.  
It must be:  
- **Fun & intuitive**: easy to sketch an idea quickly.  
- **Powerful & flexible**: scales from "control one knob" to "drive a live set."  
- **Accessible**: runs in Sheets on iPad or laptop.  
- **Deeply integrated**: MIDI/OSC/DAW control + music theory + song library.  
- **Straightforward**: no friction, no unnecessary menus.  

---

## Core Modules
### 1. MIDI/Timeline Control Core
- **Command Key Sheet**: user-editable table defining commands.  
- **Command Envelope v1**: JSON schema for all commands (fields: `type`, `at`, `quantize`, `target`, `payload`, `transform[]`, `meta`).  
- **Proxy Layer (Java/Node)**: real-time execution of MIDI, OSC, DAW messages.  
- **Transforms**: transpose, quantize, humanize, ratchet, probability, etc.  
- **Grid/Timeline View**: intuitive cell-grid to trigger/sequence commands.  
- **Sidebar Builder**: simple UI for adding/editing commands.  
- **Routing/Target Sheet**: maps commands to devices, DAWs, or plugins.  

### 2. Song Library & Theory Layer
- **Song Object** (`song.json`):  
  - `meta`: title, artist, bpm, key, tags.  
  - `sections`: verse/chorus/etc. with chords, length, lyrics_ref.  
  - `arrangement`: order of sections, timeline mapping.  
  - `commands_ref`: links to MIDI/Timeline commands.  
- **Song Library Sheet**: searchable catalog of songs.  
- **Section Sheet**: chords, notes, bar length, linked to arrangement.  
- **Theory Tools**: chord/scale detection, transposition, reharmonization, progression suggestion.  
- **Integration Hooks**:  
  - *Send to Timeline*: convert arrangement → DAWSheet commands.  
  - *Load Song into Live Set*: bring scenes/macros into a performance.  
  - *Musical Metronome*: theory-driven click patterns.  

---

## Shared Design Principles
- **Single Schema Family**:  
  - Commands (`commands.schema.json`)  
  - Songs (`song.schema.json`)  
  Both must be cross-compatible and referenceable.  
- **Composable**: sections and macros are reusable.  
- **Human-readable**: everything lives in Sheets first, JSON second.  
- **Extensible**: AI agents can add layers (groove gen, lyric/chord match, etc).  
- **Separation of Concerns**:  
  - GAS = data & UI.  
  - Proxy = real-time.  
  - Sheet = truth + UX surface.  

---

## MVP Deliverables
### Control Core MVP
- Command Key sheet + schema.  
- Proxy with NOTE/CC/PROGRAM support.  
- Sidebar for adding/editing commands.  
- Grid that can trigger commands.  
- ExportKeyToJSON + hot reload in proxy.  

### Song Library MVP
- Song schema draft.  
- Song Library + Section Sheets.  
- Basic theory sidebar (detect key, suggest chords).  
- ExportSongToJSON.  
- Button to "Send arrangement → Timeline."  

---

## Future Roadmap
- **Advanced transforms** (groove, AI-assisted rhythm).  
- **Macro expander**: user-defined bundles of commands.  
- **Ableton/Logic/REAPER adapters** for scenes & clips.  
- **AI-assisted Songwriting**: suggest progressions, motifs, lyric alignment.  
- **Cross-song search**: motif/structure mining.  
- **Visualizer**: lightweight local web timeline of commands.  
- **Remote control**: web/mobile interface synced to Sheets.  

---

## Success Metrics
- Create a song + arrangement + mapped timeline in <15 minutes.  
- Live set switching reliable with <50ms jitter.  
- Chord/scale detection accuracy ≥90%.  
- Users report "feels like Loopy Pro + iReal Pro + Ableton control surface in Sheets."  

---

## Agent Division of Labor
- **GitHub/VSCode Agent (Core)**: schemas, proxy handlers, GAS scripts, sidebar builders, tests, adapters.  
- **Gemini Agent (Library/Theory)**: song schema, theory functions, arrangement integration, section management.  
- **ChatGPT Agent (Orchestrator)**: ensures both schemas stay unified, generates tasks for dev agents, reviews diffs, manages integration docs.  

---

## Output Artifacts
- `/spec/commands.schema.json`  
- `/spec/song.schema.json`  
- `/apps/gas` (CLASP scripts + sidebars)  
- `/apps/proxy` (real-time bridge)  
- `/docs/DAWSHEET_PRD.md` (living unified spec)  