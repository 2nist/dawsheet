package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TypedPayload {
    private TypedPayloadOneOf[] oneOf;

    @JsonProperty("oneOf")
    public TypedPayloadOneOf[] getOneOf() { return oneOf; }
    @JsonProperty("oneOf")
    public void setOneOf(TypedPayloadOneOf[] value) { this.oneOf = value; }
}
