package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ArrangementItemProperties {
    private ArrangementIndex arrangementIndex;
    private SongID sectionID;
    private ArrangementIndex startBar;
    private Repeat repeat;
    private SongID sceneRef;
    private SongID macroRef;

    @JsonProperty("arrangementIndex")
    public ArrangementIndex getArrangementIndex() { return arrangementIndex; }
    @JsonProperty("arrangementIndex")
    public void setArrangementIndex(ArrangementIndex value) { this.arrangementIndex = value; }

    @JsonProperty("sectionId")
    public SongID getSectionID() { return sectionID; }
    @JsonProperty("sectionId")
    public void setSectionID(SongID value) { this.sectionID = value; }

    @JsonProperty("startBar")
    public ArrangementIndex getStartBar() { return startBar; }
    @JsonProperty("startBar")
    public void setStartBar(ArrangementIndex value) { this.startBar = value; }

    @JsonProperty("repeat")
    public Repeat getRepeat() { return repeat; }
    @JsonProperty("repeat")
    public void setRepeat(Repeat value) { this.repeat = value; }

    @JsonProperty("sceneRef")
    public SongID getSceneRef() { return sceneRef; }
    @JsonProperty("sceneRef")
    public void setSceneRef(SongID value) { this.sceneRef = value; }

    @JsonProperty("macroRef")
    public SongID getMacroRef() { return macroRef; }
    @JsonProperty("macroRef")
    public void setMacroRef(SongID value) { this.macroRef = value; }
}
