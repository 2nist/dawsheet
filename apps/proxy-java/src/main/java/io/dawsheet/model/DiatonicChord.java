package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class DiatonicChord {
    private long degree;
    private String quality;
    private String symbol;

    @JsonProperty("degree")
    public long getDegree() { return degree; }
    @JsonProperty("degree")
    public void setDegree(long value) { this.degree = value; }

    @JsonProperty("quality")
    public String getQuality() { return quality; }
    @JsonProperty("quality")
    public void setQuality(String value) { this.quality = value; }

    @JsonProperty("symbol")
    public String getSymbol() { return symbol; }
    @JsonProperty("symbol")
    public void setSymbol(String value) { this.symbol = value; }
}
