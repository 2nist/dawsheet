package io.dawsheet.model;

import com.fasterxml.jackson.annotation.*;

public class SongProperties {
    private V v;
    private PropertiesMeta meta;
    private SectionsClass sections;
    private SectionsClass arrangement;
    private CommandsRef commandsRef;

    @JsonProperty("v")
    public V getV() { return v; }
    @JsonProperty("v")
    public void setV(V value) { this.v = value; }

    @JsonProperty("meta")
    public PropertiesMeta getMeta() { return meta; }
    @JsonProperty("meta")
    public void setMeta(PropertiesMeta value) { this.meta = value; }

    @JsonProperty("sections")
    public SectionsClass getSections() { return sections; }
    @JsonProperty("sections")
    public void setSections(SectionsClass value) { this.sections = value; }

    @JsonProperty("arrangement")
    public SectionsClass getArrangement() { return arrangement; }
    @JsonProperty("arrangement")
    public void setArrangement(SectionsClass value) { this.arrangement = value; }

    @JsonProperty("commands_ref")
    public CommandsRef getCommandsRef() { return commandsRef; }
    @JsonProperty("commands_ref")
    public void setCommandsRef(CommandsRef value) { this.commandsRef = value; }
}
