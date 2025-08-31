package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class StartBar {
    private String type;
    private double minimum;

    @JsonProperty("type")
    public String getType() { return type; }
    @JsonProperty("type")
    public void setType(String value) { this.type = value; }

    @JsonProperty("minimum")
    public double getMinimum() { return minimum; }
    @JsonProperty("minimum")
    public void setMinimum(double value) { this.minimum = value; }
}
