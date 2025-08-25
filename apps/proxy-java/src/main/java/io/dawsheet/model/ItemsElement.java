package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ItemsElement {
    private String ref;

    @JsonProperty("$ref")
    public String getRef() { return ref; }
    @JsonProperty("$ref")
    public void setRef(String value) { this.ref = value; }
}
