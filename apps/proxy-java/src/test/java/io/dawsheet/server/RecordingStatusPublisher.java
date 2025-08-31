package io.dawsheet.server;

import java.time.Instant;

public class RecordingStatusPublisher implements StatusPublisher {
    public int count = 0;
    public boolean lastOk;
    public String lastOrigin;
    public String lastTarget;
    public Instant lastEffectiveAt;
    public String lastCode;
    public String lastError;

    @Override
    public void publish(boolean ok, String origin, String target, Instant effectiveAt, String code, String error) {
        count++;
        lastOk = ok;
        lastOrigin = origin;
        lastTarget = target;
        lastEffectiveAt = effectiveAt;
        lastCode = code;
        lastError = error;
    }
}
