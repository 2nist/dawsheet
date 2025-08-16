package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class AtOneOf {
    private ChannelType type;
    private String oneOfConst;
    private String pattern;

    @JsonProperty("type")
    public ChannelType getType() { return type; }
    @JsonProperty("type")
    public void setType(ChannelType value) { this.type = value; }

    @JsonProperty("const")
    public String getOneOfConst() { return oneOfConst; }
    @JsonProperty("const")
    public void setOneOfConst(String value) { this.oneOfConst = value; }

    @JsonProperty("pattern")
    public String getPattern() { return pattern; }
    @JsonProperty("pattern")
    public void setPattern(String value) { this.pattern = value; }
}
