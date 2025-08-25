// DAWSheet.js (Logic Scripter)

/**
 * Handles incoming MIDI events on the track where this Scripter instance is placed.
 * Logs ControlChange, NoteOn, and NoteOff events, then sends them on.
 * @param {MIDIEvent} event The incoming MIDI event.
 */
function HandleMIDI(event) {
  // Check if the event is an instance of ControlChange, NoteOn, or NoteOff
  if (event instanceof ControlChange || event instanceof NoteOn || event instanceof NoteOff) {
    // Log the event details to the Scripter console
    Trace("DAWSheet MIDI -> " + event.toString());
  }
  // Send the event onward in the MIDI chain
  event.send();
}

/**
 * Called once when the Scripter plugin is initialized.
 * Logs a message to confirm the script is ready.
 */
function OnInit() {
  Trace("DAWSheet Scripter ready (listening on this track's MIDI input).");
}
