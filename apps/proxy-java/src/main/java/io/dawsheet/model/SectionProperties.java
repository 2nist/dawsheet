package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class SectionProperties {
    private SongID sectionID;
    private SongID sectionName;
    private ArrangementIndex lengthBars;
    private SectionsClass chords;
    private LyricsRefClass lyricsRef;
    private LyricsRefClass notes;

    @JsonProperty("sectionId")
    public SongID getSectionID() { return sectionID; }
    @JsonProperty("sectionId")
    public void setSectionID(SongID value) { this.sectionID = value; }

    @JsonProperty("sectionName")
    public SongID getSectionName() { return sectionName; }
    @JsonProperty("sectionName")
    public void setSectionName(SongID value) { this.sectionName = value; }

    @JsonProperty("lengthBars")
    public ArrangementIndex getLengthBars() { return lengthBars; }
    @JsonProperty("lengthBars")
    public void setLengthBars(ArrangementIndex value) { this.lengthBars = value; }

    @JsonProperty("chords")
    public SectionsClass getChords() { return chords; }
    @JsonProperty("chords")
    public void setChords(SectionsClass value) { this.chords = value; }

    @JsonProperty("lyricsRef")
    public LyricsRefClass getLyricsRef() { return lyricsRef; }
    @JsonProperty("lyricsRef")
    public void setLyricsRef(LyricsRefClass value) { this.lyricsRef = value; }

    @JsonProperty("notes")
    public LyricsRefClass getNotes() { return notes; }
    @JsonProperty("notes")
    public void setNotes(LyricsRefClass value) { this.notes = value; }
}
