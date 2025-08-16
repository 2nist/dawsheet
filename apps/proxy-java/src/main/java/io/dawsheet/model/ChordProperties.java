package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ChordProperties {
    private MacroRef symbol;
    private StartBar beats;
    private MacroRef roman;
    private MacroRef scale;

    @JsonProperty("symbol")
    public MacroRef getSymbol() { return symbol; }
    @JsonProperty("symbol")
    public void setSymbol(MacroRef value) { this.symbol = value; }

    @JsonProperty("beats")
    public StartBar getBeats() { return beats; }
    @JsonProperty("beats")
    public void setBeats(StartBar value) { this.beats = value; }

    @JsonProperty("roman")
    public MacroRef getRoman() { return roman; }
    @JsonProperty("roman")
    public void setRoman(MacroRef value) { this.roman = value; }

    @JsonProperty("scale")
    public MacroRef getScale() { return scale; }
    @JsonProperty("scale")
    public void setScale(MacroRef value) { this.scale = value; }
}
