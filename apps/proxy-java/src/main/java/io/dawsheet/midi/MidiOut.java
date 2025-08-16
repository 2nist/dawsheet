package io.dawsheet.midi;

import io.dawsheet.parser.NoteParser;
import io.dawsheet.schema.NoteCommand;
import java.util.Map;
import java.util.ArrayList;
import java.util.List;

import javax.sound.midi.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class MidiOut {

    private static MidiDevice outputDevice;
    private static Receiver receiver;
    private static final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public static void init() throws MidiUnavailableException {
        // For MVP, we'll try to get a default synthesizer.
        // This is more reliable than iterating devices.
        Synthesizer synth = MidiSystem.getSynthesizer();
        if (synth == null) {
            throw new MidiUnavailableException("No default synthesizer available.");
        }
        synth.open();
        receiver = synth.getReceiver();
        System.out.println("MIDI Out initialized on device: " + synth.getDeviceInfo().getName());
        outputDevice = synth; // Keep a reference to close it later
    }

    public static void play(NoteCommand cmd) {
        try {
            if (receiver == null) {
                System.out.println("MIDI receiver not initialized; skipping NOTE.PLAY");
                return;
            }
            int midiNumber = NoteParser.noteToMidi(cmd.note);
            int velocity = Math.max(0, Math.min(127, cmd.velocity));
            int channel = Math.max(0, Math.min(15, cmd.channel - 1));

            ShortMessage noteOn = new ShortMessage();
            noteOn.setMessage(ShortMessage.NOTE_ON, channel, midiNumber, velocity);
            receiver.send(noteOn, -1);
            System.out.printf("NOTE ON: ch=%d, note=%s(%d), vel=%d%n", channel + 1, cmd.note, midiNumber, velocity);

            // Schedule NoteOff
            scheduler.schedule(() -> {
                try {
                    ShortMessage noteOff = new ShortMessage();
                    noteOff.setMessage(ShortMessage.NOTE_OFF, channel, midiNumber, 0);
                    receiver.send(noteOff, -1);
                    System.out.printf("NOTE OFF: ch=%d, note=%s(%d)%n", channel + 1, cmd.note, midiNumber);
                } catch (InvalidMidiDataException e) {
                    System.err.println("Failed to send NOTE_OFF: " + e.getMessage());
                }
            }, (long) (cmd.durationSec * 1000), TimeUnit.MILLISECONDS);

        } catch (InvalidMidiDataException e) {
            System.err.println("Error sending MIDI message: " + e.getMessage());
        }
    }

    // Lightweight handlers used by the router working directly on generic payloads
    public static void playRaw(Map<String, Object> payload) {
        String noteStr = String.valueOf(payload.get("note"));
        int midiNumber;
        try {
            if (payload.get("note") instanceof Number) {
                midiNumber = Math.max(0, Math.min(127, ((Number) payload.get("note")).intValue()));
            } else {
                midiNumber = NoteParser.noteToMidi(noteStr);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid note value: " + noteStr);
        }
        int velocity = clampInt(payload.get("velocity"), 1, 127, 100);
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        double duration = clampDouble(payload.get("durationSec"), 0, 60, 0.5);

        try {
            if (receiver == null) {
                System.out.println("MIDI receiver not initialized; skipping NOTE.PLAY raw");
                return;
            }
            ShortMessage noteOn = new ShortMessage();
            noteOn.setMessage(ShortMessage.NOTE_ON, channel, midiNumber, velocity);
            receiver.send(noteOn, -1);

            scheduler.schedule(() -> {
                try {
                    ShortMessage noteOff = new ShortMessage();
                    noteOff.setMessage(ShortMessage.NOTE_OFF, channel, midiNumber, 0);
                    receiver.send(noteOff, -1);
                } catch (InvalidMidiDataException ignored) {}
            }, (long) (duration * 1000), TimeUnit.MILLISECONDS);
        } catch (InvalidMidiDataException e) {
            throw new RuntimeException("MIDI error: " + e.getMessage(), e);
        }
    }

    public static void ccSet(Map<String, Object> payload) {
        int cc = clampInt(payload.get("cc"), 0, 127, 0);
        int value = clampInt(payload.get("value"), 0, 127, 0);
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        try {
            if (receiver == null) {
                System.out.println("MIDI receiver not initialized; skipping CC.SET");
                return;
            }
            ShortMessage msg = new ShortMessage();
            msg.setMessage(ShortMessage.CONTROL_CHANGE, channel, cc, value);
            receiver.send(msg, -1);
        } catch (InvalidMidiDataException e) {
            throw new RuntimeException("MIDI CC error: " + e.getMessage(), e);
        }
    }

    public static void ccRamp(Map<String, Object> payload) {
        int cc = clampInt(payload.get("cc"), 0, 127, 0);
        int from = clampInt(payload.get("from"), 0, 127, 0);
        int to = clampInt(payload.get("to"), 0, 127, 127);
        long timeMs = (long) clampDouble(payload.get("timeMs"), 0, 60000, 1000);
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        int steps = (int) Math.max(1, timeMs / 10);
        for (int i = 0; i <= steps; i++) {
            int val = from + (to - from) * i / steps;
            int finalVal = val;
            long delay = i * 10L;
            scheduler.schedule(() -> {
                try {
                    if (receiver == null) return;
                    ShortMessage msg = new ShortMessage();
                    msg.setMessage(ShortMessage.CONTROL_CHANGE, channel, cc, finalVal);
                    receiver.send(msg, -1);
                } catch (InvalidMidiDataException ignored) {}
            }, delay, TimeUnit.MILLISECONDS);
        }
    }

    public static void programChange(Map<String, Object> payload) {
        int program = clampInt(payload.get("program"), 0, 127, 0);
        Integer bankMsb = payload.get("bankMsb") instanceof Number ? ((Number) payload.get("bankMsb")).intValue() : null;
        Integer bankLsb = payload.get("bankLsb") instanceof Number ? ((Number) payload.get("bankLsb")).intValue() : null;
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        try {
            if (receiver == null) {
                System.out.println("MIDI receiver not initialized; skipping PROGRAM.CHANGE");
                return;
            }
            if (bankMsb != null) {
                ShortMessage msb = new ShortMessage();
                msb.setMessage(ShortMessage.CONTROL_CHANGE, channel, 0, clamp(bankMsb, 0, 127));
                receiver.send(msb, -1);
            }
            if (bankLsb != null) {
                ShortMessage lsb = new ShortMessage();
                lsb.setMessage(ShortMessage.CONTROL_CHANGE, channel, 32, clamp(bankLsb, 0, 127));
                receiver.send(lsb, -1);
            }
            ShortMessage pc = new ShortMessage();
            pc.setMessage(ShortMessage.PROGRAM_CHANGE, channel, program, 0);
            receiver.send(pc, -1);
        } catch (InvalidMidiDataException e) {
            throw new RuntimeException("MIDI Program Change error: " + e.getMessage(), e);
        }
    }

    public static void playChord(Map<String, Object> payload) {
        if (receiver == null) {
            System.out.println("MIDI receiver not initialized; skipping CHORD.PLAY");
            return;
        }
        String root = String.valueOf(payload.get("root"));
        String quality = String.valueOf(payload.getOrDefault("quality", "maj"));
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        int velocity = clampInt(payload.getOrDefault("velocity", 100), 1, 127, 100);
        double duration = clampDouble(payload.getOrDefault("durationSec", 0.5), 0, 60, 0.5);

        int rootMidi = NoteParser.noteToMidi(root);
        int[] intervals = chordIntervals(quality);
        List<Integer> notes = new ArrayList<>();
        for (int iv : intervals) {
            int n = clamp(rootMidi + iv, 0, 127);
            notes.add(n);
        }
        try {
            for (int n : notes) {
                ShortMessage noteOn = new ShortMessage();
                noteOn.setMessage(ShortMessage.NOTE_ON, channel, n, velocity);
                receiver.send(noteOn, -1);
            }
            scheduler.schedule(() -> {
                try {
                    for (int n : notes) {
                        ShortMessage noteOff = new ShortMessage();
                        noteOff.setMessage(ShortMessage.NOTE_OFF, channel, n, 0);
                        receiver.send(noteOff, -1);
                    }
                } catch (InvalidMidiDataException ignored) {}
            }, (long) (duration * 1000), TimeUnit.MILLISECONDS);
        } catch (InvalidMidiDataException e) {
            throw new RuntimeException("MIDI error CHORD.PLAY: " + e.getMessage(), e);
        }
    }

    private static int[] chordIntervals(String quality) {
        String q = quality.toLowerCase();
        switch (q) {
            case "maj":
            case "major":
                return new int[]{0, 4, 7};
            case "min":
            case "minor":
                return new int[]{0, 3, 7};
            case "dim":
            case "diminished":
                return new int[]{0, 3, 6};
            case "aug":
            case "augmented":
                return new int[]{0, 4, 8};
            case "maj7":
                return new int[]{0, 4, 7, 11};
            case "min7":
                return new int[]{0, 3, 7, 10};
            case "7":
            case "dom7":
                return new int[]{0, 4, 7, 10};
            default:
                return new int[]{0, 4, 7};
        }
    }

    private static int clampInt(Object v, int min, int max, int def) {
        int x = (v instanceof Number) ? ((Number) v).intValue() : def;
        return clamp(x, min, max);
    }

    private static double clampDouble(Object v, double min, double max, double def) {
        double x = (v instanceof Number) ? ((Number) v).doubleValue() : def;
        if (x < min) x = min; if (x > max) x = max; return x;
    }

    private static int clamp(int x, int min, int max) {
        if (x < min) return min; if (x > max) return max; return x;
    }

    public static void close() {
        if (receiver != null) {
            receiver.close();
        }
        if (outputDevice != null && outputDevice.isOpen()) {
            outputDevice.close();
        }
        scheduler.shutdown();
    }
}
