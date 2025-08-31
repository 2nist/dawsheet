package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class AllOf {
    private AnyOf[] anyOf;

    @JsonProperty("anyOf")
    public AnyOf[] getAnyOf() { return anyOf; }
    @JsonProperty("anyOf")
    public void setAnyOf(AnyOf[] value) { this.anyOf = value; }
}
