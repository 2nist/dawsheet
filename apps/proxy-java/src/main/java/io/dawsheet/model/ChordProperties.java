package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ChordProperties {
    private SongID symbol;
    private ArrangementIndex beats;
    private SongID roman;
    private SongID scale;
    private CommandsRef notes;
    private SongID quality;

    @JsonProperty("symbol")
    public SongID getSymbol() { return symbol; }
    @JsonProperty("symbol")
    public void setSymbol(SongID value) { this.symbol = value; }

    @JsonProperty("beats")
    public ArrangementIndex getBeats() { return beats; }
    @JsonProperty("beats")
    public void setBeats(ArrangementIndex value) { this.beats = value; }

    @JsonProperty("roman")
    public SongID getRoman() { return roman; }
    @JsonProperty("roman")
    public void setRoman(SongID value) { this.roman = value; }

    @JsonProperty("scale")
    public SongID getScale() { return scale; }
    @JsonProperty("scale")
    public void setScale(SongID value) { this.scale = value; }

    @JsonProperty("notes")
    public CommandsRef getNotes() { return notes; }
    @JsonProperty("notes")
    public void setNotes(CommandsRef value) { this.notes = value; }

    @JsonProperty("quality")
    public SongID getQuality() { return quality; }
    @JsonProperty("quality")
    public void setQuality(SongID value) { this.quality = value; }
}
