package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Arpeggiate {
    private AftertouchType type;
    private String[] required;
    private ArpeggiateProperties properties;
    private boolean additionalProperties;

    @JsonProperty("type")
    public AftertouchType getType() { return type; }
    @JsonProperty("type")
    public void setType(AftertouchType value) { this.type = value; }

    @JsonProperty("required")
    public String[] getRequired() { return required; }
    @JsonProperty("required")
    public void setRequired(String[] value) { this.required = value; }

    @JsonProperty("properties")
    public ArpeggiateProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(ArpeggiateProperties value) { this.properties = value; }

    @JsonProperty("additionalProperties")
    public boolean getAdditionalProperties() { return additionalProperties; }
    @JsonProperty("additionalProperties")
    public void setAdditionalProperties(boolean value) { this.additionalProperties = value; }
}
