package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class SectionProperties {
    private MacroRef name;
    private StartBar lengthBars;
    private SectionsClass chords;
    private LyricsRefClass lyricsRef;
    private LyricsRefClass notes;

    @JsonProperty("name")
    public MacroRef getName() { return name; }
    @JsonProperty("name")
    public void setName(MacroRef value) { this.name = value; }

    @JsonProperty("length_bars")
    public StartBar getLengthBars() { return lengthBars; }
    @JsonProperty("length_bars")
    public void setLengthBars(StartBar value) { this.lengthBars = value; }

    @JsonProperty("chords")
    public SectionsClass getChords() { return chords; }
    @JsonProperty("chords")
    public void setChords(SectionsClass value) { this.chords = value; }

    @JsonProperty("lyrics_ref")
    public LyricsRefClass getLyricsRef() { return lyricsRef; }
    @JsonProperty("lyrics_ref")
    public void setLyricsRef(LyricsRefClass value) { this.lyricsRef = value; }

    @JsonProperty("notes")
    public LyricsRefClass getNotes() { return notes; }
    @JsonProperty("notes")
    public void setNotes(LyricsRefClass value) { this.notes = value; }
}
