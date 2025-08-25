package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ProgramChangeProperties {
    private Channel program;
    private Channel bankMSB;
    private Channel bankLSB;
    private Channel channel;

    @JsonProperty("program")
    public Channel getProgram() { return program; }
    @JsonProperty("program")
    public void setProgram(Channel value) { this.program = value; }

    @JsonProperty("bankMsb")
    public Channel getBankMSB() { return bankMSB; }
    @JsonProperty("bankMsb")
    public void setBankMSB(Channel value) { this.bankMSB = value; }

    @JsonProperty("bankLsb")
    public Channel getBankLSB() { return bankLSB; }
    @JsonProperty("bankLsb")
    public void setBankLSB(Channel value) { this.bankLSB = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
