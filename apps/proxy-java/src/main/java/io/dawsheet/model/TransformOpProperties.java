package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class TransformOpProperties {
    private OpClass op;
    private AmountClass semitones;
    private AmountClass ms;
    private AmountClass vel;
    private AmountClass grid;
    private AmountClass strength;
    private AmountClass min;
    private AmountClass max;
    private OpClass shape;
    private AmountClass amount;
    private AmountClass scale;
    private AmountClass root;

    @JsonProperty("op")
    public OpClass getOp() { return op; }
    @JsonProperty("op")
    public void setOp(OpClass value) { this.op = value; }

    @JsonProperty("semitones")
    public AmountClass getSemitones() { return semitones; }
    @JsonProperty("semitones")
    public void setSemitones(AmountClass value) { this.semitones = value; }

    @JsonProperty("ms")
    public AmountClass getMS() { return ms; }
    @JsonProperty("ms")
    public void setMS(AmountClass value) { this.ms = value; }

    @JsonProperty("vel")
    public AmountClass getVel() { return vel; }
    @JsonProperty("vel")
    public void setVel(AmountClass value) { this.vel = value; }

    @JsonProperty("grid")
    public AmountClass getGrid() { return grid; }
    @JsonProperty("grid")
    public void setGrid(AmountClass value) { this.grid = value; }

    @JsonProperty("strength")
    public AmountClass getStrength() { return strength; }
    @JsonProperty("strength")
    public void setStrength(AmountClass value) { this.strength = value; }

    @JsonProperty("min")
    public AmountClass getMin() { return min; }
    @JsonProperty("min")
    public void setMin(AmountClass value) { this.min = value; }

    @JsonProperty("max")
    public AmountClass getMax() { return max; }
    @JsonProperty("max")
    public void setMax(AmountClass value) { this.max = value; }

    @JsonProperty("shape")
    public OpClass getShape() { return shape; }
    @JsonProperty("shape")
    public void setShape(OpClass value) { this.shape = value; }

    @JsonProperty("amount")
    public AmountClass getAmount() { return amount; }
    @JsonProperty("amount")
    public void setAmount(AmountClass value) { this.amount = value; }

    @JsonProperty("scale")
    public AmountClass getScale() { return scale; }
    @JsonProperty("scale")
    public void setScale(AmountClass value) { this.scale = value; }

    @JsonProperty("root")
    public AmountClass getRoot() { return root; }
    @JsonProperty("root")
    public void setRoot(AmountClass value) { this.root = value; }
}
