package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Extensions {
    private String type;
    private AliasesItems items;
    private String description;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("items")
    public AliasesItems getItems() { return items; }
    @JsonProperty("items")
    public void setItems(AliasesItems value) { this.items = value; }

    @JsonProperty("description")
    public String getDescription() { return description; }
    @JsonProperty("description")
    public void setDescription(String value) { this.description = value; }
}
