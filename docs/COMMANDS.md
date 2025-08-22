# DAWSheet Commands (Master List)

This document summarizes the command types defined in the canonical schema (`spec/commands.schema.json`) and notes whether each has a formal payload specification today. Use this as the master reference when producing or consuming DAWSheet commands.

## Command Envelope

All commands are sent as an envelope with common fields:

- `v`: integer version, currently `1`
- `type`: command type string, e.g., `NOTE.PLAY`
- `id`: unique command id (string)
- `origin`: where this command came from, e.g., `sheets://Grid!A5`
- `at`: when to execute ("now", "bar:beat[:ticks]", or ISO-8601 datetime)
- `quantize`: optional grid, e.g., "1/16", "bar", "off"
- `target`: routing hint (device/bus/track), opaque string to the proxy
- `payload`: command-specific object (see per-command sections)
- `transform`: optional list of transform ops (transpose, humanize, etc.)
- `meta`: optional metadata (e.g., `songId`, `tags`)

Example (NOTE.PLAY):

```json
{
  "v": 1,
  "type": "NOTE.PLAY",
  "id": "cmd_001",
  "origin": "sheets://Grid!A5",
  "at": "now",
  "quantize": "1/16",
  "target": "default",
  "payload": { "note": "C4", "velocity": 100, "durationSec": 0.5, "channel": 1 },
  "transform": [{ "op": "transpose", "semitones": 12 }],
  "meta": { "songId": "demo", "tags": ["live"] }
}
```

Note: The legacy/simple format `{ type: "NOTE", note, velocity, durationSec, channel }` is accepted by the Java proxy for compatibility but the envelope is the recommended format.

## Commands Inventory

Legend:

- ✅ Payload schema defined (validated in `commands.schema.json`)
- ⚠️ Planned/enum-only (listed but no typed payload yet)

### Performance and MIDI

- `NOTE.PLAY` — ✅ Play a single note
  - Payload: `note (string|0..127)`, `velocity (1..127)`, `durationSec (>=0)`, `channel (1..16)`
- `CHORD.PLAY` — ✅ Play a chord by name
  - Payload: `root (string)`, `quality (string)`, `voicing (string?)`, `channel (1..16)`
- `ARPEGGIATE` — ✅ Arpeggiate parameters
  - Payload: `style (up|down|updown|random)`, `rate (1/8|1/8T|1/16|1/32)`, `gate (0..1)`, `lengthBeats (>=0)`, `channel (1..16)`
- `PROGRAM.CHANGE` — ✅ MIDI Program Change (optional bank select)
  - Payload: `program (0..127)`, `bankMsb (0..127?)`, `bankLsb (0..127?)`, `channel (1..16)`
- `PITCH.BEND` — ✅ Pitch bend value
  - Payload: `value (-8192..8191)`, `channel (1..16)`
- `AFTERTOUCH` — ✅ Channel aftertouch pressure
  - Payload: `value (0..127)`, `channel (1..16)`
- `CC.SET` — ✅ Set a MIDI CC value immediately
  - Payload: `cc (0..127)`, `value (0..127)`, `channel (1..16)`
- `CC.RAMP` — ✅ Ramp a CC value over time
  - Payload: `cc (0..127)`, `from (0..127)`, `to (0..127)`, `timeMs (>=0)`, `channel (1..16)`
- `CC.LFO` — ✅ Modulate a CC with LFO (rate or sync)
  - Payload: `cc (0..127)`, `waveform (sine|tri|saw|square|random)`, `rateHz (>=0)` or `sync (off|1/4|1/8|1/8T|1/16)`, `depth (0..127)`, `center (0..127)`, `channel (1..16)`

### Transport and Sync

- `TRANSPORT.TEMPO_SET` — ✅ Set tempo
  - Payload: `bpm (>=1)`
- `TRANSPORT.START` — ⚠️ Start transport (no payload defined yet)
- `TRANSPORT.STOP` — ⚠️ Stop transport (no payload defined yet)
- `SYNC.MIDI_CLOCK_TX` — ✅ Enable/disable MIDI clock transmission
  - Payload: `enabled (boolean)`

### DAW Actions

- `DAW.SCENE.LAUNCH` — ✅ Launch a scene
  - Payload: `scene (>=0)`
- `DAW.CLIP.LAUNCH` — ✅ Launch a clip slot
  - Payload: `track (>=0)`, `slot (>=0)`
- `DAW.TRACK.ARM` — ✅ Arm/disarm a track
  - Payload: `track (>=0)`, `state (boolean)`

### OSC and Device Abstractions

- `OSC.SEND` — ✅ Send an OSC message
  - Payload: `addr (string)`, `args (array)`
- `DEVICE.PARAM_SET` — ✅ Set an abstract device parameter
  - Payload: `targetId (string)`, `param (string)`, `value (number)`
- `MACRO.TRIGGER` — ✅ Trigger a named macro/automation
  - Payload: `macroId (string)`

### Cues and Patterns

- `CUE.GOTO` — ✅ Jump to a cue/marker
  - Payload: `position (string)`
- `PATTERN.TRIGGER` — ⚠️ Trigger a named pattern (payload TBD)
- `STEP.RATCHET` — ⚠️ Adjust ratcheting on a step (payload TBD)
- `STEP.PROB` — ⚠️ Adjust probability on a step (payload TBD)

## Transforms (Optional)

A command may include a `transform` array to alter timing/notes/values. Supported ops include:

- `transpose (semitones)`
- `humanize (ms)`
- `quantize (grid, strength)`
- `limit (min, max)`
- `curve (shape)`
- `scale_fit (scale, root)`
- `velocity_curve (amount)`
- `ramp (amount)`

Refer to `$defs.transformOp` in the schema for the full set and fields.

## Status

- Schema source of truth: `spec/commands.schema.json`
- Implemented in Java proxy: legacy `NOTE` and envelope `NOTE.PLAY` (others to be added incrementally)
- Planned/enum-only items: present in `type` enum; payloads to be defined and validated in future revisions

If you want this list embedded in the main README or a Sheet sidebar, we can surface it there as well.
