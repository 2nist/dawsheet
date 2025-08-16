# DAWSheet

Hybrid orchestration: Google Sheets + Apps Script (GAS) for UI/event bus, Java proxy for real-time MIDI/OSC/DAW control.

## Setup

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
