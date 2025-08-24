# DAWSheet Status/ACK Runbook

This runbook explains how to enable status ACKs from the Java proxy and how to pull them into a Logs sheet in Google Sheets.

## Prereqs

- Pub/Sub API enabled on your GCP project
- `GCP_PROJECT_ID` set in the Sheet (Setup Wizard)
- Apps Script scopes include Pub/Sub and external_request

## Ensure Topics and Subs

Use the helper script (Windows PowerShell):

```pwsh
Set-Location 'H:\\My Drive\\dawsheet\\dawsheet\\scripts'
.\\pubsub-ensure.ps1 -ProjectId <your-project-id>
```

This creates:

- Topic `dawsheet.commands`
- Topic `dawsheet.status`
- Sub `dawsheet.commands-sub` bound to commands
- Sub `dawsheet.status-sub` bound to status

## Run Proxy with ACKs

```pwsh
Set-Location 'H:\\My Drive\\dawsheet\\dawsheet\\scripts'
.\\proxy-run.ps1 -ProjectId <your-project-id> -MidiOut "Microsoft GS Wavetable Synth"
```

- Lists available MIDI devices on startup
- Uses `MIDI_OUT` substring if provided; otherwise falls back to Java Synth
- Publishes an ACK to `dawsheet.status` after each handled command

## Pull Status into Logs

In the Sheet:

- Menu → DAWSheet → Pull Status → Logs
- Creates a `Logs` sheet if missing and appends rows like: When, Kind, CmdId, OK, LatencyMs, ProxyId, MidiOut, Detail

## Troubleshooting

- 403 on pull: ensure Pub/Sub is enabled and `GCP_PROJECT_ID` matches; re-consent scopes by running any Apps Script function.
- No rows: ensure the proxy sent ACKs and that `STATUS_SUB` is set to `dawsheet.status-sub` in Script Properties.
- Device not found: check proxy startup list and adjust `MIDI_OUT` substring.
