package io.dawsheet.midi;
import javax.sound.midi.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.*;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class MidiOut implements AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(MidiOut.class);

    private static Synthesizer synth;
    private static MidiDevice device;
    private static Receiver receiver;
    private static final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "midi-scheduler");
        t.setDaemon(true);
        return t;
    });

    public MidiOut(String preferredDeviceName) throws Exception {
        chooseReceiver(preferredDeviceName);
    }

    public void noteOn(int channel1Based, int note, int velocity, double durationSec) {
        try {
            ensureReceiver();
            int ch = Math.max(1, Math.min(16, channel1Based)) - 1;
            ShortMessage on = new ShortMessage();
            on.setMessage(ShortMessage.NOTE_ON, ch, clamp(note, 0, 127), clamp(velocity, 0, 127));
            receiver.send(on, -1);

            // Schedule NOTE_OFF using a scheduler
            int offNote = clamp(note, 0, 127);
            int offCh = ch;
            long sleep = Math.max(0L, (long)(durationSec * 1000));
            scheduler.schedule(() -> {
                try {
                    ShortMessage off = new ShortMessage();
                    off.setMessage(ShortMessage.NOTE_OFF, offCh, offNote, 0);
                    receiver.send(off, -1);
                } catch (Exception ignored) {}
            }, sleep, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            log.error("Failed to send NOTE_ON: {}", ex.toString());
        }
    }

    // Static helpers used by CommandRouter
    public static void playRaw(Map<String, Object> payload) {
        try { ensureReceiver(); } catch (Exception e) { System.out.println("MIDI not available: " + e.getMessage()); return; }
        String noteStr = String.valueOf(payload.get("note"));
        int midiNumber;
        try {
            if (payload.get("note") instanceof Number) {
                midiNumber = Math.max(0, Math.min(127, ((Number) payload.get("note")).intValue()));
            } else {
                midiNumber = noteNameToMidi(noteStr);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid note value: " + noteStr);
        }
        int velocity = clampInt(payload.get("velocity"), 1, 127, 100);
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        double duration = clampDouble(payload.get("durationSec"), 0, 60, 0.5);

        try {
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
        try { ensureReceiver(); } catch (Exception e) { System.out.println("MIDI not available: " + e.getMessage()); return; }
        int cc = clampInt(payload.get("cc"), 0, 127, 0);
        int value = clampInt(payload.get("value"), 0, 127, 0);
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        try {
            ShortMessage msg = new ShortMessage();
            msg.setMessage(ShortMessage.CONTROL_CHANGE, channel, cc, value);
            receiver.send(msg, -1);
        } catch (InvalidMidiDataException e) {
            throw new RuntimeException("MIDI CC error: " + e.getMessage(), e);
        }
    }

    public static void ccRamp(Map<String, Object> payload) {
        try { ensureReceiver(); } catch (Exception e) { System.out.println("MIDI not available: " + e.getMessage()); return; }
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
                    ShortMessage msg = new ShortMessage();
                    msg.setMessage(ShortMessage.CONTROL_CHANGE, channel, cc, finalVal);
                    receiver.send(msg, -1);
                } catch (InvalidMidiDataException ignored) {}
            }, delay, TimeUnit.MILLISECONDS);
        }
    }

    public static void programChange(Map<String, Object> payload) {
        try { ensureReceiver(); } catch (Exception e) { System.out.println("MIDI not available: " + e.getMessage()); return; }
        int program = clampInt(payload.get("program"), 0, 127, 0);
        Integer bankMsb = payload.get("bankMsb") instanceof Number ? ((Number) payload.get("bankMsb")).intValue() : null;
        Integer bankLsb = payload.get("bankLsb") instanceof Number ? ((Number) payload.get("bankLsb")).intValue() : null;
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        try {
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
        try { ensureReceiver(); } catch (Exception e) { System.out.println("MIDI not available: " + e.getMessage()); return; }
        String root = String.valueOf(payload.get("root"));
        String quality = String.valueOf(payload.getOrDefault("quality", "maj"));
        int channel = clampInt(payload.get("channel"), 1, 16, 1) - 1;
        int velocity = clampInt(payload.getOrDefault("velocity", 100), 1, 127, 100);
        double duration = clampDouble(payload.getOrDefault("durationSec", 0.5), 0, 60, 0.5);

        int rootMidi = noteNameToMidi(root);
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

    private static synchronized void ensureReceiver() throws MidiUnavailableException {
        if (receiver != null) return;
        chooseReceiver(null);
    }

    private static synchronized void chooseReceiver(String preferredDeviceName) throws MidiUnavailableException {
        MidiDevice.Info[] infos = MidiSystem.getMidiDeviceInfo();
        MidiDevice chosen = null;
        if (preferredDeviceName != null && !preferredDeviceName.isBlank()) {
            for (MidiDevice.Info info : infos) {
                try {
                    MidiDevice dev = MidiSystem.getMidiDevice(info);
                    if (dev.getMaxReceivers() != 0 && info.getName().toLowerCase().contains(preferredDeviceName.toLowerCase())) {
                        chosen = dev; break;
                    }
                } catch (Exception ignored) {}
            }
        }
        if (chosen == null) {
            try {
                synth = MidiSystem.getSynthesizer();
                synth.open();
                receiver = synth.getReceiver();
                log.info("Using default Java Synthesizer for MIDI output.");
            } catch (MidiUnavailableException e) {
                log.warn("Synthesizer unavailable: {}", e.toString());
                throw e;
            }
        } else {
            device = chosen;
            device.open();
            receiver = device.getReceiver();
            log.info("Using MIDI device: {}", device.getDeviceInfo().getName());
        }
    }
    private static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static int clampInt(Object v, int min, int max, int def) {
        int x = (v instanceof Number) ? ((Number) v).intValue() : def;
        return clamp(x, min, max);
    }

    private static double clampDouble(Object v, double min, double max, double def) {
        double x = (v instanceof Number) ? ((Number) v).doubleValue() : def;
        if (x < min) x = min; if (x > max) x = max; return x;
    }

    private static int[] chordIntervals(String quality) {
        String q = quality == null ? "maj" : quality.toLowerCase();
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

    private static int noteNameToMidi(String s) {
        if (s == null || s.isEmpty()) throw new IllegalArgumentException("Empty note");
        String str = s.trim();
        String notePart;
        String octPart;
        if (str.length() >= 2 && (str.charAt(1) == '#' || str.charAt(1) == 'b')) {
            notePart = str.substring(0, 2).toUpperCase();
            octPart = str.substring(2);
        } else {
            notePart = str.substring(0, 1).toUpperCase();
            octPart = str.substring(1);
        }
        int octave = Integer.parseInt(octPart);
        int base;
        switch (notePart) {
            case "C": base = 0; break;
            case "C#":
            case "DB": base = 1; break;
            case "D": base = 2; break;
            case "D#":
            case "EB": base = 3; break;
            case "E": base = 4; break;
            case "F": base = 5; break;
            case "F#":
            case "GB": base = 6; break;
            case "G": base = 7; break;
            case "G#":
            case "AB": base = 8; break;
            case "A": base = 9; break;
            case "A#":
            case "BB": base = 10; break;
            case "B": base = 11; break;
            default: throw new IllegalArgumentException("Invalid note: " + s);
        }
        int midi = (octave + 1) * 12 + base;
        if (midi < 0 || midi > 127) throw new IllegalArgumentException("MIDI out of range: " + midi);
        return midi;
    }

    @Override
    public void close() {
    try { if (receiver != null) receiver.close(); } catch (Exception ignored) {}
    try { if (device != null && device.isOpen()) device.close(); } catch (Exception ignored) {}
    try { if (synth != null && synth.isOpen()) synth.close(); } catch (Exception ignored) {}
    try { scheduler.shutdown(); } catch (Exception ignored) {}
    }
}
