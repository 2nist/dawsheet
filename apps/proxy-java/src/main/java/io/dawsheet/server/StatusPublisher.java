package io.dawsheet.server;

import com.google.gson.Gson;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.PubsubMessage;
import io.dawsheet.schema.AckStatus;

import java.time.Instant;

public interface StatusPublisher {
    void publish(boolean ok, String origin, String target, Instant effectiveAt, String code, String error);

    static StatusPublisher noop() {
        return (ok, origin, target, effectiveAt, code, error) -> {};
    }
}
