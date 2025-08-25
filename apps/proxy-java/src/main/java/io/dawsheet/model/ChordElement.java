package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ChordElement {
    private String symbol;
    private long beats;

    @JsonProperty("symbol")
    public String getSymbol() { return symbol; }
    @JsonProperty("symbol")
    public void setSymbol(String value) { this.symbol = value; }

    @JsonProperty("beats")
    public long getBeats() { return beats; }
    @JsonProperty("beats")
    public void setBeats(long value) { this.beats = value; }
}
