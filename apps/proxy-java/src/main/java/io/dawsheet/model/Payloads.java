package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Payloads {
    private NotePlay notePlay;
    private ChordPlay chordPlay;
    private Arpeggiate arpeggiate;
    private CcSet ccSet;
    private CcRamp ccRamp;
    private CcLfo ccLfo;
    private ProgramChange programChange;
    private Aftertouch pitchBend;
    private Aftertouch aftertouch;
    private DawSceneLaunch dawSceneLaunch;
    private DawClipLaunch dawClipLaunch;
    private DawTrackArm dawTrackArm;
    private OscSend oscSend;
    private DeviceParamSet deviceParamSet;
    private MacroTrigger macroTrigger;
    private CueGoto cueGoto;
    private TempoSet tempoSet;
    private MIDIClockTx midiClockTx;

    @JsonProperty("notePlay")
    public NotePlay getNotePlay() { return notePlay; }
    @JsonProperty("notePlay")
    public void setNotePlay(NotePlay value) { this.notePlay = value; }

    @JsonProperty("chordPlay")
    public ChordPlay getChordPlay() { return chordPlay; }
    @JsonProperty("chordPlay")
    public void setChordPlay(ChordPlay value) { this.chordPlay = value; }

    @JsonProperty("arpeggiate")
    public Arpeggiate getArpeggiate() { return arpeggiate; }
    @JsonProperty("arpeggiate")
    public void setArpeggiate(Arpeggiate value) { this.arpeggiate = value; }

    @JsonProperty("ccSet")
    public CcSet getCcSet() { return ccSet; }
    @JsonProperty("ccSet")
    public void setCcSet(CcSet value) { this.ccSet = value; }

    @JsonProperty("ccRamp")
    public CcRamp getCcRamp() { return ccRamp; }
    @JsonProperty("ccRamp")
    public void setCcRamp(CcRamp value) { this.ccRamp = value; }

    @JsonProperty("ccLfo")
    public CcLfo getCcLfo() { return ccLfo; }
    @JsonProperty("ccLfo")
    public void setCcLfo(CcLfo value) { this.ccLfo = value; }

    @JsonProperty("programChange")
    public ProgramChange getProgramChange() { return programChange; }
    @JsonProperty("programChange")
    public void setProgramChange(ProgramChange value) { this.programChange = value; }

    @JsonProperty("pitchBend")
    public Aftertouch getPitchBend() { return pitchBend; }
    @JsonProperty("pitchBend")
    public void setPitchBend(Aftertouch value) { this.pitchBend = value; }

    @JsonProperty("aftertouch")
    public Aftertouch getAftertouch() { return aftertouch; }
    @JsonProperty("aftertouch")
    public void setAftertouch(Aftertouch value) { this.aftertouch = value; }

    @JsonProperty("dawSceneLaunch")
    public DawSceneLaunch getDawSceneLaunch() { return dawSceneLaunch; }
    @JsonProperty("dawSceneLaunch")
    public void setDawSceneLaunch(DawSceneLaunch value) { this.dawSceneLaunch = value; }

    @JsonProperty("dawClipLaunch")
    public DawClipLaunch getDawClipLaunch() { return dawClipLaunch; }
    @JsonProperty("dawClipLaunch")
    public void setDawClipLaunch(DawClipLaunch value) { this.dawClipLaunch = value; }

    @JsonProperty("dawTrackArm")
    public DawTrackArm getDawTrackArm() { return dawTrackArm; }
    @JsonProperty("dawTrackArm")
    public void setDawTrackArm(DawTrackArm value) { this.dawTrackArm = value; }

    @JsonProperty("oscSend")
    public OscSend getOscSend() { return oscSend; }
    @JsonProperty("oscSend")
    public void setOscSend(OscSend value) { this.oscSend = value; }

    @JsonProperty("deviceParamSet")
    public DeviceParamSet getDeviceParamSet() { return deviceParamSet; }
    @JsonProperty("deviceParamSet")
    public void setDeviceParamSet(DeviceParamSet value) { this.deviceParamSet = value; }

    @JsonProperty("macroTrigger")
    public MacroTrigger getMacroTrigger() { return macroTrigger; }
    @JsonProperty("macroTrigger")
    public void setMacroTrigger(MacroTrigger value) { this.macroTrigger = value; }

    @JsonProperty("cueGoto")
    public CueGoto getCueGoto() { return cueGoto; }
    @JsonProperty("cueGoto")
    public void setCueGoto(CueGoto value) { this.cueGoto = value; }

    @JsonProperty("tempoSet")
    public TempoSet getTempoSet() { return tempoSet; }
    @JsonProperty("tempoSet")
    public void setTempoSet(TempoSet value) { this.tempoSet = value; }

    @JsonProperty("midiClockTx")
    public MIDIClockTx getMIDIClockTx() { return midiClockTx; }
    @JsonProperty("midiClockTx")
    public void setMIDIClockTx(MIDIClockTx value) { this.midiClockTx = value; }
}
