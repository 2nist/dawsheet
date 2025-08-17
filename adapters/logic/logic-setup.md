# Logic Pro Setup Guide for DAWSheet

This guide walks through the one-time setup to connect DAWSheet to Logic Pro via CoreMIDI and prepare Logic for automated import and transport control.

## Prerequisites

- macOS machine with Logic Pro installed
- Audio MIDI Setup (built into macOS)
- DAWSheet MIDI output (CoreMIDI Network Session or virtual MIDI port)
- Accessibility and Automation permissions for `osascript`/terminal

## 1) Configure CoreMIDI Network Session

- Open "Audio MIDI Setup" (Applications → Utilities → Audio MIDI Setup).
- Choose Window → Show MIDI Studio, then double-click the Network icon.
- Under "My Sessions" click the + icon to create a new session.
- Name it: `DAWSheet MIDI`.
- Check "Enabled" and optionally add remote participants if running across machines.

## 2) Configure Logic Pro Input

- Open Logic Pro and create a new project.
- Add a new Software Instrument track.
- In the track inspector, set the input to `DAWSheet MIDI` or the virtual MIDI port you configured.
- If you plan to use multiple tracks, create additional Software Instrument tracks and name them to match your exported MIDI tracks.

## 3) Controller Assignments (Transport / Sections)

- In Logic Pro, go to Logic Pro → Control Surfaces → Controller Assignments...
- Click "Learn Mode" and then click the UI control (e.g., Play or Record).
- Send a MIDI CC from your system (or from the Java proxy test harness) and Logic will map that CC to the control.
- Suggested CC mapping:
  - CC 102 = Play/Stop
  - CC 103 = Record
  - CC 20.. = Section jumps

## 4) Enable Automation & Accessibility for JXA

- On macOS: System Settings → Privacy & Security → Accessibility. Add Terminal (or the app you use to run `osascript`).
- Also allow Automation for Terminal to control Logic Pro (you'll be prompted the first time you run the JXA script).

## 5) Test MIDI Path

- From DAWSheet's Java proxy (or a simple MIDI test app), send a note to `DAWSheet MIDI` and confirm you hear/see the input in Logic.
- Use Audio MIDI Setup's Network window to confirm session status.

## 6) Import & Marker Test (manual)

- In Logic, File → Import → MIDI File and choose one of your exported MIDI files.
- Verify the region is placed and plays back at the correct tempo.

If the manual import works, proceed to run the JXA automated script to confirm GUI automation works in your environment.
