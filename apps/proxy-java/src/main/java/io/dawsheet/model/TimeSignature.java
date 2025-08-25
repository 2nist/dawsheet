package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TimeSignature {
    private Type type;
    private String pattern;

    @JsonProperty("type")
    public Type getType() { return type; }
    @JsonProperty("type")
    public void setType(Type value) { this.type = value; }

    @JsonProperty("pattern")
    public String getPattern() { return pattern; }
    @JsonProperty("pattern")
    public void setPattern(String value) { this.pattern = value; }
}
