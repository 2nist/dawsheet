package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class MacroTriggerProperties {
    private AmountClass macroID;

    @JsonProperty("macroId")
    public AmountClass getMacroID() { return macroID; }
    @JsonProperty("macroId")
    public void setMacroID(AmountClass value) { this.macroID = value; }
}
