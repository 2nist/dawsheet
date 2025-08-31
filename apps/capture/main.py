from __future__ import annotations
import time
import json
import uuid
import threading
import pathlib
from pathlib import Path
from typing import List, Dict, Any

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from .midi_ingest import parse_midi
from dawsheet.io.sheets import SheetsClient, HEADERS
from .realtime_asr import RealtimeASR
from .chord_normalize import normalize_symbol
from .section_detect import infer_sections
from shared.timing import ticks_to_beats, ticks_to_seconds
from shared.timing import map_time_to_beat, bpm_at_time
from .lyrics_parse import parse_lrc_to_words, parse_vtt_to_words
from pydantic import BaseModel
from shared.drums import drum_name
import yaml
from apps.adv.lyrics_lrclib_ingest import fetch_lrc as lrclib_fetch, parse_lrc_to_words as lrclib_parse
from apps.adv.lyrics_utils import (
    find_global_offset as lyrics_find_offset,
    snap_words_to_grid as lyrics_snap,
    rows_to_timeline_lists as lyrics_rows_to_lists,
    group_words_by_bar as lyrics_group_by_bar,
)
from apps.tools.ingest_from_chordify_midi import _parse_meta_from_name as parse_meta_from_name

class Config(BaseModel):
    sheet: Dict[str, Any]
    google_auth: Dict[str, Any]
    midi: Dict[str, Any]
    asr: Dict[str, Any]
    export: Dict[str, Any]
    project: Dict[str, Any]

ALLOWED_EXTS_DEFAULT = {".mid", ".lrc", ".vtt"}
IGNORE_SUFFIXES = {".crdownload", ".part", ".tmp"}
IGNORE_PREFIXES = {"~$", "."}


def is_allowed(path: pathlib.Path, allowed_exts: set[str]) -> bool:
    name = path.name.lower()
    if any(name.startswith(pfx) for pfx in IGNORE_PREFIXES):
        return False
    if any(name.endswith(sfx) for sfx in IGNORE_SUFFIXES):
        return False
    return path.suffix.lower() in allowed_exts


def wait_until_stable(p: pathlib.Path, debounce_ms=600, checks=3) -> bool:
    last = -1
    stable = 0
    for _ in range(120):  # ~1 minute max
        try:
            sz = p.stat().st_size
        except FileNotFoundError:
            return False
        if sz == last:
            stable += 1
            if stable >= checks:
                return True
        else:
            stable = 0
            last = sz
        time.sleep(debounce_ms / 1000.0)
    return False


def slugify(name: str) -> str:
    return ''.join(c.lower() if c.isalnum() else '-' for c in name).strip('-')


def build_rows(midi_info: Dict[str, Any], project_id: str) -> List[List[Any]]:
    rows = []
    events = list(midi_info['events'])
    ppqn = midi_info['ppqn']
    ts_num, ts_den = midi_info['time_sig'][0], midi_info['time_sig'][1]
    bpm = midi_info['bpm']
    tempo_map = midi_info.get('tempo_map') or []

    def _quantize(v: float, step: float, tol: float) -> float:
        if step <= 0:
            return v
        q = round(v / step) * step
        return q if abs(v - q) <= tol else v
    # If first event starts after tick 0, add an initial N.C. event to anchor Bar 1
    if events and int(events[0].get('tick', 0)) > 0:
        events.insert(0, {'tick': 0, 'text': 'N.C.'})
    for i, ev in enumerate(events):
        t_tick = int(ev.get('tick', 0))
        beat_abs = ticks_to_beats(t_tick, ppqn)
        # compute bar/beat within bar using time signature (beats are quarter-note units)
        beats_per_bar = float(ts_num) * (4.0 / float(ts_den))
        bar_idx = int(beat_abs // beats_per_bar) + 1
        # 1-based beat index; snap tightly to integers and quarter-beats
        beat_raw = ((beat_abs % beats_per_bar) + 1.0)
        beat_snapped = _quantize(beat_raw, 1.0, 0.02)  # snap to whole beats within 0.02
        if beat_snapped == beat_raw:
            beat_snapped = _quantize(beat_raw, 0.25, 0.02)  # else snap to quarter-beats
        beat_in_bar = round(beat_snapped, 3)
        # Also lightly quantize BeatAbs to quarter-beats to avoid cumulative jitter
        beat_abs = _quantize(beat_abs, 0.25, 0.02)
        # time in seconds using tempo_map for accuracy
        try:
            from .midi_ingest import tick_to_seconds
            t_sec = round(tick_to_seconds(t_tick, ppqn, tempo_map), 3)
        except Exception:
            t_sec = round(ticks_to_seconds(t_tick, ppqn, bpm), 3)
        chord_raw = ev.get('text') or ev.get('marker') or ''
        chord = normalize_symbol(chord_raw)
        if not chord:
            chord = 'N.C.'
        # Durations: until next event or default tail
        if i < len(events) - 1:
            next_tick = int(events[i + 1].get('tick', t_tick))
        else:
            next_tick = t_tick + int(ppqn * 4)  # default 1 bar tail
        # Quantize duration: prefer whole bars when close, else nearest 1/8 beat
        dur_beats_raw = ticks_to_beats(next_tick - t_tick, ppqn)
        bar_mult = round(dur_beats_raw / beats_per_bar) if beats_per_bar > 0 else 0
        if beats_per_bar > 0 and bar_mult >= 1 and abs(dur_beats_raw - bar_mult * beats_per_bar) <= 0.10:
            dur_beats = max(0.25, bar_mult * beats_per_bar)
        else:
            # snap to nearest 1/8 beat within a small tolerance
            dur_beats = max(0.125, _quantize(dur_beats_raw, 0.125, 0.06))
        try:
            from .midi_ingest import tick_to_seconds
            dur_sec = max(0.25, round(tick_to_seconds(next_tick, ppqn, tempo_map) - tick_to_seconds(t_tick, ppqn, tempo_map), 3))
        except Exception:
            dur_sec = max(0.25, ticks_to_seconds(next_tick - t_tick, ppqn, bpm))
        rows.append([
            bar_idx,               # Bar
            beat_in_bar,           # Beat
            round(beat_abs, 3),    # BeatAbs
            t_sec,                 # Time_s
            timecode(t_sec),       # Timecode
            chord,                 # Chord
            None,                  # Section
            round(dur_beats, 3),   # Dur_beats
            round(dur_sec, 3),     # Dur_s
            None,                  # Lyric
            None,                  # Lyric_conf
            'Chord',               # EventType
            None,                  # WordStart_s
            None,                  # WordEnd_s
            None,                  # SubIdx
            None,                  # Melisma
            None,                  # Chord_conf
            None,                  # Section_conf
            'midi',                # Source
            project_id,            # ProjectId
            str(uuid.uuid4()),     # EventId
        ])
    return rows


def timecode(t: float) -> str:
    m = int(t//60)
    s = int(t%60)
    ms = int((t - int(t)) * 1000)
    return f"{m:02d}:{s:02d}.{ms:03d}"


def process_midi(path: Path, cfg: Config, writer: SheetsClient) -> str:
    """Process a MIDI file and return the generated ProjectId."""
    info = parse_midi(path)
    # Optional: snap chord events to downbeats within threshold (beats)
    try:
        snap_beats = float(cfg.midi.get('snap_to_downbeat_beats', 0.9)) if isinstance(cfg.midi, dict) else 0.9
    except Exception:
        snap_beats = 0.9
    if snap_beats and snap_beats > 0:
        from .midi_ingest import _snap_events_to_downbeats  # type: ignore
        events = _snap_events_to_downbeats(info['events'], info['ppqn'], info['time_sig'][0], info['time_sig'][1], snap_beats=snap_beats)
        # Dynamic tightening: if majority are on/near downbeats, increase threshold and resnap
        ppqn = info['ppqn']
        ts_num, ts_den = info['time_sig'][0], info['time_sig'][1]
        ticks_per_bar = int(round(ppqn * float(ts_num) * (4.0 / float(ts_den)))) or max(1, ppqn * ts_num)
        near = 0
        for ev in events:
            t = int(ev.get('tick', 0))
            nearest = int(round(t / float(ticks_per_bar)) * ticks_per_bar)
            if abs(nearest - t) <= int(ppqn * 0.9):
                near += 1
        if events and (near / len(events)) >= 0.7:
            events = _snap_events_to_downbeats(events, ppqn, ts_num, ts_den, snap_beats=max(0.9, snap_beats))
        info['events'] = events
    project_id = f"{cfg.project.get('id_prefix','PRJ')}-{slugify(path.stem)}-{int(time.time())}"
    rows = build_rows(info, project_id)

    # section inference (basic)
    try:
        cfg_data = cfg.model_dump() if hasattr(cfg, 'model_dump') else cfg.dict()
        ngram_bars = cfg_data.get('sections',{}).get('ngram_bars',8)
    except Exception:
        cfg_data = {}
        ngram_bars = 8
    rows = infer_sections(rows, ngram_bars=ngram_bars, config=cfg_data)

    # Determine bar index offset (e.g., Chordify count-in -> -4..-1,0,1,...)
    try:
        midi_cfg = cfg.midi if isinstance(cfg.midi, dict) else {}
        # Explicit override wins
        bar_index_offset = midi_cfg.get('bar_index_offset', None)
        if bar_index_offset is None:
            # Heuristic: if filename suggests Chordify, assume 4-bar count-in
            name_l = path.name.lower()
            is_chordify = ('chordify' in name_l)
            prebars = int(midi_cfg.get('prebars', 4 if is_chordify else 0))
            bar_index_offset = -(prebars + 1) if prebars > 0 else 0
        bar_index_offset = int(bar_index_offset or 0)
    except Exception:
        bar_index_offset = 0

    if bar_index_offset:
        for r in rows:
            try:
                if r and r[0] is not None:
                    r[0] = int(r[0]) + bar_index_offset
            except Exception:
                pass

    # write to sheet in batches
    client = writer
    timeline_tab = cfg.sheet['timeline_tab']
    client.ensure_headers(timeline_tab, HEADERS)
    # Convert list-rows to dicts keyed by HEADERS
    rows_dicts = []
    for row in rows:
        d = {HEADERS[i]: (row[i] if i < len(row) else None) for i in range(len(HEADERS))}
        rows_dicts.append(d)
    client.append_rows(timeline_tab, rows_dicts)

    # Also write Instruments tab (non-drum notes)
    inst_tab = cfg.sheet.get('instruments_tab', 'Instruments')
    inst_headers = ['TickOn','TickOff','Chan','Program','Note','Vel','PPQN','ProjectId']
    inst_rows = []
    for n in info.get('notes', []):
        chan = int(n.get('chan', 0))
        if chan == 9:  # filter drums
            continue
        inst_rows.append([
            int(n.get('tick_on', 0)),
            int(n.get('tick_off', 0)),
            chan,
            int(n.get('program', 0)),
            int(n.get('note', 0)),
            int(n.get('vel', 0)),
            int(info.get('ppqn', 480)),
            project_id,
        ])
    if inst_rows:
        client._set_headers(inst_tab, inst_headers)
        inst_dicts = [{inst_headers[i]: row[i] for i in range(len(inst_headers))} for row in inst_rows]
        client.append_rows(inst_tab, inst_dicts)

    # Write Drums tab (channel 10 only)
    drum_tab = cfg.sheet.get('drums_tab', 'Drums')
    drum_headers = ['TickOn','TickOff','Note','Name','Vel','PPQN','ProjectId']
    drum_rows = []
    for n in info.get('notes', []):
        if int(n.get('chan', 0)) != 9:
            continue
        note = int(n.get('note', 0))
        drum_rows.append([
            int(n.get('tick_on', 0)),
            int(n.get('tick_off', n.get('tick_on', 0))),
            note,
            drum_name(note),
            int(n.get('vel', 0)),
            int(info.get('ppqn', 480)),
            project_id,
        ])
    if drum_rows:
        client._set_headers(drum_tab, drum_headers)
        drum_dicts = [{drum_headers[i]: row[i] for i in range(len(drum_headers))} for row in drum_rows]
        client.append_rows(drum_tab, drum_dicts)

    # exports
    from .exporters import write_exports
    out_dir = Path(cfg.export['out_dir'])
    write_exports(out_dir, path.stem, rows)

    # Attempt LRCLIB lyrics fetch and append lyric rows if available
    try:
        meta = parse_meta_from_name(path.name)
        artist = (cfg.project.get('artist') if isinstance(cfg.project, dict) else None) or meta.get('artist') or ''
        title = (cfg.project.get('title') if isinstance(cfg.project, dict) else None) or meta.get('title') or ''
        if artist and title:
            duration_hint = None
            try:
                duration_hint = float(info.get('duration_s')) if info.get('duration_s') is not None else None
            except Exception:
                duration_hint = None
            lrc = lrclib_fetch(artist, title, duration_s=duration_hint)
            if lrc:
                words = lrclib_parse(lrc)
                if words:
                    tempo_map = info.get('tempo_map') or [{"start_s": 0.0, "bpm": float(info.get('bpm', 120.0))}]
                    ts_num = int(info.get('time_sig', (4,4))[0])
                    pickup_beats = float(cfg.midi.get('pickup_beats', 0.0)) if isinstance(cfg.midi, dict) else 0.0
                    snap_div = 4  # default 1/4 grid for lyrics
                    off = lyrics_find_offset(words, tempo_map, ts_num, pickup_beats, snap_div=snap_div)
                    for w in words:
                        if w.get('WordStart_s') is not None:
                            w['WordStart_s'] = float(w['WordStart_s']) + off
                        if w.get('WordEnd_s') is not None:
                            w['WordEnd_s'] = float(w['WordEnd_s']) + off
                        w['Lyric_conf'] = float(w.get('Lyric_conf', 0.95))
                    snapped = lyrics_snap(words, tempo_map, ts_num, pickup_beats, snap_div=snap_div)
                    # Attach active chord to each lyric based on MIDI chord events
                    try:
                        from .midi_ingest import tick_to_seconds as _t2s
                        ppqn = int(info.get('ppqn', 480))
                        # Use the already-built rows for chord timeline to ensure consistency
                        chord_timeline = []
                        for r in rows:
                            if r[11] == 'Chord': # EventType is 'Chord'
                                chord_timeline.append({
                                    'start_s': r[3], # Time_s
                                    'end_s': r[3] + r[8], # Time_s + Dur_s
                                    'chord': r[5] # Chord
                                })

                        for s in snapped:
                            t0 = float(s.get('WordStart_s') or s.get('Time_s') or 0.0)
                            active_chord = 'N.C.'
                            for event in chord_timeline:
                                if event['start_s'] <= t0 < event['end_s']:
                                    active_chord = event['chord']
                                    break
                            s['Chord'] = active_chord
                            # Apply bar index offset to lyric rows
                            try:
                                if bar_index_offset and s.get('Bar') is not None:
                                    s['Bar'] = int(s['Bar']) + bar_index_offset
                            except Exception:
                                pass
                    except Exception as e:
                        print(f"[lyrics] failed to map chords to lyrics: {e}")
                    lyric_rows = lyrics_rows_to_lists(snapped, project_id, source='lrclib')
                    if lyric_rows:
                        writer.append_rows(cfg.sheet['id'], cfg.sheet['timeline_tab'], lyric_rows)
                        print(f"[lyrics] LRCLIB appended {len(lyric_rows)} rows for {artist} - {title}")
                    # Additionally, append grouped-by-bar lyric lines for compact display
                    try:
                        grouped = lyrics_group_by_bar(snapped, tempo_map, ts_num, pickup_beats)
                        if bar_index_offset:
                            for g in grouped:
                                try:
                                    if g.get('Bar') is not None:
                                        g['Bar'] = int(g['Bar']) + bar_index_offset
                                except Exception:
                                    pass
                        grouped_rows = lyrics_rows_to_lists(grouped, project_id, source='lrclib_bar')
                        if grouped_rows:
                            writer.append_rows(cfg.sheet['id'], cfg.sheet['timeline_tab'], grouped_rows)
                            print(f"[lyrics] Grouped-by-bar appended {len(grouped_rows)} rows")
                    except Exception as ge:
                        print(f"[lyrics] grouping-by-bar failed: {ge}")
            else:
                print(f"[lyrics] LRCLIB not found for {artist} - {title}")
        else:
            print("[lyrics] Artist/Title unknown; skipping LRCLIB fetch")
    except Exception as e:
        print(f"[lyrics] failed to fetch/append LRCLIB lyrics: {e}")

    return project_id


# ---- Routed handlers ----
def ingest_midi_and_write_sheet(path: pathlib.Path, cfg: Config, writer: SheetsClient):
    process_midi(Path(path), cfg, writer)


def words_to_rows_for_sheet(words_in: List[Dict[str, Any]], tempo_map: List[Dict[str, float]],
                            ts_num: int, pickup_beats: float, project_id: str,
                            bpm_default: float) -> List[List[Any]]:
    # Normalize parsed words into ASR shape expected by RealtimeASR.words_to_rows
    words = []
    for w in words_in:
        words.append({
            'text': w.get('Lyric', ''),
            'start_s': w.get('WordStart_s'),
            'end_s': w.get('WordEnd_s'),
            'conf': w.get('Lyric_conf'),
        })
    return RealtimeASR.words_to_rows(words, tempo_map, ts_num, pickup_beats, project_id, bpm_default)


def write_lyrics_to_sheet_from_text_rows(path: pathlib.Path, cfg: Config, writer: SheetsClient,
                                         words_in: List[Dict[str, Any]]):
    # Try to find a sibling .mid for tempo/ts; else fallback to 120 bpm, 4/4
    midi_sibling = path.with_suffix('.mid')
    tempo_map = [{"start_s": 0.0, "bpm": 120.0}]
    ts_num = 4
    bpm_default = 120.0
    if midi_sibling.exists():
        info = parse_midi(Path(midi_sibling))
        tempo_map = info.get('tempo_map') or tempo_map
        ts_num = int(info.get('time_sig', (4, 4))[0])
        bpm_default = float(info.get('bpm', bpm_default))
    pickup_beats = float(cfg.midi.get('pickup_beats', 0.0)) if isinstance(cfg.midi, dict) else 0.0
    project_id = f"{cfg.project.get('id_prefix','PRJ')}-{slugify(path.stem)}-{int(time.time())}"

    rows = words_to_rows_for_sheet(words_in, tempo_map, ts_num, pickup_beats, project_id, bpm_default)

    # Ensure headers and append
    client = writer
    timeline_tab = cfg.sheet['timeline_tab']
    client.ensure_headers(timeline_tab, HEADERS)
    client.append_rows(timeline_tab, rows)


def handle_mid(path: pathlib.Path, cfg: Config, writer: SheetsClient):
    ingest_midi_and_write_sheet(path, cfg, writer)


def handle_lrc(path: pathlib.Path, cfg: Config, writer: SheetsClient):
    text = Path(path).read_text(encoding='utf-8', errors='ignore')
    words = parse_lrc_to_words(text)
    write_lyrics_to_sheet_from_text_rows(path, cfg, writer, words)


def handle_vtt(path: pathlib.Path, cfg: Config, writer: SheetsClient):
    text = Path(path).read_text(encoding='utf-8', errors='ignore')
    words = parse_vtt_to_words(text)
    write_lyrics_to_sheet_from_text_rows(path, cfg, writer, words)


HANDLERS = {
    ".mid": handle_mid,
    ".lrc": handle_lrc,
    ".vtt": handle_vtt,
}


class RoutedHandler(FileSystemEventHandler):
    def __init__(self, cfg: Config, writer: SheetsWriter, debounce_ms=600, checks=3, allowed_exts=None):
        self.cfg = cfg
        self.writer = writer
        self.debounce_ms = debounce_ms
        self.checks = checks
        self.allowed_exts = set(allowed_exts or ALLOWED_EXTS_DEFAULT)

    def _spawn(self, p: pathlib.Path):
        ignore_partial = bool(self.cfg.midi.get('ignore_partial', True)) if isinstance(self.cfg.midi, dict) else True
        if ignore_partial:
            if not wait_until_stable(p, self.debounce_ms, self.checks):
                return
        try:
            HANDLERS[p.suffix.lower()](p, self.cfg, self.writer)
        except Exception as e:
            print(f"[watcher] failed on {p.name}: {e}")

    def _route(self, file_path: str):
        p = pathlib.Path(file_path)
        if not is_allowed(p, self.allowed_exts):
            return
        threading.Thread(target=self._spawn, args=(p,), daemon=True).start()

    def on_created(self, event):
        if event.is_directory:
            return
        self._route(event.src_path)

    def on_moved(self, event):
        if event.is_directory:
            return
        self._route(event.dest_path)


def main(config_path: str):
    cfg = Config(**yaml.safe_load(Path(config_path).read_text(encoding='utf-8')))
    writer = SheetsClient(spreadsheet_id=cfg.sheet['id'])

    # optional ASR
    asr = None
    if cfg.asr.get('enable_realtime', False):
        asr = RealtimeASR(cfg.asr)
        asr.start()

    watch_dir = Path(cfg.midi['watch_dir'])
    watch_dir.mkdir(parents=True, exist_ok=True)

    allowed_exts = set(cfg.midi.get('allowed_exts', [])) or ALLOWED_EXTS_DEFAULT
    debounce_ms = int(cfg.midi.get('debounce_ms', 600))
    checks = int(cfg.midi.get('stable_checks', 3))

    handler = RoutedHandler(cfg, writer, debounce_ms=debounce_ms, checks=checks, allowed_exts=allowed_exts)
    obs = Observer()
    obs.schedule(handler, str(watch_dir), recursive=False)
    obs.start()

    print(f"[watcher] watching {watch_dir} for: {', '.join(sorted(allowed_exts))}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        obs.stop()
    finally:
        obs.join()
        if asr:
            asr.stop()

if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', default='config.yaml')
    args = ap.parse_args()
    main(args.config)
