package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class V {
    private long vConst;

    @JsonProperty("const")
    public long getVConst() { return vConst; }
    @JsonProperty("const")
    public void setVConst(long value) { this.vConst = value; }
}
