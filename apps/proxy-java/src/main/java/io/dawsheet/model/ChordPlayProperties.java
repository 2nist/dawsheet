package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class ChordPlayProperties {
    private AmountClass root;
    private AmountClass quality;
    private AmountClass voicing;
    private Channel channel;

    @JsonProperty("root")
    public AmountClass getRoot() { return root; }
    @JsonProperty("root")
    public void setRoot(AmountClass value) { this.root = value; }

    @JsonProperty("quality")
    public AmountClass getQuality() { return quality; }
    @JsonProperty("quality")
    public void setQuality(AmountClass value) { this.quality = value; }

    @JsonProperty("voicing")
    public AmountClass getVoicing() { return voicing; }
    @JsonProperty("voicing")
    public void setVoicing(AmountClass value) { this.voicing = value; }

    @JsonProperty("channel")
    public Channel getChannel() { return channel; }
    @JsonProperty("channel")
    public void setChannel(Channel value) { this.channel = value; }
}
