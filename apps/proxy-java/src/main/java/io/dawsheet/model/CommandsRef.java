package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CommandsRef {
    private String type;
    private String description;
    private LyricsRefClass items;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("description")
    public String getDescription() { return description; }
    @JsonProperty("description")
    public void setDescription(String value) { this.description = value; }

    @JsonProperty("items")
    public LyricsRefClass getItems() { return items; }
    @JsonProperty("items")
    public void setItems(LyricsRefClass value) { this.items = value; }
}
