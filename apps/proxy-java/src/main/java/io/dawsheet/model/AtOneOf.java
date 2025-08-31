package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class AtOneOf {
    private TypeEnum type;
    private String oneOfConst;
    private String pattern;
    private String format;

    @JsonProperty("type")
    public TypeEnum getType() { return type; }
    @JsonProperty("type")
    public void setType(TypeEnum value) { this.type = value; }

    @JsonProperty("const")
    public String getOneOfConst() { return oneOfConst; }
    @JsonProperty("const")
    public void setOneOfConst(String value) { this.oneOfConst = value; }

    @JsonProperty("pattern")
    public String getPattern() { return pattern; }
    @JsonProperty("pattern")
    public void setPattern(String value) { this.pattern = value; }

    @JsonProperty("format")
    public String getFormat() { return format; }
    @JsonProperty("format")
    public void setFormat(String value) { this.format = value; }
}
