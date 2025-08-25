package io.dawsheet.server;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CommandRouterHappyPathTest {

    @Test
    public void testNotePlayWithTransformsAck() throws Exception {
        CommandEnvelope env = new CommandEnvelope();
        env.v = 1;
        env.type = "NOTE.PLAY";
        env.id = "note-1";
        env.origin = "test";
        env.at = "now";
        env.target = "default";
        env.payload = new java.util.HashMap<>();
        env.payload.put("note", "C4");
        env.payload.put("velocity", 90);
        env.payload.put("durationSec", 0.1);
        env.payload.put("channel", 1);
        env.transform = java.util.List.of(
                java.util.Map.of("op","transpose","semitones", 12),
                java.util.Map.of("op","quantize","grid","1/16"),
                java.util.Map.of("op","humanize","ms", 5)
        );

        RecordingStatusPublisher rec = new RecordingStatusPublisher();
        CommandRouter router = new CommandRouter("commands.schema.json", rec);
        router.handle(env);

        assertEquals(1, rec.count);
        assertTrue(rec.lastOk, "Expected ACK for valid NOTE.PLAY");
        assertNotNull(rec.lastEffectiveAt);
    }

    @Test
    public void testCcSetAck() throws Exception {
        CommandEnvelope env = new CommandEnvelope();
        env.v = 1;
        env.type = "CC.SET";
        env.id = "cc-1";
        env.origin = "test";
        env.at = "now";
        env.target = "default";
        env.payload = java.util.Map.of("cc", 1, "value", 64, "channel", 1);

        RecordingStatusPublisher rec = new RecordingStatusPublisher();
        CommandRouter router = new CommandRouter("commands.schema.json", rec);
        router.handle(env);

        assertEquals(1, rec.count);
        assertTrue(rec.lastOk, "Expected ACK for valid CC.SET");
    }

    @Test
    public void testChordPlayAck() throws Exception {
        CommandEnvelope env = new CommandEnvelope();
        env.v = 1;
        env.type = "CHORD.PLAY";
        env.id = "chord-1";
        env.origin = "test";
        env.at = "now";
        env.target = "default";
        env.payload = new java.util.HashMap<>();
        env.payload.put("root", "C4");
        env.payload.put("quality", "maj7");
        env.payload.put("channel", 1);
        env.payload.put("velocity", 100);
        env.payload.put("durationSec", 0.1);

        RecordingStatusPublisher rec = new RecordingStatusPublisher();
        CommandRouter router = new CommandRouter("commands.schema.json", rec);
        router.handle(env);

        assertEquals(1, rec.count);
        assertTrue(rec.lastOk, "Expected ACK for valid CHORD.PLAY");
    }
}
