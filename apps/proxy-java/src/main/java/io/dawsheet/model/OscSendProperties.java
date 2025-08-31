package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class OscSendProperties {
    private AmountClass addr;
    private Args args;

    @JsonProperty("addr")
    public AmountClass getAddr() { return addr; }
    @JsonProperty("addr")
    public void setAddr(AmountClass value) { this.addr = value; }

    @JsonProperty("args")
    public Args getArgs() { return args; }
    @JsonProperty("args")
    public void setArgs(Args value) { this.args = value; }
}
