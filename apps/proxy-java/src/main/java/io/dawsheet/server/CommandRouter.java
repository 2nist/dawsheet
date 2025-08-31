package io.dawsheet.server;

import io.dawsheet.midi.MidiOut;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import com.networknt.schema.ValidationMessage;

public class CommandRouter {
    private final CommandEnvelopeValidator validator;
    private final TransformEngine transformEngine = new TransformEngine();
    private final StatusPublisher statusPublisher;

    public CommandRouter(String schemaResourcePath, StatusPublisher statusPublisher) throws Exception {
        this.validator = new CommandEnvelopeValidator(schemaResourcePath);
        this.statusPublisher = statusPublisher;
    }

    public void handle(CommandEnvelope env) {
        // Basic required field checks before schema validation
        if (env == null || env.v != 1 || env.type == null || env.type.isEmpty() ||
                env.id == null || env.id.isEmpty() || env.origin == null || env.origin.isEmpty() ||
                env.at == null || env.at.isEmpty() || env.target == null || env.target.isEmpty() ||
                env.payload == null) {
            publishNack(env != null ? env.origin : null, env != null ? env.target : null, Instant.now(), "missing_required", "Envelope is missing required fields");
            return;
        }

        Set<com.networknt.schema.ValidationMessage> violations;
        try {
            violations = validator.validate(env);
        } catch (Exception e) {
            publishNack(env.origin, env.target, Instant.now(), "validation_error", e.getMessage());
            return;
        }
        if (!violations.isEmpty()) {
            publishNack(env.origin, env.target, Instant.now(), "schema_violation", violations.toString());
            return;
        }

        // Apply transforms (v1: transpose -> quantize -> humanize)
    TransformEngine.Result tr = transformEngine.apply(env.id, env.at, env.transform, new HashMap<>(env.payload), env.quantize);
        Map<String, Object> payload = tr.payload;
        Instant effectiveAt = tr.effectiveAt;

        try {
            switch (env.type) {
                case "NOTE.PLAY":
                    handleNotePlay(payload);
                    break;
                case "CC.SET":
                    handleCcSet(payload);
                    break;
                case "CC.RAMP":
                    handleCcRamp(payload);
                    break;
                case "PROGRAM.CHANGE":
                    handleProgramChange(payload);
                    break;
                case "CHORD.PLAY":
                    handleChordPlay(payload);
                    break;
                case "DAW.CLIP.LAUNCH":
                    handleDawClipLaunch(payload);
                    break;
                case "DAW.SCENE.LAUNCH":
                    handleDawSceneLaunch(payload);
                    break;
                default:
                    publishNack(env.origin, env.target, effectiveAt, "unknown_type", "Unknown command type: " + env.type);
                    return;
            }
            publishAck(env.origin, env.target, effectiveAt);
        } catch (Exception e) {
            publishNack(env.origin, env.target, effectiveAt, "execution_error", e.getMessage());
        }
    }

    private void handleNotePlay(Map<String, Object> payload) {
        MidiOut.playRaw(payload);
    }

    private void handleCcSet(Map<String, Object> payload) {
        MidiOut.ccSet(payload);
    }

    private void handleCcRamp(Map<String, Object> payload) {
        MidiOut.ccRamp(payload);
    }

    private void handleProgramChange(Map<String, Object> payload) {
        MidiOut.programChange(payload);
    }

    private void handleChordPlay(Map<String, Object> payload) {
        MidiOut.playChord(payload);
    }

    private void handleDawClipLaunch(Map<String, Object> payload) {
        // Stub: wire to DAW integration later
        System.out.println("DAW.CLIP.LAUNCH: " + payload);
    }

    private void handleDawSceneLaunch(Map<String, Object> payload) {
        // Stub: wire to DAW integration later
        System.out.println("DAW.SCENE.LAUNCH: " + payload);
    }

    private void publishAck(String origin, String target, Instant effectiveAt) {
        statusPublisher.publish(true, origin, target, effectiveAt, null, null);
    }

    private void publishNack(String origin, String target, Instant effectiveAt, String code, String error) {
        statusPublisher.publish(false, origin, target, effectiveAt, code, error);
    }
}
