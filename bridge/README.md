# DAWSheet Bridge (stub)

Local WebSocket server for low-latency envelope playback.

- **Endpoint:** `ws://127.0.0.1:17653`
- **Implements:** `NOTE.PLAY` to default Java synth (more outputs later)
- **Scheduling:** naive `now + 100ms` lookahead (tweak in code)
- **Build:** Java 17 + Gradle

## Build & Run

Java 17 is required. On Windows PowerShell, use these commands:

```powershell
# From repo root
Set-Location -Path 'H:\My Drive\dawsheet\dawsheet\bridge'

# If gradlew.bat is missing, generate it using the existing wrapper
& 'H:\My Drive\dawsheet\dawsheet\apps\proxy-java\gradlew.bat' -p "$PWD" wrapper --no-daemon

# Verify wrapper
& .\gradlew.bat --version

# Build (skip tests for now)
& .\gradlew.bat build -x test --no-daemon

# Run the server
& .\gradlew.bat run --no-daemon --console=plain
```

Expected output: `BridgeServer started on ws://127.0.0.1:17653`

## Test

Open the Google Sheet with the add-on sidebar → Bridge → Connect → Bridge Test NOTE.PLAY. You should hear a beep from the Java synth.

## Next

- Output to selected MIDI port (Java Sound or rtmidi/JNA), not just default synth
- Envelope types: PROGRAM.CHANGE, CC.SET, CHORD.PLAY, etc.
- Real arrangement compiler → SMF export
