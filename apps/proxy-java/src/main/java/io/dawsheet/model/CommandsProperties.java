package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class CommandsProperties {
    private V v;
    private OpClass type;
    private ID id;
    private Origin origin;
    private At at;
    private Quantize quantize;
    private ID target;
    private AmountClass payload;
    private PropertiesTransform transform;
    private PropertiesMeta meta;

    @JsonProperty("v")
    public V getV() { return v; }
    @JsonProperty("v")
    public void setV(V value) { this.v = value; }

    @JsonProperty("type")
    public OpClass getType() { return type; }
    @JsonProperty("type")
    public void setType(OpClass value) { this.type = value; }

    @JsonProperty("id")
    public ID getID() { return id; }
    @JsonProperty("id")
    public void setID(ID value) { this.id = value; }

    @JsonProperty("origin")
    public Origin getOrigin() { return origin; }
    @JsonProperty("origin")
    public void setOrigin(Origin value) { this.origin = value; }

    @JsonProperty("at")
    public At getAt() { return at; }
    @JsonProperty("at")
    public void setAt(At value) { this.at = value; }

    @JsonProperty("quantize")
    public Quantize getQuantize() { return quantize; }
    @JsonProperty("quantize")
    public void setQuantize(Quantize value) { this.quantize = value; }

    @JsonProperty("target")
    public ID getTarget() { return target; }
    @JsonProperty("target")
    public void setTarget(ID value) { this.target = value; }

    @JsonProperty("payload")
    public AmountClass getPayload() { return payload; }
    @JsonProperty("payload")
    public void setPayload(AmountClass value) { this.payload = value; }

    @JsonProperty("transform")
    public PropertiesTransform getTransform() { return transform; }
    @JsonProperty("transform")
    public void setTransform(PropertiesTransform value) { this.transform = value; }

    @JsonProperty("meta")
    public PropertiesMeta getMeta() { return meta; }
    @JsonProperty("meta")
    public void setMeta(PropertiesMeta value) { this.meta = value; }
}
