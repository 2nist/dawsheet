package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CcSetProperties {
    private Channel cc;
    private Channel value;
    private Channel channel;

    @JsonProperty("cc")
    public Channel getCc() { return cc; }
    @JsonProperty("cc")
    public void setCc(Channel value) { this.cc = value; }

    @JsonProperty("value")
    public Channel getValue() { return value; }
    @JsonProperty("value")
    public void setValue(Channel value) { this.value = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
