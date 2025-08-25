package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class AftertouchProperties {
    private Channel value;
    private Channel channel;

    @JsonProperty("value")
    public Channel getValue() { return value; }
    @JsonProperty("value")
    public void setValue(Channel value) { this.value = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
