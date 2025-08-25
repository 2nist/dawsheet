package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class DawTrackArmProperties {
    private LengthBeats track;
    private AmountClass state;

    @JsonProperty("track")
    public LengthBeats getTrack() { return track; }
    @JsonProperty("track")
    public void setTrack(LengthBeats value) { this.track = value; }

    @JsonProperty("state")
    public AmountClass getState() { return state; }
    @JsonProperty("state")
    public void setState(AmountClass value) { this.state = value; }
}
