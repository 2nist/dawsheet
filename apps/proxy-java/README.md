Proxy Java (skeleton)

This folder contains a minimal Java proxy skeleton used to implement command handling (ROUTING.SET), persistence of routes.json, and ACK publishing.

Files:

- src/main/java/com/dawsheet/proxy/RoutesManager.java
- src/main/java/com/dawsheet/proxy/ProxyServer.java

Build: add a Maven/Gradle wrapper and Jackson dependency to serialize/deserialize JSON.
DAWSheet Java Proxy
===================

Listens to Google Cloud Pub/Sub for DAWSheet commands and plays MIDI in real time.

Requirements

- Java 17+
- Google Cloud credentials with Pub/Sub Subscriber (via `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS`)

Environment

- `GCP_PROJECT_ID` (required)
- `COMMANDS_SUB` (required) Pub/Sub subscription ID bound to `dawsheet.commands`
- `STATUS_TOPIC` (optional) topic name (e.g., `dawsheet.status`) to publish ACK messages
- `MIDI_OUT` (optional) partial device name; if not provided, uses Java Synthesizer
- `PROXY_ID` (optional) defaults to `java-proxy`

Usage

```powershell
# In apps/proxy-java
gradlew.bat runWithEnv
```

Edit `.env` or export environment variables (the `runWithEnv` task will load `.env`).

Example `.env`:

```ini
GCP_PROJECT_ID=your-project
COMMANDS_SUB=dawsheet.commands-sub
STATUS_TOPIC=dawsheet.status
MIDI_OUT=Microsoft GS Wavetable Synth
PROXY_ID=laptop-proxy
```

Create a subscription if you don't have one yet:

```powershell
& "..\..\..\google-cloud-sdk\bin\gcloud.cmd" config set project your-project
& "..\..\..\google-cloud-sdk\bin\gcloud.cmd" pubsub subscriptions create dawsheet.commands-sub --topic dawsheet.commands
```

Then type `C4, vel=100, dur=0.5` in your Sheet. You should hear a note.
