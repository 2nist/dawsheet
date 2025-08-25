package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Commands {
    private String schema;
    private String id;
    private String title;
    private String type;
    private String[] required;
    private boolean additionalProperties;
    private CommandsProperties properties;
    private ItemsElement[] allOf;
    private Defs defs;
    private Example[] examples;

    @JsonProperty("$schema")
    public String getSchema() { return schema; }
    @JsonProperty("$schema")
    public void setSchema(String value) { this.schema = value; }

    @JsonProperty("$id")
    public String getID() { return id; }
    @JsonProperty("$id")
    public void setID(String value) { this.id = value; }

    @JsonProperty("title")
    public String getTitle() { return title; }
    @JsonProperty("title")
    public void setTitle(String value) { this.title = value; }

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("required")
    public String[] getRequired() { return required; }
    @JsonProperty("required")
    public void setRequired(String[] value) { this.required = value; }

    @JsonProperty("additionalProperties")
    public boolean getAdditionalProperties() { return additionalProperties; }
    @JsonProperty("additionalProperties")
    public void setAdditionalProperties(boolean value) { this.additionalProperties = value; }

    @JsonProperty("properties")
    public CommandsProperties getProperties() { return properties; }
    @JsonProperty("properties")
    public void setProperties(CommandsProperties value) { this.properties = value; }

    @JsonProperty("allOf")
    public ItemsElement[] getAllOf() { return allOf; }
    @JsonProperty("allOf")
    public void setAllOf(ItemsElement[] value) { this.allOf = value; }

    @JsonProperty("$defs")
    public Defs getDefs() { return defs; }
    @JsonProperty("$defs")
    public void setDefs(Defs value) { this.defs = value; }

    @JsonProperty("examples")
    public Example[] getExamples() { return examples; }
    @JsonProperty("examples")
    public void setExamples(Example[] value) { this.examples = value; }
}
