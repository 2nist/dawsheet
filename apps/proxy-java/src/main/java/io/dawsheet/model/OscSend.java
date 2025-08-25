package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class OscSend {
    private String type;
    private String[] required;
    private OscSendProperties properties;
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
    public OscSendProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(OscSendProperties value) { this.properties = value; }

    @JsonProperty("additionalProperties")
    public boolean getAdditionalProperties() { return additionalProperties; }
    @JsonProperty("additionalProperties")
    public void setAdditionalProperties(boolean value) { this.additionalProperties = value; }
}
