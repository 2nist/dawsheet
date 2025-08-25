// Expose Midi constructor on window without exports/require
import { Midi } from '@tonejs/midi';
window.MidiLib = Midi;
