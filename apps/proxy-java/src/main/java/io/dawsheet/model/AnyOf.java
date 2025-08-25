package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class AnyOf {
    private String[] required;

    @JsonProperty("required")
    public String[] getRequired() { return required; }
    @JsonProperty("required")
    public void setRequired(String[] value) { this.required = value; }
}
