package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class DeviceParamSetProperties {
    private AmountClass targetID;
    private AmountClass param;
    private AmountClass value;

    @JsonProperty("targetId")
    public AmountClass getTargetID() { return targetID; }
    @JsonProperty("targetId")
    public void setTargetID(AmountClass value) { this.targetID = value; }

    @JsonProperty("param")
    public AmountClass getParam() { return param; }
    @JsonProperty("param")
    public void setParam(AmountClass value) { this.param = value; }

    @JsonProperty("value")
    public AmountClass getValue() { return value; }
    @JsonProperty("value")
    public void setValue(AmountClass value) { this.value = value; }
}
