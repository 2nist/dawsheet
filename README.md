# DAWSheet

Hybrid orchestration: Google Sheets + Apps Script (GAS) for UI/event bus, Java proxy for real-time MIDI/OSC/DAW control.

## 🛠️ Development Setup

### Quick Start from GitHub

```bash
git clone https://github.com/2nist/dawsheet.git
cd dawsheet
```

### Prerequisites

1.  Clone repo, run `infra/create_topics.sh` to create Pub/Sub topics/subscription.
2.  Create service account, grant Pub/Sub roles, and add key (see infra/service_accounts.md).
3.  Set up `.env` in `proxy-java` and GAS Script Properties.
4.  Deploy GAS with `clasp push` from `apps/gas`.
5.  Run proxy: `make dev` or VS Code task "proxy-java:dev".
6.  Edit a cell in "Grid" tab (e.g., `A5: C4, vel=100, dur=0.5`).
7.  Note plays via MIDI, ACK appears in "Logs" sheet.

## Demo

-   Edit cell → NOTE command → Java proxy → MIDI note → ACK → Logs.
-   See [apps/gas/README.md](apps/gas/README.md) for GAS setup.
-   See [infra/service_accounts.md](infra/service_accounts.md) for GCP setup.

## Design

-   Sheets = orchestration UI.
-   Java proxy = low-latency bridge.
-   Pub/Sub = async event bus.

---

## Use it (Windows PowerShell)

This walks you from zero to sound: set up Pub/Sub, deploy the Sheet script, run the proxy, and trigger a note.

### 1) Google Cloud setup

- Make sure the Pub/Sub API is enabled for your project.
- Create topics and a subscription (replace `<PROJECT_ID>`):

```powershell
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" config set project <PROJECT_ID>
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub topics create dawsheet.commands
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub topics create dawsheet.status
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" pubsub subscriptions create dawsheet.commands-sub --topic dawsheet.commands
```

Authenticate for local dev (pick one):

- User creds:

```powershell
& "h:\My Drive\dawsheet\dawsheet\google-cloud-sdk\bin\gcloud.cmd" auth application-default login
```

- Or service account:

	- Set `GOOGLE_APPLICATION_CREDENTIALS` to a JSON key with Pub/Sub Subscriber.

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
