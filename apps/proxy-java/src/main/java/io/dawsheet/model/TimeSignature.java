package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TimeSignature {
    private String type;
    private String pattern;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("pattern")
    public String getPattern() { return pattern; }
    @JsonProperty("pattern")
    public void setPattern(String value) { this.pattern = value; }
}
