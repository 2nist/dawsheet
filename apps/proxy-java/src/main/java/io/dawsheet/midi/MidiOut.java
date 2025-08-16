package io.dawsheet.midi;

import io.dawsheet.parser.NoteParser;
import io.dawsheet.schema.NoteCommand;

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
