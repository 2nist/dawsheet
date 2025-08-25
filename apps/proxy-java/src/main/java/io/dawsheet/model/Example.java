package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class Example {
    private String name;
    private String tonic;
    private String[] intervals;

    @JsonProperty("name")
    public String getName() { return name; }
    @JsonProperty("name")
    public void setName(String value) { this.name = value; }

    @JsonProperty("tonic")
    public String getTonic() { return tonic; }
    @JsonProperty("tonic")
    public void setTonic(String value) { this.tonic = value; }

    @JsonProperty("intervals")
    public String[] getIntervals() { return intervals; }
    @JsonProperty("intervals")
    public void setIntervals(String[] value) { this.intervals = value; }
}
