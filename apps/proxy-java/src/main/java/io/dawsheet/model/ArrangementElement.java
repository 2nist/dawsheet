package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ArrangementElement {
    private long arrangementIndex;
    private String sectionID;
    private long startBar;
    private Long repeat;

    @JsonProperty("arrangementIndex")
    public long getArrangementIndex() { return arrangementIndex; }
    @JsonProperty("arrangementIndex")
    public void setArrangementIndex(long value) { this.arrangementIndex = value; }

    @JsonProperty("sectionId")
    public String getSectionID() { return sectionID; }
    @JsonProperty("sectionId")
    public void setSectionID(String value) { this.sectionID = value; }

    @JsonProperty("startBar")
    public long getStartBar() { return startBar; }
    @JsonProperty("startBar")
    public void setStartBar(long value) { this.startBar = value; }

    @JsonProperty("repeat")
    public Long getRepeat() { return repeat; }
    @JsonProperty("repeat")
    public void setRepeat(Long value) { this.repeat = value; }
}
