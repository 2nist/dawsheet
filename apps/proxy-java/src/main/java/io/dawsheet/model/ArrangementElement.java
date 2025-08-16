package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ArrangementElement {
    private String section;
    private long startBar;
    private Long repeat;

    @JsonProperty("section")
    public String getSection() { return section; }
    @JsonProperty("section")
    public void setSection(String value) { this.section = value; }

    @JsonProperty("start_bar")
    public long getStartBar() { return startBar; }
    @JsonProperty("start_bar")
    public void setStartBar(long value) { this.startBar = value; }

    @JsonProperty("repeat")
    public Long getRepeat() { return repeat; }
    @JsonProperty("repeat")
    public void setRepeat(Long value) { this.repeat = value; }
}
