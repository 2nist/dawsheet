package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class OpClass {
    private TypeEnum type;
    private String[] typeEnum;

    @JsonProperty("type")
    public TypeEnum getType() { return type; }
    @JsonProperty("type")
    public void setType(TypeEnum value) { this.type = value; }

    @JsonProperty("enum")
    public String[] getTypeEnum() { return typeEnum; }
    @JsonProperty("enum")
    public void setTypeEnum(String[] value) { this.typeEnum = value; }
}
