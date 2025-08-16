package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ArrangementItemProperties {
    private MacroRef section;
    private StartBar startBar;
    private Repeat repeat;
    private MacroRef sceneRef;
    private MacroRef macroRef;

    @JsonProperty("section")
    public MacroRef getSection() { return section; }
    @JsonProperty("section")
    public void setSection(MacroRef value) { this.section = value; }

    @JsonProperty("start_bar")
    public StartBar getStartBar() { return startBar; }
    @JsonProperty("start_bar")
    public void setStartBar(StartBar value) { this.startBar = value; }

    @JsonProperty("repeat")
    public Repeat getRepeat() { return repeat; }
    @JsonProperty("repeat")
    public void setRepeat(Repeat value) { this.repeat = value; }

    @JsonProperty("scene_ref")
    public MacroRef getSceneRef() { return sceneRef; }
    @JsonProperty("scene_ref")
    public void setSceneRef(MacroRef value) { this.sceneRef = value; }

    @JsonProperty("macro_ref")
    public MacroRef getMacroRef() { return macroRef; }
    @JsonProperty("macro_ref")
    public void setMacroRef(MacroRef value) { this.macroRef = value; }
}
