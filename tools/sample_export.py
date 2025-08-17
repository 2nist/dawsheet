"""
Sample MIDI + metadata exporter for DAWSheet integration testing.
Generates two simple MIDI files and a metadata.json describing tracks and sections.

Usage:
  python tools/sample_export.py --outdir ./export

Requires: mido

"""
import json
import os
from mido import Message, MidiFile, MidiTrack, bpm2tempo
import argparse

SAMPLE_TEMPO = 120

def make_midi_notes(notes, filename, tempo=SAMPLE_TEMPO, channel=0):
    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)
    # set tempo
    track.append(Message('program_change', program=0, time=0, channel=channel))
    # Add a simple note sequence
    ticks_per_beat = mid.ticks_per_beat
    microtempo = bpm2tempo(tempo)
    # mido needs tempo meta message; we'll add later if necessary
    # Write note on/off pairs
    for note, dur_beats, vel in notes:
        # note on
        track.append(Message('note_on', note=note, velocity=vel, time=0, channel=channel))
        # note off after dur
        ticks = int(dur_beats * ticks_per_beat)
        track.append(Message('note_off', note=note, velocity=0, time=ticks, channel=channel))
    mid.save(filename)
    print('Wrote', filename)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--outdir', '-o', default='./export')
    args = p.parse_args()
    outdir = os.path.abspath(args.outdir)
    os.makedirs(outdir, exist_ok=True)

    # Track 1: Bass line
    bass_file = os.path.join(outdir, '01_Bass.mid')
    bass_notes = [(36, 1, 100), (36, 1, 100), (38, 1, 100), (36, 1, 100)]
    make_midi_notes(bass_notes, bass_file)

    # Track 2: Lead
    lead_file = os.path.join(outdir, '02_Lead.mid')
    lead_notes = [(60, 0.5, 100), (62, 0.5, 100), (64, 1, 100), (67, 2, 100)]
    make_midi_notes(lead_notes, lead_file)

    metadata = {
        "tempo": SAMPLE_TEMPO,
        "tracks": [
            {"file": os.path.basename(bass_file), "channel": 1, "name": "Bass"},
            {"file": os.path.basename(lead_file), "channel": 1, "name": "Lead"}
        ],
        "sections": [
            {"name": "Intro", "startBar": 1},
            {"name": "Verse", "startBar": 9},
            {"name": "Chorus", "startBar": 17}
        ]
    }
    meta_file = os.path.join(outdir, 'metadata.json')
    with open(meta_file, 'w', encoding='utf8') as f:
        json.dump(metadata, f, indent=2)
    print('Wrote', meta_file)

if __name__ == '__main__':
    main()
