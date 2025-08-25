package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Intervals {
    private String type;
    private Items items;
    private String description;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("items")
    public Items getItems() { return items; }
    @JsonProperty("items")
    public void setItems(Items value) { this.items = value; }

    @JsonProperty("description")
    public String getDescription() { return description; }
    @JsonProperty("description")
    public void setDescription(String value) { this.description = value; }
}
