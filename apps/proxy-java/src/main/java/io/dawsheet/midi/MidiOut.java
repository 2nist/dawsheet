package io.dawsheet.midi;

import javax.sound.midi.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class MidiOut implements AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(MidiOut.class);

    private Synthesizer synth;
    private MidiDevice device;
    private Receiver receiver;
    private static final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public MidiOut(String preferredDeviceName) throws Exception {
        MidiDevice.Info[] infos = MidiSystem.getMidiDeviceInfo();
        MidiDevice chosen = null;

        if (preferredDeviceName != null && !preferredDeviceName.isBlank()) {
            for (MidiDevice.Info info : infos) {
                try {
                    MidiDevice dev = MidiSystem.getMidiDevice(info);
                    // We need a device with a Receiver (output)
                    if (dev.getMaxReceivers() != 0 && info.getName().toLowerCase().contains(preferredDeviceName.toLowerCase())) {
                        chosen = dev; break;
                    }
                } catch (Exception ignored) {}
            }
        }

        if (chosen == null) {
            // fallback to default synthesizer
            synth = MidiSystem.getSynthesizer();
            synth.open();
            receiver = synth.getReceiver();
            log.info("Using default Java Synthesizer for MIDI output.");
        } else {
            device = chosen;
            device.open();
            receiver = device.getReceiver();
            log.info("Using MIDI device: {}", device.getDeviceInfo().getName());
        }
    }

    public void noteOn(int channel1Based, int note, int velocity, double durationSec) {
        try {
            int ch = Math.max(1, Math.min(16, channel1Based)) - 1;
            ShortMessage on = new ShortMessage();
            on.setMessage(ShortMessage.NOTE_ON, ch, clamp(note, 0, 127), clamp(velocity, 0, 127));
            receiver.send(on, -1);

            // Schedule NOTE_OFF using a shared ScheduledExecutorService
            int offNote = clamp(note, 0, 127);
            int offCh = ch;
            long delayMs = Math.max(0L, (long)(durationSec * 1000));
            scheduler.schedule(() -> {
                try {
                    ShortMessage off = new ShortMessage();
                    off.setMessage(ShortMessage.NOTE_OFF, offCh, offNote, 0);
                    receiver.send(off, -1);
                } catch (Exception ignored) {}
            }, delayMs, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            log.error("Failed to send NOTE_ON: {}", ex.toString());
        }
    }

    private static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    @Override
    public void close() {
        try { if (receiver != null) receiver.close(); } catch (Exception ignored) {}
        try { if (device != null && device.isOpen()) device.close(); } catch (Exception ignored) {}
        try { if (synth != null && synth.isOpen()) synth.close(); } catch (Exception ignored) {}
        scheduler.shutdown();
    }
}
