package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ItemsProperties {
    private Degree degree;
    private Name quality;
    private SymbolClass symbol;

    @JsonProperty("degree")
    public Degree getDegree() { return degree; }
    @JsonProperty("degree")
    public void setDegree(Degree value) { this.degree = value; }

    @JsonProperty("quality")
    public Name getQuality() { return quality; }
    @JsonProperty("quality")
    public void setQuality(Name value) { this.quality = value; }

    @JsonProperty("symbol")
    public SymbolClass getSymbol() { return symbol; }
    @JsonProperty("symbol")
    public void setSymbol(SymbolClass value) { this.symbol = value; }
}
