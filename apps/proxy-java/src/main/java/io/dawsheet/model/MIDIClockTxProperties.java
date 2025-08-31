package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class MIDIClockTxProperties {
    private AmountClass enabled;

    @JsonProperty("enabled")
    public AmountClass getEnabled() { return enabled; }
    @JsonProperty("enabled")
    public void setEnabled(AmountClass value) { this.enabled = value; }
}
