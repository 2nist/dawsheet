package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ExamplePayload {
    private String note;
    private long velocity;
    private double durationSEC;
    private long channel;

    @JsonProperty("note")
    public String getNote() { return note; }
    @JsonProperty("note")
    public void setNote(String value) { this.note = value; }

    @JsonProperty("velocity")
    public long getVelocity() { return velocity; }
    @JsonProperty("velocity")
    public void setVelocity(long value) { this.velocity = value; }

    @JsonProperty("durationSec")
    public double getDurationSEC() { return durationSEC; }
    @JsonProperty("durationSec")
    public void setDurationSEC(double value) { this.durationSEC = value; }

    @JsonProperty("channel")
    public long getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(long value) { this.channel = value; }
}
