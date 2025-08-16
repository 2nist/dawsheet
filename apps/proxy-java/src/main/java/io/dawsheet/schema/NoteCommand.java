package io.dawsheet.schema;

/**
 * Represents a NOTE command received from Pub/Sub.
 * This is a simple Plain Old Java Object (POJO) for Gson to parse into.
 */
public class NoteCommand {
    public String type;
    public String songId;
    public int channel;
    public String note;
    public int velocity;
    public double durationSec;
    public String origin;
}
