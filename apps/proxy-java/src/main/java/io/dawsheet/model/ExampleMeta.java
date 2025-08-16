package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ExampleMeta {
    private String title;
    private String artist;
    private long bpm;
    private String key;
    private String mode;
    private String timeSignature;
    private String[] tags;

    @JsonProperty("title")
    public String getTitle() { return title; }
    @JsonProperty("title")
    public void setTitle(String value) { this.title = value; }

    @JsonProperty("artist")
    public String getArtist() { return artist; }
    @JsonProperty("artist")
    public void setArtist(String value) { this.artist = value; }

    @JsonProperty("bpm")
    public long getBPM() { return bpm; }
    @JsonProperty("bpm")
    public void setBPM(long value) { this.bpm = value; }

    @JsonProperty("key")
    public String getKey() { return key; }
    @JsonProperty("key")
    public void setKey(String value) { this.key = value; }

    @JsonProperty("mode")
    public String getMode() { return mode; }
    @JsonProperty("mode")
    public void setMode(String value) { this.mode = value; }

    @JsonProperty("timeSignature")
    public String getTimeSignature() { return timeSignature; }
    @JsonProperty("timeSignature")
    public void setTimeSignature(String value) { this.timeSignature = value; }

    @JsonProperty("tags")
    public String[] getTags() { return tags; }
    @JsonProperty("tags")
    public void setTags(String[] value) { this.tags = value; }
}
