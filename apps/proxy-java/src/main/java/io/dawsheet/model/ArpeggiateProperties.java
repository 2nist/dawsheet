package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ArpeggiateProperties {
    private OpClass style;
    private OpClass rate;
    private Channel gate;
    private LengthBeats lengthBeats;
    private Channel channel;

    @JsonProperty("style")
    public OpClass getStyle() { return style; }
    @JsonProperty("style")
    public void setStyle(OpClass value) { this.style = value; }

    @JsonProperty("rate")
    public OpClass getRate() { return rate; }
    @JsonProperty("rate")
    public void setRate(OpClass value) { this.rate = value; }

    @JsonProperty("gate")
    public Channel getGate() { return gate; }
    @JsonProperty("gate")
    public void setGate(Channel value) { this.gate = value; }

    @JsonProperty("lengthBeats")
    public LengthBeats getLengthBeats() { return lengthBeats; }
    @JsonProperty("lengthBeats")
    public void setLengthBeats(LengthBeats value) { this.lengthBeats = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
