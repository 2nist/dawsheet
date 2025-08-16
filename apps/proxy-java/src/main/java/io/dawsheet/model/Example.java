package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Example {
    private long v;
    private String scaleID;
    private String name;
    private String[] aliases;
    private String[] intervals;
    private DiatonicChord[] diatonicChords;

    @JsonProperty("v")
    public long getV() { return v; }
    @JsonProperty("v")
    public void setV(long value) { this.v = value; }

    @JsonProperty("scaleId")
    public String getScaleID() { return scaleID; }
    @JsonProperty("scaleId")
    public void setScaleID(String value) { this.scaleID = value; }

    @JsonProperty("name")
    public String getName() { return name; }
    @JsonProperty("name")
    public void setName(String value) { this.name = value; }

    @JsonProperty("aliases")
    public String[] getAliases() { return aliases; }
    @JsonProperty("aliases")
    public void setAliases(String[] value) { this.aliases = value; }

    @JsonProperty("intervals")
    public String[] getIntervals() { return intervals; }
    @JsonProperty("intervals")
    public void setIntervals(String[] value) { this.intervals = value; }

    @JsonProperty("diatonic_chords")
    public DiatonicChord[] getDiatonicChords() { return diatonicChords; }
    @JsonProperty("diatonic_chords")
    public void setDiatonicChords(DiatonicChord[] value) { this.diatonicChords = value; }
}
