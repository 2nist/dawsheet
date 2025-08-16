// Generated from JSON Schemas. Do not edit by hand.
// Generated: 2025-08-16T14:43:36.018Z
// spec/commands.schema.json
export type DAWSheetCommandEnvelopeV1 = TypedPayload & {
  v: 1;
  type:
    | "TRANSPORT.START"
    | "TRANSPORT.STOP"
    | "TRANSPORT.TEMPO_SET"
    | "SYNC.MIDI_CLOCK_TX"
    | "NOTE.PLAY"
    | "CHORD.PLAY"
    | "ARPEGGIATE"
    | "PATTERN.TRIGGER"
    | "STEP.RATCHET"
    | "STEP.PROB"
    | "CC.SET"
    | "CC.RAMP"
    | "CC.LFO"
    | "PROGRAM.CHANGE"
    | "PITCH.BEND"
    | "AFTERTOUCH"
    | "DAW.CLIP.LAUNCH"
    | "DAW.SCENE.LAUNCH"
    | "DAW.TRACK.ARM"
    | "OSC.SEND"
    | "DEVICE.PARAM_SET"
    | "MACRO.TRIGGER"
    | "CUE.GOTO";
  id: string;
  /**
   * e.g., sheets://Grid!A5
   */
  origin: string;
  /**
   * When to execute: 'now' | 'bar:beat[:ticks]' | ISO-8601 datetime
   */
  at: "now" | string;
  quantize?: "off" | "1/4" | "1/8" | "1/8T" | "1/16" | "bar" | "scene" | null;
  target: string;
  payload: {
    [k: string]: unknown;
  };
  transform?: TransformOp[];
  meta?: {
    songId?: string;
    tags?: string[];
    [k: string]: unknown;
  };
};
export type TypedPayload =
  | {
      type?: "NOTE.PLAY";
      payload?: NotePlay;
      [k: string]: unknown;
    }
  | {
      type?: "CHORD.PLAY";
      payload?: ChordPlay;
      [k: string]: unknown;
    }
  | {
      type?: "ARPEGGIATE";
      payload?: Arpeggiate;
      [k: string]: unknown;
    }
  | {
      type?: "CC.SET";
      payload?: CcSet;
      [k: string]: unknown;
    }
  | {
      type?: "CC.RAMP";
      payload?: CcRamp;
      [k: string]: unknown;
    }
  | {
      type?: "CC.LFO";
      payload?: CcLfo;
      [k: string]: unknown;
    }
  | {
      type?: "PROGRAM.CHANGE";
      payload?: ProgramChange;
      [k: string]: unknown;
    }
  | {
      type?: "PITCH.BEND";
      payload?: PitchBend;
      [k: string]: unknown;
    }
  | {
      type?: "AFTERTOUCH";
      payload?: Aftertouch;
      [k: string]: unknown;
    }
  | {
      type?: "DAW.SCENE.LAUNCH";
      payload?: DawSceneLaunch;
      [k: string]: unknown;
    }
  | {
      type?: "DAW.CLIP.LAUNCH";
      payload?: DawClipLaunch;
      [k: string]: unknown;
    }
  | {
      type?: "DAW.TRACK.ARM";
      payload?: DawTrackArm;
      [k: string]: unknown;
    }
  | {
      type?: "OSC.SEND";
      payload?: OscSend;
      [k: string]: unknown;
    }
  | {
      type?: "DEVICE.PARAM_SET";
      payload?: DeviceParamSet;
      [k: string]: unknown;
    }
  | {
      type?: "MACRO.TRIGGER";
      payload?: MacroTrigger;
      [k: string]: unknown;
    }
  | {
      type?: "CUE.GOTO";
      payload?: CueGoto;
      [k: string]: unknown;
    }
  | {
      type?: "TRANSPORT.TEMPO_SET";
      payload?: TempoSet;
      [k: string]: unknown;
    }
  | {
      type?: "SYNC.MIDI_CLOCK_TX";
      payload?: MidiClockTx;
      [k: string]: unknown;
    };
export type CcLfo = {
  [k: string]: unknown;
} & {
  cc: number;
  waveform: "sine" | "tri" | "saw" | "square" | "random";
  rateHz?: number;
  sync?: "off" | "1/4" | "1/8" | "1/8T" | "1/16";
  depth: number;
  center: number;
  channel: number;
};

export interface NotePlay {
  note: string | number;
  velocity: number;
  durationSec: number;
  channel: number;
}
export interface ChordPlay {
  root: string;
  quality: string;
  voicing?: string;
  channel: number;
  [k: string]: unknown;
}
export interface Arpeggiate {
  style: "up" | "down" | "updown" | "random";
  rate: "1/8" | "1/8T" | "1/16" | "1/32";
  gate: number;
  lengthBeats: number;
  channel: number;
}
export interface CcSet {
  cc: number;
  value: number;
  channel: number;
}
export interface CcRamp {
  cc: number;
  from: number;
  to: number;
  timeMs: number;
  channel: number;
}
export interface ProgramChange {
  program: number;
  bankMsb?: number;
  bankLsb?: number;
  channel: number;
}
export interface PitchBend {
  value: number;
  channel: number;
}
export interface Aftertouch {
  value: number;
  channel: number;
}
export interface DawSceneLaunch {
  scene: number;
}
export interface DawClipLaunch {
  track: number;
  slot: number;
}
export interface DawTrackArm {
  track: number;
  state: boolean;
}
export interface OscSend {
  addr: string;
  args?: unknown[];
}
export interface DeviceParamSet {
  targetId: string;
  param: string;
  value: number;
}
export interface MacroTrigger {
  macroId: string;
}
export interface CueGoto {
  position: string;
}
export interface TempoSet {
  bpm: number;
}
export interface MidiClockTx {
  enabled: boolean;
}
export interface TransformOp {
  op: "transpose" | "humanize" | "quantize" | "limit" | "curve" | "scale_fit" | "velocity_curve" | "ramp";
  semitones?: number;
  ms?: number;
  vel?: number;
  grid?: string;
  strength?: number;
  min?: number;
  max?: number;
  shape?: "exp" | "log" | "sine";
  amount?: number;
  scale?: string;
  root?: string;
  [k: string]: unknown;
}

// spec/song.schema.json
export interface DAWSheetSongObjectV1 {
  v: 1;
  meta: {
    title: string;
    artist?: string;
    bpm: number;
    /**
     * e.g., C, D#, Fm
     */
    key: string;
    /**
     * Ionian/Dorian/...
     */
    mode?: string;
    timeSignature?: string;
    tags?: string[];
    notes?: string;
    [k: string]: unknown;
  };
  sections: Section[];
  arrangement: ArrangementItem[];
  /**
   * Optional direct references to command groups/macros/scenes
   */
  commands_ref?: string[];
}
export interface Section {
  /**
   * Verse, Chorus, Bridge, etc.
   */
  name: string;
  length_bars: number;
  chords?: Chord[];
  lyrics_ref?: string;
  notes?: string;
  [k: string]: unknown;
}
export interface Chord {
  /**
   * e.g., Dm7, G7, Cmaj7
   */
  symbol: string;
  beats?: number;
  /**
   * optional roman numeral
   */
  roman?: string;
  /**
   * optional scale/mode hint
   */
  scale?: string;
}
export interface ArrangementItem {
  /**
   * name must match a section.name
   */
  section: string;
  start_bar: number;
  repeat?: number;
  /**
   * optional DAWSheet scene id
   */
  scene_ref?: string;
  /**
   * optional DAWSheet macro id
   */
  macro_ref?: string;
}

// spec/chord.schema.json
export interface DAWSheetChordDefinitionV1 {
  v: 1;
  /**
   * Unique id for chord quality/voicing
   */
  chordId: string;
  /**
   * Display name, e.g., Major, Minor, Dominant7
   */
  name: string;
  aliases?: string[];
  /**
   * e.g., ["1","3","5"] or with quality like M3, P5
   *
   * @minItems 1
   */
  intervals: [string, ...string[]];
  /**
   * optional additional intervals
   */
  extensions?: string[];
}

// spec/scale.schema.json
export interface DAWSheetScaleDefinitionV1 {
  v: 1;
  /**
   * Unique id for scale/mode
   */
  scaleId: string;
  /**
   * Display name, e.g., Major (Ionian)
   */
  name: string;
  aliases?: string[];
  /**
   * Scale degrees as intervals from tonic
   *
   * @minItems 1
   */
  intervals: [string, ...string[]];
  /**
   * Precomputed chords for quick lookup (optional cache)
   */
  diatonic_chords?: {
    degree: number;
    /**
     * e.g., maj, min, dim, aug, dom7
     */
    quality: string;
    symbol?: string;
    [k: string]: unknown;
  }[];
}

