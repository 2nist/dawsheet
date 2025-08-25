package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Note {
    private Channel[] oneOf;

    @JsonProperty("oneOf")
    public Channel[] getOneOf() { return oneOf; }
    @JsonProperty("oneOf")
    public void setOneOf(Channel[] value) { this.oneOf = value; }
}
