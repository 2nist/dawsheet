# DAWSheet Bridge (stub)

Local WebSocket server for low-latency envelope playback.

- **Endpoint:** `ws://127.0.0.1:17653`
- **Implements:** `NOTE.PLAY` to default Java synth (more outputs later)
- **Scheduling:** naive `now + 100ms` lookahead (tweak in code)
- **Build:** Java 17 + Gradle

## Build & Run

```bash
cd bridge
./gradlew run           # macOS/Linux
# or
gradlew.bat run         # Windows
```

You should see: BridgeServer started on ws://127.0.0.1:17653

## Test

Open the Google Sheet with the add-on sidebar → Bridge → Connect → Bridge Test NOTE.PLAY. You should hear a beep from the Java synth.

## Next

- Output to selected MIDI port (Java Sound or rtmidi/JNA), not just default synth
- Envelope types: PROGRAM.CHANGE, CC.SET, CHORD.PLAY, etc.
- Real arrangement compiler → SMF export
