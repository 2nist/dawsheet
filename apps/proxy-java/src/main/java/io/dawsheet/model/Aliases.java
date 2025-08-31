package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Aliases {
    private String type;
    private SymbolClass items;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("items")
    public SymbolClass getItems() { return items; }
    @JsonProperty("items")
    public void setItems(SymbolClass value) { this.items = value; }
}
