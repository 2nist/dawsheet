package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TempoSetProperties {
    private LengthBeats bpm;

    @JsonProperty("bpm")
    public LengthBeats getBPM() { return bpm; }
    @JsonProperty("bpm")
    public void setBPM(LengthBeats value) { this.bpm = value; }
}
