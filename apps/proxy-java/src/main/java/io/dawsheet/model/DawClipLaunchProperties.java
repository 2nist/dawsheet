package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class DawClipLaunchProperties {
    private LengthBeats track;
    private LengthBeats slot;

    @JsonProperty("track")
    public LengthBeats getTrack() { return track; }
    @JsonProperty("track")
    public void setTrack(LengthBeats value) { this.track = value; }

    @JsonProperty("slot")
    public LengthBeats getSlot() { return slot; }
    @JsonProperty("slot")
    public void setSlot(LengthBeats value) { this.slot = value; }
}
