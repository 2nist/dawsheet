package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Tags {
    private String type;
    private LyricsRefClass items;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("items")
    public LyricsRefClass getItems() { return items; }
    @JsonProperty("items")
    public void setItems(LyricsRefClass value) { this.items = value; }
}
