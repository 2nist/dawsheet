package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CcLfoProperties {
    private Channel cc;
    private OpClass waveform;
    private LengthBeats rateHz;
    private OpClass sync;
    private Channel depth;
    private Channel center;
    private Channel channel;

    @JsonProperty("cc")
    public Channel getCc() { return cc; }
    @JsonProperty("cc")
    public void setCc(Channel value) { this.cc = value; }

    @JsonProperty("waveform")
    public OpClass getWaveform() { return waveform; }
    @JsonProperty("waveform")
    public void setWaveform(OpClass value) { this.waveform = value; }

    @JsonProperty("rateHz")
    public LengthBeats getRateHz() { return rateHz; }
    @JsonProperty("rateHz")
    public void setRateHz(LengthBeats value) { this.rateHz = value; }

    @JsonProperty("sync")
    public OpClass getSync() { return sync; }
    @JsonProperty("sync")
    public void setSync(OpClass value) { this.sync = value; }

    @JsonProperty("depth")
    public Channel getDepth() { return depth; }
    @JsonProperty("depth")
    public void setDepth(Channel value) { this.depth = value; }

    @JsonProperty("center")
    public Channel getCenter() { return center; }
    @JsonProperty("center")
    public void setCenter(Channel value) { this.center = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
