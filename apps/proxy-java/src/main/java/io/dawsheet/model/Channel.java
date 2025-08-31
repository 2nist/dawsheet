package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Channel {
    private TypeEnum type;
    private Long minimum;
    private Long maximum;

    @JsonProperty("type")
    public TypeEnum getType() { return type; }
    @JsonProperty("type")
    public void setType(TypeEnum value) { this.type = value; }

    @JsonProperty("minimum")
    public Long getMinimum() { return minimum; }
    @JsonProperty("minimum")
    public void setMinimum(Long value) { this.minimum = value; }

    @JsonProperty("maximum")
    public Long getMaximum() { return maximum; }
    @JsonProperty("maximum")
    public void setMaximum(Long value) { this.maximum = value; }
}
