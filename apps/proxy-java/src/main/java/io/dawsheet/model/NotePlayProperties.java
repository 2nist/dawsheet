package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class NotePlayProperties {
    private Note note;
    private Channel velocity;
    private LengthBeats durationSEC;
    private Channel channel;

    @JsonProperty("note")
    public Note getNote() { return note; }
    @JsonProperty("note")
    public void setNote(Note value) { this.note = value; }

    @JsonProperty("velocity")
    public Channel getVelocity() { return velocity; }
    @JsonProperty("velocity")
    public void setVelocity(Channel value) { this.velocity = value; }

    @JsonProperty("durationSec")
    public LengthBeats getDurationSEC() { return durationSEC; }
    @JsonProperty("durationSec")
    public void setDurationSEC(LengthBeats value) { this.durationSEC = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
