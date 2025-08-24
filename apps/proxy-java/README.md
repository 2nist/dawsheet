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
# Easiest: from repo root
./scripts/proxy-run.ps1

# Or, from apps/proxy-java
gradlew.bat runWithEnv
```

Edit `.env` or export environment variables (the `runWithEnv` task will load `.env`). On startup, the proxy logs all available MIDI outputs and marks the selected one (filter via `MIDI_OUT`). If `STATUS_TOPIC` is set, ACK/status messages are published for each command. `ROUTING.SET` is recognized and currently logged (stub).

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

Next steps

- In the Sheet, DAWSheet → Pull Status → Logs to fetch ACKs into a `Logs` tab.
- See `docs/STATUS_RUNBOOK.md` for troubleshooting and details.
