package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Repeat {
    private String type;
    private long minimum;
    private long repeatDefault;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("minimum")
    public long getMinimum() { return minimum; }
    @JsonProperty("minimum")
    public void setMinimum(long value) { this.minimum = value; }

    @JsonProperty("default")
    public long getRepeatDefault() { return repeatDefault; }
    @JsonProperty("default")
    public void setRepeatDefault(long value) { this.repeatDefault = value; }
}
