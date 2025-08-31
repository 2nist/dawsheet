package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CcLfo {
    private String type;
    private String[] required;
    private CcLfoProperties properties;
    private AllOf[] allOf;
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
    public CcLfoProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(CcLfoProperties value) { this.properties = value; }

    @JsonProperty("allOf")
    public AllOf[] getAllOf() { return allOf; }
    @JsonProperty("allOf")
    public void setAllOf(AllOf[] value) { this.allOf = value; }

    @JsonProperty("additionalProperties")
    public boolean getAdditionalProperties() { return additionalProperties; }
    @JsonProperty("additionalProperties")
    public void setAdditionalProperties(boolean value) { this.additionalProperties = value; }
}
