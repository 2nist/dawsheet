package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class SectionElement {
    private String sectionID;
    private String name;
    private long lengthBars;
    private ChordElement[] chords;

    @JsonProperty("sectionId")
    public String getSectionID() { return sectionID; }
    @JsonProperty("sectionId")
    public void setSectionID(String value) { this.sectionID = value; }

    @JsonProperty("name")
    public String getName() { return name; }
    @JsonProperty("name")
    public void setName(String value) { this.name = value; }

    @JsonProperty("lengthBars")
    public long getLengthBars() { return lengthBars; }
    @JsonProperty("lengthBars")
    public void setLengthBars(long value) { this.lengthBars = value; }

    @JsonProperty("chords")
    public ChordElement[] getChords() { return chords; }
    @JsonProperty("chords")
    public void setChords(ChordElement[] value) { this.chords = value; }
}
