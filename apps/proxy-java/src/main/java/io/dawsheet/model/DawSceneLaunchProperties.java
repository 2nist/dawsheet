package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class DawSceneLaunchProperties {
    private LengthBeats scene;

    @JsonProperty("scene")
    public LengthBeats getScene() { return scene; }
    @JsonProperty("scene")
    public void setScene(LengthBeats value) { this.scene = value; }
}
