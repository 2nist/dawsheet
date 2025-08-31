package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ID {
    private TypeEnum type;
    private long minLength;

    @JsonProperty("type")
    public TypeEnum getType() { return type; }
    @JsonProperty("type")
    public void setType(TypeEnum value) { this.type = value; }

    @JsonProperty("minLength")
    public long getMinLength() { return minLength; }
    @JsonProperty("minLength")
    public void setMinLength(long value) { this.minLength = value; }
}
