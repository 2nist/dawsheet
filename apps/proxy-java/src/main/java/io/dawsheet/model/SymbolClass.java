package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class SymbolClass {
    private String type;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }
}
