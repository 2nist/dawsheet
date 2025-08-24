# PR: DAWSheet — CellBars Test Path (Add-on + Bridge Push)

Summary

Adds distrib/cellbars_tester_kit/ with a ready-to-share Google Sheets add-on (Welcome, Web MIDI) using a placeholder logo.

Adds bridge/ Java WebSocket server stub that plays NOTE.PLAY on the default Java synth.

Adds sidebar Bridge section: connect/ping/send test envelope to ws://127.0.0.1:17653.

Why

Faster "sheet → sound" for non-technical testers.

Establishes the push path (no Sheets polling) we plan to standardize.

Test plan

Open a new Sheet → import apps/addon/ files into Apps Script.

Run the bridge: cd bridge && ./gradlew run.

In the sidebar: Play Kick (Web Audio), then Enable MIDI (optional).

Click Bridge → Connect and Bridge Test NOTE.PLAY → hear synth beep.

(Optional) Enable IAC + Logic and use Web MIDI instead.

Follow-ups (separate PRs)

Bridge MIDI port selection + latency meter.

Envelope handlers: CC.SET, PROGRAM.CHANGE, CHORD.PLAY, etc.

Arrangement compiler (Timeline → envelopes) and SMF export.
