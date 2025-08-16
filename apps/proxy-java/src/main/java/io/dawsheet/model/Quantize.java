package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Quantize {
    private String[] type;
    private String[] quantizeEnum;

    @JsonProperty("type")
    public String[] getType() { return type; }
    @JsonProperty("type")
    public void setType(String[] value) { this.type = value; }

    @JsonProperty("enum")
    public String[] getQuantizeEnum() { return quantizeEnum; }
    @JsonProperty("enum")
    public void setQuantizeEnum(String[] value) { this.quantizeEnum = value; }
}
