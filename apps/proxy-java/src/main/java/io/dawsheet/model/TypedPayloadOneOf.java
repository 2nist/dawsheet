package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TypedPayloadOneOf {
    private OneOfProperties properties;

    @JsonProperty("properties")
    public OneOfProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(OneOfProperties value) { this.properties = value; }
}
