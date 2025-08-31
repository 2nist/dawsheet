package io.dawsheet.server;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CommandEnvelopeValidatorTest {

    @Test
    public void testRouterNacksMissingTarget() throws Exception {
        CommandEnvelope env = new CommandEnvelope();
        env.v = 1;
        env.type = "NOTE.PLAY";
        env.id = "t1";
        env.origin = "test";
        env.at = "now";
        env.payload = java.util.Map.of("note","C4","velocity",100,"durationSec",0.5,"channel",1);
        // Missing target

        RecordingStatusPublisher rec = new RecordingStatusPublisher();
        CommandRouter router = new CommandRouter("commands.schema.json", rec);
        router.handle(env);

        assertEquals(1, rec.count, "Expected one status published");
        assertFalse(rec.lastOk, "Expected NACK for missing target");
        assertEquals("missing_required", rec.lastCode);
    }
}
