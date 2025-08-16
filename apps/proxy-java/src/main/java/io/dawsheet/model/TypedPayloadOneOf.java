package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TypedPayloadOneOf {
    private AftertouchType type;
    private OneOfProperties properties;

    @JsonProperty("type")
    public AftertouchType getType() { return type; }
    @JsonProperty("type")
    public void setType(AftertouchType value) { this.type = value; }

    @JsonProperty("properties")
    public OneOfProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(OneOfProperties value) { this.properties = value; }
}
