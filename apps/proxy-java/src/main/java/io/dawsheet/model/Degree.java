package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Degree {
    private String type;
    private long minimum;
    private long maximum;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("minimum")
    public long getMinimum() { return minimum; }
    @JsonProperty("minimum")
    public void setMinimum(long value) { this.minimum = value; }

    @JsonProperty("maximum")
    public long getMaximum() { return maximum; }
    @JsonProperty("maximum")
    public void setMaximum(long value) { this.maximum = value; }
}
