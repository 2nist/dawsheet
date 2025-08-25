package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CcRampProperties {
    private Channel cc;
    private Channel from;
    private Channel to;
    private LengthBeats timeMS;
    private Channel channel;

    @JsonProperty("cc")
    public Channel getCc() { return cc; }
    @JsonProperty("cc")
    public void setCc(Channel value) { this.cc = value; }

    @JsonProperty("from")
    public Channel getFrom() { return from; }
    @JsonProperty("from")
    public void setFrom(Channel value) { this.from = value; }

    @JsonProperty("to")
    public Channel getTo() { return to; }
    @JsonProperty("to")
    public void setTo(Channel value) { this.to = value; }

    @JsonProperty("timeMs")
    public LengthBeats getTimeMS() { return timeMS; }
    @JsonProperty("timeMs")
    public void setTimeMS(LengthBeats value) { this.timeMS = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
