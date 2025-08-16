package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TransformElement {
    private String op;
    private long semitones;

    @JsonProperty("op")
    public String getOp() { return op; }
    @JsonProperty("op")
    public void setOp(String value) { this.op = value; }

    @JsonProperty("semitones")
    public long getSemitones() { return semitones; }
    @JsonProperty("semitones")
    public void setSemitones(long value) { this.semitones = value; }
}
