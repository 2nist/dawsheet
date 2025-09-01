// Schemas.gs
// JSON schema definitions as string constants for validation in GAS.

// NOTE: These are aligned with /spec versions and should be kept in sync by codegen.

const SONG_SCHEMA = JSON.parse(`{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://dawsheet.dev/spec/song.schema.json",
  "title": "DAWSheet Song Object v1",
  "type": "object",
  "required": ["v", "songId", "meta", "sections", "arrangement"],
  "additionalProperties": false,
  "properties": {
    "v": {"const": 1},
    "songId": {"type": "string", "description": "Unique identifier for the song, typically derived from the sheet row."},
    "meta": {
      "type": "object",
      "required": ["title","bpm","key"],
      "properties": {
        "title": {"type":"string"},
        "artist": {"type":"string"},
        "bpm": {"type":"number","minimum":1},
        "key": {"type":"string","description":"e.g., C, D#, Fm"},
        "mode": {"type":"string","description":"Ionian/Dorian/..."},
        "timeSignature": {"type":"string","pattern": "^\\\\d+/\\\\d+$"},
        "tags": {"type":"array","items":{"type":"string"}},
        "notes": {"type":"string"}
      },
      "additionalProperties": true
    },
    "sections": {
      "type": "array",
      "items": {"$ref":"#/$defs/section"}
    },
    "arrangement": {
      "type": "array",
      "items": {"$ref":"#/$defs/arrangementItem"}
    },
    "commands_ref": {
      "type":"array",
      "description":"Optional direct references to command groups/macros/scenes",
      "items":{"type":"string"}
    }
  },
  "$defs": {
    "section": {
      "type":"object",
      "required": ["sectionId","sectionName","lengthBars"],
      "properties": {
        "sectionId":{"type":"string","description":"Unique ID for this section within a song."},
        "sectionName":{"type":"string","description":"Verse, Chorus, Bridge, etc."},
        "lengthBars":{"type":"number","minimum":0},
        "chords":{"type":"array","items":{"$ref":"#/$defs/chord"}},
        "lyricsRef":{"type":"string"},
        "notes":{"type":"string"}
      },
      "additionalProperties": true
    },
    "chord": {
      "type":"object",
      "required":["symbol","beats"],
      "properties": {
        "symbol":{"type":"string","description":"The symbolic representation of the chord (e.g., Cmaj7, Dm)."},
        "beats":{"type":"number","minimum":0.25},
        "roman":{"type":"string","description":"optional roman numeral"},
        "scale":{"type":"string","description":"optional scale/mode hint"},
        "notes": {"type": "array", "items": {"type": "string"}, "description": "Optional: Specific notes making up the chord (e.g., for detected chords)."},
        "quality": {"type": "string", "description": "Optional: Detected or specified chord quality (e.g., major, minor, dominant, diminished)."}
      },
      "additionalProperties": false
    },
    "arrangementItem": {
      "type":"object",
      "required":["arrangementIndex","sectionId","startBar"],
      "properties": {
        "arrangementIndex":{"type":"number","minimum":1},
        "sectionId":{"type":"string","description":"ID must match a section.sectionId"},
        "startBar":{"type":"number","minimum":1},
        "repeat":{"type":"integer","minimum":1,"default":1},
        "sceneRef":{"type":"string","description":"optional DAWSheet scene id"},
        "macroRef":{"type":"string","description":"optional DAWSheet macro id"}
      },
      "additionalProperties": false
    }
  }
}`);

const COMMANDS_SCHEMA = JSON.parse(`{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://dawsheet.dev/spec/commands.schema.json",
  "title": "DAWSheet Command Envelope v1",
  "type": "object",
  "required": ["v", "type", "id", "origin", "at", "target", "payload"],
  "additionalProperties": false,
  "properties": {
    "v": {"const": 1},
    "type": {
      "type": "string",
      "enum": [
        "TRANSPORT.START","TRANSPORT.STOP","TRANSPORT.TEMPO_SET","SYNC.MIDI_CLOCK_TX",
        "NOTE.PLAY","CHORD.PLAY","ARPEGGIATE","PATTERN.TRIGGER","STEP.RATCHET","STEP.PROB",
        "CC.SET","CC.RAMP","CC.LFO","PROGRAM.CHANGE","PITCH.BEND","AFTERTOUCH",
        "DAW.CLIP.LAUNCH","DAW.SCENE.LAUNCH","DAW.TRACK.ARM",
        "OSC.SEND","DEVICE.PARAM_SET","MACRO.TRIGGER","CUE.GOTO"
      ]
    },
    "id": {"type": "string", "minLength": 1},
    "origin": {"type": "string", "minLength": 1, "description": "e.g., sheets://Grid!A5"},
    "at": {
      "description": "When to execute: 'now' | 'bar:beat[:ticks]' | ISO-8601 datetime",
      "oneOf": [
        {"type": "string", "const": "now"},
        {"type": "string", "pattern": "^\\\\d+:\\\\d+(:\\\\d+)?$"},
        {"type": "string", "format": "date-time"}
      ]
    },
    "quantize": {
      "type": ["string", "null"],
      "enum": ["off","1/4","1/8","1/8T","1/16","bar","scene", null]
    },
    "target": {"type": "string", "minLength": 1},
    "payload": {"type": "object"},
    "transform": {"type": "array","items": {"$ref": "#/$defs/transformOp"}},
    "meta": {"type": "object","additionalProperties": true,"properties": {"songId": {"type": "string"},"tags": {"type": "array", "items": {"type": "string"}}}}
  },
  "allOf": [
    {"$ref": "#/$defs/typedPayload"}
  ],
  "$defs": {
    "transformOp": {
      "type": "object",
      "required": ["op"],
      "properties": {
        "op": {"type": "string", "enum": ["transpose","humanize","quantize","limit","curve","scale_fit","velocity_curve","ramp"]},
        "semitones": {"type": "integer"},
        "ms": {"type": "number"},
        "vel": {"type": "number"},
        "grid": {"type": "string"},
        "strength": {"type": "number"},
        "min": {"type": "number"},
        "max": {"type": "number"},
        "shape": {"type": "string", "enum": ["exp","log","sine"]},
        "amount": {"type":"number"},
        "scale": {"type":"string"},
        "root": {"type":"string"}
      },
      "additionalProperties": true
    },
    "typedPayload": {
      "oneOf": [
        {"properties": {"type": {"const": "NOTE.PLAY"}, "payload": {"$ref": "#/$defs/payloads/notePlay"}}},
        {"properties": {"type": {"const": "CHORD.PLAY"}, "payload": {"$ref": "#/$defs/payloads/chordPlay"}}},
        {"properties": {"type": {"const": "ARPEGGIATE"}, "payload": {"$ref": "#/$defs/payloads/arpeggiate"}}},
        {"properties": {"type": {"const": "CC.SET"}, "payload": {"$ref": "#/$defs/payloads/ccSet"}}},
        {"properties": {"type": {"const": "CC.RAMP"}, "payload": {"$ref": "#/$defs/payloads/ccRamp"}}},
        {"properties": {"type": {"const": "CC.LFO"}, "payload": {"$ref": "#/$defs/payloads/ccLfo"}}},
        {"properties": {"type": {"const": "PROGRAM.CHANGE"}, "payload": {"$ref": "#/$defs/payloads/programChange"}}},
        {"properties": {"type": {"const": "PITCH.BEND"}, "payload": {"$ref": "#/$defs/payloads/pitchBend"}}},
        {"properties": {"type": {"const": "AFTERTOUCH"}, "payload": {"$ref": "#/$defs/payloads/aftertouch"}}},
        {"properties": {"type": {"const": "DAW.CLIP.LAUNCH"}, "payload": {"$ref": "#/$defs/payloads/dawClipLaunch"}}},
        {"properties": {"type": {"const": "DAW.SCENE.LAUNCH"}, "payload": {"$ref": "#/$defs/payloads/dawSceneLaunch"}}},
        {"properties": {"type": {"const": "DAW.TRACK.ARM"}, "payload": {"$ref": "#/$defs/payloads/dawTrackArm"}}},
        {"properties": {"type": {"const": "OSC.SEND"}, "payload": {"$ref": "#/$defs/payloads/oscSend"}}},
        {"properties": {"type": {"const": "DEVICE.PARAM_SET"}, "payload": {"$ref": "#/$defs/payloads/deviceParamSet"}}},
        {"properties": {"type": {"const": "MACRO.TRIGGER"}, "payload": {"$ref": "#/$defs/payloads/macroTrigger"}}},
        {"properties": {"type": {"const": "CUE.GOTO"}, "payload": {"$ref": "#/$defs/payloads/cueGoto"}}},
        {"properties": {"type": {"const": "TRANSPORT.TEMPO_SET"}, "payload": {"$ref": "#/$defs/payloads/tempoSet"}}},
        {"properties": {"type": {"const": "SYNC.MIDI_CLOCK_TX"}, "payload": {"$ref": "#/$defs/payloads/midiClockTx"}}}
      ]
    },
    "payloads": {
      "notePlay": {
        "type": "object",
        "required": ["note","velocity","durationSec","channel"],
        "properties": {
          "note": {"oneOf":[{"type":"string"},{"type":"integer","minimum":0,"maximum":127}]},
          "velocity": {"type":"integer","minimum":1,"maximum":127},
          "durationSec": {"type":"number","minimum":0},
          "channel": {"type":"integer","minimum":1,"maximum":16}
        },
        "additionalProperties": false
      },
      "chordPlay": {
        "type": "object",
        "required": ["root","quality","channel"],
        "properties": {
          "root": {"type":"string"},
          "quality": {"type":"string"},
          "voicing": {"type":"string"},
          "channel": {"type":"integer","minimum":1,"maximum":16}
        },
        "additionalProperties": true
      },
      "arpeggiate": {
        "type":"object",
        "required":["style","rate","gate","lengthBeats","channel"],
        "properties": {
          "style":{"type":"string","enum":["up","down","updown","random"]},
          "rate":{"type":"string","enum":["1/8","1/8T","1/16","1/32"]},
          "gate":{"type":"number","minimum":0,"maximum":1},
          "lengthBeats":{"type":"number","minimum":0},
          "channel":{"type":"integer","minimum":1,"maximum":16}
        },
        "allOf":[{"anyOf":[{"required":["rateHz"]},{"required":["sync"]}]}],
        "additionalProperties": false
      },
      "ccSet": {"type":"object","required":["cc","value","channel"],"properties": {"cc":{"type":"integer","minimum":0,"maximum":127},"value":{"type":"integer","minimum":0,"maximum":127},"channel":{"type":"integer","minimum":1,"maximum":16}},"additionalProperties": false},
      "ccRamp": {"type":"object","required":["cc","from","to","timeMs","channel"],"properties": {"cc":{"type":"integer","minimum":0,"maximum":127},"from":{"type":"integer","minimum":0,"maximum":127},"to":{"type":"integer","minimum":0,"maximum":127},"timeMs":{"type":"number","minimum":0},"channel":{"type":"integer","minimum":1,"maximum":16}},"additionalProperties": false},
      "ccLfo": {"type":"object","required":["cc","waveform","depth","center","channel"],"properties": {"cc":{"type":"integer","minimum":0,"maximum":127},"waveform":{"type":"string","enum":["sine","tri","saw","square","random"]},"rateHz":{"type":"number","minimum":0},"sync":{"type":"string","enum":["off","1/4","1/8","1/8T","1/16"]},"depth":{"type":"integer","minimum":0,"maximum":127},"center":{"type":"integer","minimum":0,"maximum":127},"channel":{"type":"integer","minimum":1,"maximum":16}},"allOf":[{"anyOf":[{"required":["rateHz"]},{"required":["sync"]}]}],"additionalProperties": false},
      "programChange": {"type":"object","required":["program","channel"],"properties": {"program":{"type":"integer","minimum":0,"maximum":127},"bankMsb":{"type":"integer","minimum":0,"maximum":127},"bankLsb":{"type":"integer","minimum":0,"maximum":127},"channel":{"type":"integer","minimum":1,"maximum":16}},"additionalProperties": false},
      "pitchBend": {"type":"object","required":["value","channel"],"properties": {"value":{"type":"integer","minimum":-8192,"maximum":8191},"channel":{"type":"integer","minimum":1,"maximum":16}},"additionalProperties": false},
      "aftertouch": {"type":"object","required":["value","channel"],"properties": {"value":{"type":"integer","minimum":0,"maximum":127},"channel":{"type":"integer","minimum":1,"maximum":16}},"additionalProperties": false},
      "dawSceneLaunch": {"type":"object","required":["scene"],"properties": {"scene":{"type":"integer","minimum":0}},"additionalProperties": false},
      "dawClipLaunch": {"type":"object","required":["track","slot"],"properties": {"track":{"type":"integer","minimum":0},"slot":{"type":"integer","minimum":0}},"additionalProperties": false},
      "dawTrackArm": {"type":"object","required":["track","state"],"properties": {"track":{"type":"integer","minimum":0},"state":{"type":"boolean"}},"additionalProperties": false},
      "oscSend": {"type":"object","required":["addr"],"properties": {"addr":{"type":"string"},"args":{"type":"array","items":{}}},"additionalProperties": false},
      "deviceParamSet": {"type":"object","required":["targetId","param","value"],"properties": {"targetId":{"type":"string"},"param":{"type":"string"},"value":{"type":"number"}},"additionalProperties": false},
      "macroTrigger": {"type":"object","required":["macroId"],"properties": {"macroId":{"type":"string"}},"additionalProperties": false},
      "cueGoto": {"type":"object","required":["position"],"properties": {"position":{"type":"string"}},"additionalProperties": false},
      "tempoSet": {"type":"object","required":["bpm"],"properties": {"bpm":{"type":"number","minimum":1}},"additionalProperties": false},
      "midiClockTx": {"type":"object","required":["enabled"],"properties": {"enabled":{"type":"boolean"}},"additionalProperties": false}
    }
  }
}`);

const CHORD_SCHEMA = JSON.parse(`{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://dawsheet.dev/spec/chord.schema.json",
  "title": "DAWSheet Chord Object v1",
  "type": "object",
  "required": ["symbol", "beats"],
  "properties": {
    "symbol": {"type": "string", "description": "The symbolic representation of the chord (e.g., Cmaj7, Dm)."},
    "beats": {"type": "number", "minimum": 0.25, "description": "Duration of the chord in beats."},
    "roman": {"type": "string", "description": "Optional: Roman numeral analysis of the chord."},
    "scale": {"type": "string", "description": "Optional: Hint for associated scale/mode."},
    "notes": {"type": "array", "items": {"type": "string"}, "description": "Optional: Specific notes making up the chord (e.g., for detected chords)."},
    "quality": {"type": "string", "description": "Optional: Detected or specified chord quality (e.g., major, minor, dominant, diminished)."}
  },
  "additionalProperties": false
}`);

const SCALE_SCHEMA = JSON.parse(`{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://dawsheet.dev/spec/scale.schema.json",
  "title": "DAWSheet Scale Object v1",
  "type": "object",
  "required": ["name", "tonic", "intervals"],
  "properties": {
    "name": {"type": "string", "description": "The name of the scale (e.g., 'Major', 'Dorian')."},
    "tonic": {"type": "string", "description": "The root note of the scale (e.g., 'C', 'Bb')."},
    "intervals": {"type": "array", "items": {"type": "string"}, "description": "The intervals that define the scale from its tonic (e.g., ['1P', '2M', '3M', '4P', '5P', '6M', '7M'])."}
  },
  "additionalProperties": false
}`);
