package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class At {
    private String description;
    private AtOneOf[] oneOf;

    @JsonProperty("description")
    public String getDescription() { return description; }
    @JsonProperty("description")
    public void setDescription(String value) { this.description = value; }

    @JsonProperty("oneOf")
    public AtOneOf[] getOneOf() { return oneOf; }
    @JsonProperty("oneOf")
    public void setOneOf(AtOneOf[] value) { this.oneOf = value; }
}
