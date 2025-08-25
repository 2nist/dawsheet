package io.dawsheet.server;

import com.google.gson.Gson;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.PubsubMessage;
import io.dawsheet.schema.AckStatus;

import java.net.InetAddress;
import java.time.Instant;

public class PubSubStatusPublisher implements StatusPublisher {
    private final com.google.cloud.pubsub.v1.Publisher publisher;
    private final Gson gson = new Gson();

    public PubSubStatusPublisher(com.google.cloud.pubsub.v1.Publisher publisher) {
        this.publisher = publisher;
    }

    @Override
    public void publish(boolean ok, String origin, String target, Instant effectiveAt, String code, String error) {
        try {
            AckStatus status = new AckStatus();
            status.type = ok ? "ACK" : "NACK";
            status.origin = origin;
            status.target = target;
            status.receivedAt = Instant.now().toString();
            status.effectiveAt = effectiveAt != null ? effectiveAt.toString() : null;
            status.proxy = "java-rt-bridge@" + InetAddress.getLocalHost().getHostName();
            status.ok = ok;
            status.code = code;
            status.error = error;

            String jsonStatus = gson.toJson(status);
            ByteString data = ByteString.copyFromUtf8(jsonStatus);
            PubsubMessage pubsubMessage = PubsubMessage.newBuilder().setData(data).build();

            publisher.publish(pubsubMessage);
            System.out.println("Published status: " + jsonStatus);
        } catch (Exception e) {
            System.err.println("Failed to publish status: " + e.getMessage());
        }
    }
}
