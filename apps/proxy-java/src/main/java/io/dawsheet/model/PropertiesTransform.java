package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class PropertiesTransform {
    private String type;
    private ItemsElement items;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("items")
    public ItemsElement getItems() { return items; }
    @JsonProperty("items")
    public void setItems(ItemsElement value) { this.items = value; }
}
