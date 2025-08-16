package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class SectionElement {
    private String name;
    private long lengthBars;
    private ChordElement[] chords;

    @JsonProperty("name")
    public String getName() { return name; }
    @JsonProperty("name")
    public void setName(String value) { this.name = value; }

    @JsonProperty("length_bars")
    public long getLengthBars() { return lengthBars; }
    @JsonProperty("length_bars")
    public void setLengthBars(long value) { this.lengthBars = value; }

    @JsonProperty("chords")
    public ChordElement[] getChords() { return chords; }
    @JsonProperty("chords")
    public void setChords(ChordElement[] value) { this.chords = value; }
}
