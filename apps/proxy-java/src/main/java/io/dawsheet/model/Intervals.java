package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Intervals {
    private String type;
    private long minItems;
    private IntervalsItems items;
    private String description;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("minItems")
    public long getMinItems() { return minItems; }
    @JsonProperty("minItems")
    public void setMinItems(long value) { this.minItems = value; }

    @JsonProperty("items")
    public IntervalsItems getItems() { return items; }
    @JsonProperty("items")
    public void setItems(IntervalsItems value) { this.items = value; }

    @JsonProperty("description")
    public String getDescription() { return description; }
    @JsonProperty("description")
    public void setDescription(String value) { this.description = value; }
}
