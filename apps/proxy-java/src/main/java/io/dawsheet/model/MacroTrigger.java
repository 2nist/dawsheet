package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class MacroTrigger {
    private String type;
    private String[] required;
    private MacroTriggerProperties properties;
    private boolean additionalProperties;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("required")
    public String[] getRequired() { return required; }
    @JsonProperty("required")
    public void setRequired(String[] value) { this.required = value; }

    @JsonProperty("properties")
    public MacroTriggerProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(MacroTriggerProperties value) { this.properties = value; }

    @JsonProperty("additionalProperties")
    public boolean getAdditionalProperties() { return additionalProperties; }
    @JsonProperty("additionalProperties")
    public void setAdditionalProperties(boolean value) { this.additionalProperties = value; }
}
