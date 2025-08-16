package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class LengthBeats {
    private ChannelType type;
    private long minimum;

    @JsonProperty("type")
    public ChannelType getType() { return type; }
    @JsonProperty("type")
    public void setType(ChannelType value) { this.type = value; }

    @JsonProperty("minimum")
    public long getMinimum() { return minimum; }
    @JsonProperty("minimum")
    public void setMinimum(long value) { this.minimum = value; }
}
