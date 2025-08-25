package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Defs {
    private DefsSection section;
    private DefsChord chord;
    private ArrangementItem arrangementItem;

    @JsonProperty("section")
    public DefsSection getSection() { return section; }
    @JsonProperty("section")
    public void setSection(DefsSection value) { this.section = value; }

    @JsonProperty("chord")
    public DefsChord getChord() { return chord; }
    @JsonProperty("chord")
    public void setChord(DefsChord value) { this.chord = value; }

    @JsonProperty("arrangementItem")
    public ArrangementItem getArrangementItem() { return arrangementItem; }
    @JsonProperty("arrangementItem")
    public void setArrangementItem(ArrangementItem value) { this.arrangementItem = value; }
}
