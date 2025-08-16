package io.dawsheet.schema;

/**
 * Represents an ACK status message to be sent back to Pub/Sub.
 * This is a simple Plain Old Java Object (POJO) for Gson to serialize.
 */
public class AckStatus {
    public String type;
    public String origin;
    public String receivedAt;
    public String proxy;
    public boolean ok;
    public String error;
}
