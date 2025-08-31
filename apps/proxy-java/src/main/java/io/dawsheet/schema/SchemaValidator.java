package io.dawsheet.schema;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.regex.Pattern;

/**
 * Lightweight validator for DAWSheet command envelopes using Gson.
 * Notes:
 * - This is a pragmatic subset of the full JSON Schema validation, focused on core required fields and NOTE.PLAY.
 * - It throws IllegalArgumentException on validation failures.
 */
public final class SchemaValidator {
    private static final Pattern AT_BAR_BEAT = Pattern.compile("^\\d+:\\d+(?::\\d+)?$");
    private static final Pattern AT_ISO = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*$");

    private SchemaValidator() {}

    public static void validate(String json) {
        JsonObject obj;
        try {
            obj = JsonParser.parseString(json).getAsJsonObject();
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JSON: " + e.getMessage(), e);
        }
        // Required top-level fields
        int v = getInt(obj, "v", Integer.MIN_VALUE);
        if (v != 1) throw new IllegalArgumentException("'v' must be 1");
        String type = getString(obj, "type");
        if (type.isEmpty()) throw new IllegalArgumentException("'type' is required");
        String id = getString(obj, "id");
        if (id.isEmpty()) throw new IllegalArgumentException("'id' is required");
        String origin = getString(obj, "origin");
        if (origin.isEmpty()) throw new IllegalArgumentException("'origin' is required");
        String at = getString(obj, "at");
        if (at.isEmpty()) throw new IllegalArgumentException("'at' is required");
        if (!("now".equals(at) || AT_BAR_BEAT.matcher(at).matches() || AT_ISO.matcher(at).matches())) {
            throw new IllegalArgumentException("'at' must be 'now', bar:beat[:ticks], or ISO-8601 datetime");
        }
        String target = getString(obj, "target");
        if (target.isEmpty()) throw new IllegalArgumentException("'target' is required");
        JsonObject payload = getObject(obj, "payload");

        // Type-specific payload checks (NOTE.PLAY)
        if ("NOTE.PLAY".equals(type)) {
            validateNotePlayPayload(payload);
        }
        // Future: add more type-specific validations as needed.
    }

    private static void validateNotePlayPayload(JsonObject p) {
        // note: string or integer 0..127
        JsonElement noteEl = p.get("note");
        if (noteEl == null) throw new IllegalArgumentException("payload.note is required");
        if (noteEl.isJsonPrimitive() && noteEl.getAsJsonPrimitive().isNumber()) {
            int n = noteEl.getAsInt();
            if (n < 0 || n > 127) throw new IllegalArgumentException("payload.note int must be 0..127");
        } else if (!(noteEl.isJsonPrimitive() && noteEl.getAsJsonPrimitive().isString())) {
            throw new IllegalArgumentException("payload.note must be string or integer");
        }
        int velocity = getInt(p, "velocity", -1);
        if (velocity < 1 || velocity > 127) throw new IllegalArgumentException("payload.velocity must be 1..127");
        double durationSec = getDouble(p, "durationSec", -1);
        if (durationSec < 0) throw new IllegalArgumentException("payload.durationSec must be >= 0");
        int channel = getInt(p, "channel", -1);
        if (channel < 1 || channel > 16) throw new IllegalArgumentException("payload.channel must be 1..16");
    }

    private static String getString(JsonObject o, String key) {
        JsonElement e = o.get(key);
        return (e != null && e.isJsonPrimitive() && e.getAsJsonPrimitive().isString()) ? e.getAsString() : "";
    }
    private static int getInt(JsonObject o, String key, int def) {
        JsonElement e = o.get(key);
        return (e != null && e.isJsonPrimitive() && e.getAsJsonPrimitive().isNumber()) ? e.getAsInt() : def;
    }
    private static double getDouble(JsonObject o, String key, double def) {
        JsonElement e = o.get(key);
        return (e != null && e.isJsonPrimitive() && e.getAsJsonPrimitive().isNumber()) ? e.getAsDouble() : def;
    }
    private static JsonObject getObject(JsonObject o, String key) {
        JsonElement e = o.get(key);
        if (e == null || !e.isJsonObject()) throw new IllegalArgumentException("'" + key + "' must be an object");
        return e.getAsJsonObject();
    }
}
