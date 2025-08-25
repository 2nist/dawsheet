package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Properties {
    private Name name;
    private Name tonic;
    private Intervals intervals;

    @JsonProperty("name")
    public Name getName() { return name; }
    @JsonProperty("name")
    public void setName(Name value) { this.name = value; }

    @JsonProperty("tonic")
    public Name getTonic() { return tonic; }
    @JsonProperty("tonic")
    public void setTonic(Name value) { this.tonic = value; }

    @JsonProperty("intervals")
    public Intervals getIntervals() { return intervals; }
    @JsonProperty("intervals")
    public void setIntervals(Intervals value) { this.intervals = value; }
}
