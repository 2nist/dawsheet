package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class PurpleType {
    private String typeConst;

    @JsonProperty("const")
    public String getTypeConst() { return typeConst; }
    @JsonProperty("const")
    public void setTypeConst(String value) { this.typeConst = value; }
}
