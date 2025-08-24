# DAWSheet Quickstart (Windows PowerShell)

Fastest paths to “first sound” in two modes:

- No-Cloud: Sheets/sidebar → local Bridge (WebSocket) → default synth
- Cloud: Sheets (Apps Script) → Pub/Sub → Java Proxy → MIDI/default synth

## Prereqs

- Java 17+ (Adoptium Temurin recommended)
- This repository cloned locally
- Optional for Cloud path: a Google Cloud project with Pub/Sub API

---

## Path 1: No-Cloud (fastest)

Use the local Bridge and a browser to hear sound.

```powershell
# 1) Start the Bridge
Set-Location -Path 'H:\My Drive\dawsheet\dawsheet\bridge'
# If gradlew.bat is missing:
& 'H:\My Drive\dawsheet\dawsheet\apps\proxy-java\gradlew.bat' -p "$PWD" wrapper --no-daemon
& .\gradlew.bat run --no-daemon --console=plain
```

- You should see: `BridgeServer started on ws://127.0.0.1:17653`
- Then in your browser, open the local test client:
  - Drag-and-drop `bridge/test-client.html` into a browser window, click Connect, then Play C4.

Optional: Use the tester kit sidebar (copy from `distrib/cellbars_tester_kit/apps/addon/`) to drive NOTE.PLAY from a Google Sheet.

---

## Path 2: Cloud (full pipeline)

Sheets → Pub/Sub → Java Proxy (plays MIDI).

```powershell
# 1) Google Cloud setup (using repo SDK)
$gcloud = 'H:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd'
& $gcloud config set project YOUR_PROJECT
& $gcloud services enable pubsub.googleapis.com
& $gcloud pubsub topics create dawsheet.commands
& $gcloud pubsub topics create dawsheet.status
& $gcloud pubsub subscriptions create dawsheet.commands-sub --topic dawsheet.commands
& $gcloud auth application-default login

# 2) Run the Java Proxy
Set-Location -Path 'H:\My Drive\dawsheet\dawsheet\apps\proxy-java'
@'
GCP_PROJECT_ID=YOUR_PROJECT
COMMANDS_SUB=dawsheet.commands-sub
STATUS_TOPIC=dawsheet.status
'@ | Set-Content -Path .\.env -Encoding ASCII
& .\gradlew.bat runWithEnv
```

- In Sheets, add the Apps Script from `apps/gas/*`, then Menu → DAWSheet → Setup Wizard.
  - Set GCP Project ID and topic names; click Send Test.
- Type `C4, vel=100, dur=0.5` in a cell to play a note via the proxy.

Troubleshooting:

- GAS 403: ensure your account has Pub/Sub Publisher in YOUR_PROJECT and API is enabled.
- Proxy credential issues: run `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS`.
- No sound: remove `MIDI_OUT` to use default Java synth; try higher `velocity`.
