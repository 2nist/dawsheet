package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CueGotoProperties {
    private AmountClass position;

    @JsonProperty("position")
    public AmountClass getPosition() { return position; }
    @JsonProperty("position")
    public void setPosition(AmountClass value) { this.position = value; }
}
