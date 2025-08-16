package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Properties {
    private V v;
    private ChordID chordID;
    private ChordID name;
    private Aliases aliases;
    private Intervals intervals;
    private Extensions extensions;

    @JsonProperty("v")
    public V getV() { return v; }
    @JsonProperty("v")
    public void setV(V value) { this.v = value; }

    @JsonProperty("chordId")
    public ChordID getChordID() { return chordID; }
    @JsonProperty("chordId")
    public void setChordID(ChordID value) { this.chordID = value; }

    @JsonProperty("name")
    public ChordID getName() { return name; }
    @JsonProperty("name")
    public void setName(ChordID value) { this.name = value; }

    @JsonProperty("aliases")
    public Aliases getAliases() { return aliases; }
    @JsonProperty("aliases")
    public void setAliases(Aliases value) { this.aliases = value; }

    @JsonProperty("intervals")
    public Intervals getIntervals() { return intervals; }
    @JsonProperty("intervals")
    public void setIntervals(Intervals value) { this.intervals = value; }

    @JsonProperty("extensions")
    public Extensions getExtensions() { return extensions; }
    @JsonProperty("extensions")
    public void setExtensions(Extensions value) { this.extensions = value; }
}
