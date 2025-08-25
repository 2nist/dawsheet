package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class MetaProperties {
    private LyricsRefClass title;
    private LyricsRefClass artist;
    private ArrangementIndex bpm;
    private SongID key;
    private SongID mode;
    private TimeSignature timeSignature;
    private Tags tags;
    private LyricsRefClass notes;

    @JsonProperty("title")
    public LyricsRefClass getTitle() { return title; }
    @JsonProperty("title")
    public void setTitle(LyricsRefClass value) { this.title = value; }

    @JsonProperty("artist")
    public LyricsRefClass getArtist() { return artist; }
    @JsonProperty("artist")
    public void setArtist(LyricsRefClass value) { this.artist = value; }

    @JsonProperty("bpm")
    public ArrangementIndex getBPM() { return bpm; }
    @JsonProperty("bpm")
    public void setBPM(ArrangementIndex value) { this.bpm = value; }

    @JsonProperty("key")
    public SongID getKey() { return key; }
    @JsonProperty("key")
    public void setKey(SongID value) { this.key = value; }

    @JsonProperty("mode")
    public SongID getMode() { return mode; }
    @JsonProperty("mode")
    public void setMode(SongID value) { this.mode = value; }

    @JsonProperty("timeSignature")
    public TimeSignature getTimeSignature() { return timeSignature; }
    @JsonProperty("timeSignature")
    public void setTimeSignature(TimeSignature value) { this.timeSignature = value; }

    @JsonProperty("tags")
    public Tags getTags() { return tags; }
    @JsonProperty("tags")
    public void setTags(Tags value) { this.tags = value; }

    @JsonProperty("notes")
    public LyricsRefClass getNotes() { return notes; }
    @JsonProperty("notes")
    public void setNotes(LyricsRefClass value) { this.notes = value; }
}
