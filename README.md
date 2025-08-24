# DAWSheet

Hybrid orchestration: Google Sheets + Apps Script (GAS) for UI/event bus, Java proxy for real-time MIDI/OSC/DAW control.

If you want the fastest path to sound, see QUICKSTART:

- No-Cloud: Bridge WebSocket → default synth
- Cloud: Sheets → Pub/Sub → Java Proxy

Read: [QUICKSTART.md](./QUICKSTART.md)

## 🛠️ Development Setup

### Quick Start from GitHub

```bash
git clone https://github.com/2nist/dawsheet.git
cd dawsheet
```

### Prerequisites

1. Clone repo, run `infra/create_topics.sh` to create Pub/Sub topics/subscription.
2. Create service account, grant Pub/Sub roles, and add key (see infra/service_accounts.md).
3. Set up `.env` in `proxy-java` and GAS Script Properties.
4. Deploy GAS with `clasp push` from `apps/gas`.
5. Run proxy: `make dev` or VS Code task "proxy-java:dev".
6. Edit a cell in "Grid" tab (e.g., `A5: C4, vel=100, dur=0.5`).
7. Note plays via MIDI, ACK appears in "Logs" sheet.

## Demo

-   Edit cell → NOTE command → Java proxy → MIDI note → ACK → Logs.
-   See [apps/gas/README.md](apps/gas/README.md) for GAS setup.
- See [infra/service_accounts.md](infra/service_accounts.md) for GCP setup.

## Design

- Sheets = orchestration UI.
- Java proxy = low-latency bridge.
- Pub/Sub = async event bus.

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

---

## Validator / Catalog / Roles

This pack adds catalogs to guide validation, a Roles tab to mark ignored areas, and compiler wiring so Triggers respect ignore/bypass rules.

What’s included

- New menu: `DAWSheet — Validate` with actions to seed catalogs, seed roles, apply validations, and lint triggers.
- Catalog sheets: `Catalog_Commands`, `Catalog_Triggers` (reference data for future dynamic validations).
- Roles sheet: `Roles` where you can declare `IGNORE` A1 ranges like `UI!A1:C10`.
- Compiler wiring: The Triggers compiler (`TriggersPack.gs`) now skips rows inside ignored ranges and rows bypassed via comment prefix.

First-time setup

1) In the Sheet: `DAWSheet — Validate → Seed Catalog Sheets`  
	Creates `Catalog_Commands` and `Catalog_Triggers` with initial entries.

2) `DAWSheet — Validate → Seed Roles (Ignore Ranges)`  
	Creates a `Roles` tab with sample `IGNORE` ranges. Edit A1 ranges to match your UI zones.

3) `DAWSheet — Validate → Apply Data Validations`  
	Adds dropdowns and helper notes to the `Triggers` sheet.

4) (If needed) `DAWSheet — Triggers → Insert Triggers Template` to create the `Triggers` sheet.

Bypass & Ignore rules

- Bypass a row: uncheck the `Enabled` checkbox OR prefix `Note/CC/Addr` with `#` or `~` (e.g., `# C4`).
- Ignore UI zones: Add rows to `Roles` with `Role=IGNORE` and an A1 range (e.g., `UI!A1:C10`). Rows inside these ranges are ignored by both the linter and compilers.
- No reliance on borders/colors for logic; only the Roles table drives ignore behavior.

Linting

- Run `DAWSheet — Validate → Validate Triggers Now` to annotate cells inline and populate a `Lint` summary sheet.

Quick syntax guide (Triggers)

- `When`: `bar:beat` (e.g., `5:1`) | `NOW` | ISO `2025-08-24T12:00:00Z`
- `Trigger`: dropdown (`NOTE.PLAY`, `CC.SET`, `CC.RAMP`, `PROGRAM.CHANGE`, `MACRO.TRIGGER`, `OSC.SEND`, `CHORD.PLAY`, `TRANSPORT.START/STOP`, ...)
- `Track/Target`: Track name from `TrackMap` or explicit target like `mac:logic` or `ws://host:17653`
- `Note/CC/Addr`: `C4` | `60` | alias | `cc:74` | `/osc/path` | `# ...` (comment = bypass)
- `Value/Args`: `0..127` | `0→100` (ramp) | JSON array `[1,0.5]`
- `Duration`: `8b` | `1/8` (beats or note fractions)

Preview and send

- Use `DAWSheet — Triggers → Preview Triggers JSON` to inspect compiled envelopes with absolute `at` timestamps.
- Use `DAWSheet — Triggers → Send Triggers → Bridge` to return the JSON; your sidebar/Welcome UI can send it over WebSocket to the Bridge.

Notes

- Files involved (Apps Script): `TriggersPack.gs`, `UtilsRolesBypass.gs`, `ValidatorPackV2.gs`.
- The Arrangement/Sequencer packs can also honor the same Roles/Bypass rules; if you add them later, apply the same helpers in their compilers.
