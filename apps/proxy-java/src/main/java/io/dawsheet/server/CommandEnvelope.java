package io.dawsheet.server;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class CommandEnvelope {
    @JsonProperty("v")
    public int v;
    @JsonProperty("type")
    public String type;
    @JsonProperty("id")
    public String id;
    @JsonProperty("origin")
    public String origin;
    @JsonProperty("at")
    public String at;
    @JsonProperty("quantize")
    public String quantize;
    @JsonProperty("target")
    public String target;
    @JsonProperty("payload")
    public Map<String, Object> payload;
    @JsonProperty("transform")
    public List<Map<String, Object>> transform;
    @JsonProperty("meta")
    public Map<String, Object> meta;
}
