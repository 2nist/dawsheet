package io.dawsheet.proxy;

import javax.sound.midi.*;

public class MidiUtil {
  public static void listOutputs() {
    try {
      MidiDevice.Info[] infos = MidiSystem.getMidiDeviceInfo();
      System.out.println("MIDI Outputs available:");
      for (MidiDevice.Info info : infos) {
        MidiDevice dev = MidiSystem.getMidiDevice(info);
        if (dev.getMaxReceivers() > 0) {
          System.out.println(" - " + info.getName() + " :: " + info.getDescription());
        }
      }
    } catch (Exception e) {
      System.err.println("Failed to list MIDI devices: " + e);
    }
  }

  public static Receiver openBySubstring(String want) throws Exception {
    MidiDevice.Info[] infos = MidiSystem.getMidiDeviceInfo();
    for (MidiDevice.Info info : infos) {
      MidiDevice dev = MidiSystem.getMidiDevice(info);
      if (dev.getMaxReceivers() > 0 &&
          info.getName().toLowerCase().contains(want.toLowerCase())) {
        dev.open(); return dev.getReceiver();
      }
    }
    return null;
  }
}
