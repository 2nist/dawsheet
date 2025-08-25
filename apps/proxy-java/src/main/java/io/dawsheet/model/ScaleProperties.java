package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ScaleProperties {
    private V v;
    private Name scaleID;
    private Name name;
    private Aliases aliases;
    private Intervals intervals;
    private DiatonicChords diatonicChords;

    @JsonProperty("v")
    public V getV() { return v; }
    @JsonProperty("v")
    public void setV(V value) { this.v = value; }

    @JsonProperty("scaleId")
    public Name getScaleID() { return scaleID; }
    @JsonProperty("scaleId")
    public void setScaleID(Name value) { this.scaleID = value; }

    @JsonProperty("name")
    public Name getName() { return name; }
    @JsonProperty("name")
    public void setName(Name value) { this.name = value; }

    @JsonProperty("aliases")
    public Aliases getAliases() { return aliases; }
    @JsonProperty("aliases")
    public void setAliases(Aliases value) { this.aliases = value; }

    @JsonProperty("intervals")
    public Intervals getIntervals() { return intervals; }
    @JsonProperty("intervals")
    public void setIntervals(Intervals value) { this.intervals = value; }

    @JsonProperty("diatonic_chords")
    public DiatonicChords getDiatonicChords() { return diatonicChords; }
    @JsonProperty("diatonic_chords")
    public void setDiatonicChords(DiatonicChords value) { this.diatonicChords = value; }
}
