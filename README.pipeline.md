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
- Partial downloads are ignored until file size is stable.

## Sheet Schema (Timeline)

Bar | Beat | BeatAbs | Time_s | Timecode | Chord | Section | Dur_beats | Dur_s | Lyric | Lyric_conf | EventType | WordStart_s | WordEnd_s | SubIdx | Melisma | Chord_conf | Section_conf | Source | ProjectId | EventId

If headers are missing, they’ll be created (writer upgrades or use Apps Script installLyricWordColumns()).

## Offline align (stub)

```
python -m apps.offline_align.align --config config.yaml --audio path/to.wav
```
