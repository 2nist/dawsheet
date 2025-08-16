package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ID {
    private ChannelType type;
    private long minLength;

    @JsonProperty("type")
    public ChannelType getType() { return type; }
    @JsonProperty("type")
    public void setType(ChannelType value) { this.type = value; }

    @JsonProperty("minLength")
    public long getMinLength() { return minLength; }
    @JsonProperty("minLength")
    public void setMinLength(long value) { this.minLength = value; }
}
