package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class OneOfProperties {
    private PurpleType type;
    private ItemsElement payload;

    @JsonProperty("type")
    public PurpleType getType() { return type; }
    @JsonProperty("type")
    public void setType(PurpleType value) { this.type = value; }

    @JsonProperty("payload")
    public ItemsElement getPayload() { return payload; }
    @JsonProperty("payload")
    public void setPayload(ItemsElement value) { this.payload = value; }
}
