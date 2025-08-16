package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CcSet {
    private AftertouchType type;
    private String[] required;
    private CcSetProperties properties;
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
    public CcSetProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(CcSetProperties value) { this.properties = value; }

    @JsonProperty("additionalProperties")
    public boolean getAdditionalProperties() { return additionalProperties; }
    @JsonProperty("additionalProperties")
    public void setAdditionalProperties(boolean value) { this.additionalProperties = value; }
}
