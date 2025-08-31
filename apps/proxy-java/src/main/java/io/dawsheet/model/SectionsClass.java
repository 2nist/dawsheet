package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class SectionsClass {
    private String type;
    private ArrangementItems items;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("items")
    public ArrangementItems getItems() { return items; }
    @JsonProperty("items")
    public void setItems(ArrangementItems value) { this.items = value; }
}
