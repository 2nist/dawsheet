package io.dawsheet.server;

import io.dawsheet.parser.NoteParser;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class TransformEngine {
    private static final SecureRandom rnd = new SecureRandom();

    public static class Result {
        public final Map<String, Object> payload;
        public final long delayMs;
        public final Instant effectiveAt;

        public Result(Map<String, Object> payload, long delayMs, Instant effectiveAt) {
            this.payload = payload;
            this.delayMs = delayMs;
            this.effectiveAt = effectiveAt;
        }
    }

    public Result apply(String idSeed, String at, List<Map<String, Object>> transforms, Map<String, Object> payload, String quantizeSetting) {
        long delayMs = 0;
        if (transforms != null) {
        int idx = 0;
        for (Map<String, Object> t : transforms) {
                Object opObj = t.get("op");
                if (!(opObj instanceof String)) continue;
                String op = ((String) opObj).toLowerCase(Locale.ROOT);
                switch (op) {
                    case "transpose":
                        applyTranspose(t, payload);
                        break;
                    case "quantize":
                        delayMs = applyQuantize(delayMs, t, quantizeSetting);
                        break;
                    case "humanize":
            delayMs = applyHumanize(delayMs, t, idSeed, idx);
                        break;
                    case "limit":
                        applyLimit(t, payload);
                        break;
                    case "curve":
                        applyCurve(t, payload);
                        break;
                    default:
                        // ignore others in v1
                        break;
                }
        idx++;
            }
        }
        Instant effectiveAt = Instant.now().plusMillis(delayMs);
        return new Result(payload, delayMs, effectiveAt);
    }

    private void applyTranspose(Map<String, Object> t, Map<String, Object> payload) {
        Object semitonesObj = t.get("semitones");
        if (!(semitonesObj instanceof Number)) return;
        int semitones = ((Number) semitonesObj).intValue();
        Object note = payload.get("note");
        if (note == null) return;
        int midi;
        if (note instanceof Number) {
            midi = ((Number) note).intValue();
        } else if (note instanceof String) {
            midi = NoteParser.noteToMidi((String) note);
        } else {
            return;
        }
        int out = Math.max(0, Math.min(127, midi + semitones));
        payload.put("note", out);
    }

    private long applyQuantize(long currentDelayMs, Map<String, Object> t, String quantizeSetting) {
        String grid = quantizeSetting;
        Object gridObj = t.get("grid");
        if (gridObj instanceof String) grid = (String) gridObj;
        if (grid == null || grid.equals("off")) return currentDelayMs;
        double bpm = 120.0; // default tempo; can be overridden by env
        try {
            String env = System.getenv("PROXY_TEMPO_BPM");
            if (env != null) bpm = Double.parseDouble(env);
        } catch (Exception ignored) {}
        double beatMs = 60000.0 / bpm;
        double gridMs;
        switch (grid) {
            case "1/4": gridMs = beatMs; break;
            case "1/8": gridMs = beatMs / 2.0; break;
            case "1/8T": gridMs = beatMs / 3.0; break;
            case "1/16": gridMs = beatMs / 4.0; break;
            case "bar": gridMs = beatMs * 4.0; break; // assume 4/4
            default:
                gridMs = beatMs / 4.0;
        }
        long q = Math.round(currentDelayMs / gridMs) * (long) gridMs;
        return Math.max(0, q);
    }

    private long applyHumanize(long currentDelayMs, Map<String, Object> t, String seed, int index) {
        Object msObj = t.get("ms");
        int range = (msObj instanceof Number) ? Math.max(0, ((Number) msObj).intValue()) : 0;
        int jitter = 0;
        if (range > 0) {
            // deterministic pseudo-random based on seed and index
            int h = 0;
            String s = String.valueOf(seed) + ":" + index;
            for (int i = 0; i < s.length(); i++) {
                h = 31 * h + s.charAt(i);
            }
            // map hash to [-range, +range]
            int span = range * 2 + 1;
            int mod = Math.floorMod(h, span);
            jitter = mod - range;
        }
        long out = currentDelayMs + jitter;
        return Math.max(0, out);
    }

    private void applyLimit(Map<String, Object> t, Map<String, Object> payload) {
        int min = getInt(t.get("min"), 0);
        int max = getInt(t.get("max"), 127);
        if (min > max) { int tmp = min; min = max; max = tmp; }
        // Common fields to clamp: velocity, value
        if (payload.containsKey("velocity")) {
            int v = getInt(payload.get("velocity"), 100);
            payload.put("velocity", clamp(v, min, max));
        }
        if (payload.containsKey("value")) {
            int v = getInt(payload.get("value"), 0);
            payload.put("value", clamp(v, min, max));
        }
    }

    private void applyCurve(Map<String, Object> t, Map<String, Object> payload) {
        String shape = String.valueOf(t.getOrDefault("shape", "exp"));
        double amount = getDouble(t.get("amount"), 0.5);
        amount = Math.max(0.0, Math.min(1.0, amount));

        if (payload.containsKey("velocity")) {
            int v = getInt(payload.get("velocity"), 100);
            payload.put("velocity", applyCurveToValue(v, shape, amount));
        }
        if (payload.containsKey("value")) {
            int v = getInt(payload.get("value"), 0);
            payload.put("value", applyCurveToValue(v, shape, amount));
        }
    }

    private int applyCurveToValue(int v, String shape, double amount) {
        double x = Math.max(0, Math.min(127, v)) / 127.0;
        double y;
        switch (shape) {
            case "exp":
                y = Math.pow(x, 1.0 + 4.0 * amount);
                break;
            case "log":
                y = Math.log1p((Math.E - 1) * x) / Math.log(Math.E);
                // mix towards linear based on amount
                y = (1 - amount) * x + amount * y;
                break;
            case "sine":
                y = (1 - amount) * x + amount * Math.sin(x * Math.PI / 2.0);
                break;
            default:
                y = x;
        }
        int out = (int) Math.round(y * 127.0);
        if (out < 0) out = 0; if (out > 127) out = 127; return out;
    }

    private int getInt(Object o, int def) {
        return (o instanceof Number) ? ((Number) o).intValue() : def;
    }
    private double getDouble(Object o, double def) {
        return (o instanceof Number) ? ((Number) o).doubleValue() : def;
    }
    private int clamp(int x, int min, int max) {
        if (x < min) return min; if (x > max) return max; return x;
    }
}
