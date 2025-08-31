<<<<<<< HEAD

# DAWSheet Pipeline (MIDI ➜ Live Capture)

MVP to ingest Chordify MIDI, optionally run real-time ASR, write rows to a Google Sheet timeline, infer sections, and export files.

## Install

- Python 3.11 recommended.
- Create venv and install deps:

```
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
```

- Copy config.example.yaml to config.yaml and edit values.

## Run

```
python -m apps.capture.main --config config.yaml
```

Drop a .mid into your configured watch_dir.
Watcher notes:

- The watcher reacts to .mid / .lrc / .vtt only. Add more by editing config midi.allowed_exts.
- Partial downloads (.crdownload/.part/.tmp and hidden/prefixes) are ignored until file size is stable.

## Sheet Schema (Timeline)

If headers are missing, they’ll be created (writer upgrades or use Apps Script installLyricWordColumns()).

````markdown
# DAWSheet

This walks you from zero to sound: set up Pub/Sub, deploy the Sheet script, run the proxy, and trigger a note.


- Make sure the Pub/Sub API is enabled for your project.
- Create topics and a subscription (replace `<PROJECT_ID>`):

```powershell
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" config set project <PROJECT_ID>
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub topics create dawsheet.commands
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub topics create dawsheet.status
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub subscriptions create dawsheet.commands-sub --topic dawsheet.commands
```

- User creds:

```powershell
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" auth application-default login
```

# DAWSheet — Spreadsheet-first DAW bridge

Lightweight tools to import, analyze, and export musical project data between Google Sheets and DAWs.

Key developer docs:

- `README.pipeline.md` — pipeline notes and CI guidance
- `PLAN.md` — roadmap and next steps

Security:
- Do not commit service account JSON files. Use environment variables or encrypted CI secrets.

### 2) Install and push the Google Apps Script

See `apps/gas/README.md` for details. Quick path:

```powershell
npm i -g @google/clasp
clasp login
cd "h:\My Drive\dawsheet\dawsheet\apps\gas"
clasp create --type sheets --title "DAWSheet Controller" --rootDir ./
clasp push
```

In the Apps Script editor → Project Settings → Script Properties, add:

- `GCP_PROJECT_ID` = `<PROJECT_ID>`
- `COMMANDS_TOPIC` = `dawsheet.commands`
- `STATUS_TOPIC` = `dawsheet.status`

Add the Google Cloud Pub/Sub advanced service in the Services panel.

### 3) Build and run the Java proxy

Build once:

```powershell
& "h:\My Drive\dawsheet\dawsheet\apps\proxy-java\gradlew.bat" -p "h:\My Drive\dawsheet\dawsheet\apps\proxy-java" clean test installDist --no-daemon
```

Create `.env` in `apps/proxy-java`:

```ini
GCP_PROJECT_ID=<PROJECT_ID>
COMMANDS_SUB=dawsheet.commands-sub
STATUS_TOPIC=dawsheet.status
# Leave blank for default synth or set a partial device name
MIDI_OUT=
PROXY_ID=laptop-proxy
```

Run the proxy (loads `.env`):

```powershell
cd "h:\My Drive\dawsheet\dawsheet\apps\proxy-java"
./gradlew.bat runWithEnv --no-daemon
```

Or run the installed app:

```powershell
& "h:\My Drive\dawsheet\dawsheet\apps\proxy-java\build\install\dawsheet-proxy\bin\dawsheet-proxy.bat"
```

### 4) Trigger a note from the Sheet

In any cell, type:

```text
C4, vel=100, dur=0.5
```

You should hear a note. Proxy logs will show the event. To see ACKs (optional):

```powershell
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub subscriptions create status-sub --topic dawsheet.status
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub subscriptions pull status-sub --auto-ack --limit=10
```

---

## Troubleshooting

- No sound: remove `MIDI_OUT` to use default Java Synth, or set it to a visible device name (e.g., "Microsoft GS Wavetable Synth").
- GAS publish error: confirm `GCP_PROJECT_ID` and that Pub/Sub service is added in Apps Script.
- Proxy subscribe error: ensure `COMMANDS_SUB` exists and credentials are set (ADC or `GOOGLE_APPLICATION_CREDENTIALS`).
- JDK issues: install Java 17; Gradle toolchains will use it automatically.

---

## Next steps

- Add `CC.SET`, `PROGRAM.CHANGE`, DAW actions per `spec/commands.schema.json`.
- Implement a Sheet-side status log (`pollStatus`) or small Cloud Function.
- Replace placeholder codegen with schema-driven Java models.
````
