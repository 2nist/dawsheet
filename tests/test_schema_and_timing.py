from __future__ import annotations

from apps.capture.sheets_writer import upgrade_headers, HEADERS
from shared.timing import map_time_to_beat
from shared.lyrics_utils import subindex, is_melisma


def test_upgrade_headers_idempotent():
    h1 = upgrade_headers([])
    assert h1[:len(HEADERS)] == HEADERS
    h2 = upgrade_headers(h1)
    assert h2 == HEADERS


def test_map_time_to_beat_constant_and_change_with_pickup():
    # Constant 60 BPM, 4/4, no pickup
    tm = [{"start_s": 0.0, "bpm": 60.0}]
    bar, beat, beat_abs = map_time_to_beat(0.0, tm, 4, 0.0)
    assert (bar, round(beat,3), round(beat_abs,3)) == (1, 1.0, 0.0)
    bar, beat, beat_abs = map_time_to_beat(1.0, tm, 4, 0.0)
    assert (bar, round(beat,3)) == (1, 2.0)

    # Tempo change at 2.0s: 60->120 bpm
    tm2 = [{"start_s": 0.0, "bpm": 60.0}, {"start_s": 2.0, "bpm": 120.0}]
    # At t=2.0, beat_abs should be 2.0 (2 beats at 60 bpm)
    b = map_time_to_beat(2.0, tm2, 4, 0.0)[2]
    assert round(b,3) == 2.0
    # At t=3.0, +1s at 120 bpm adds 2 beats => 4.0 total
    b = map_time_to_beat(3.0, tm2, 4, 0.0)[2]
    assert round(b,3) == 4.0

    # Pickup of 1 beat moves first downbeat to beat_abs=1.0
    bar, beat, _ = map_time_to_beat(1.0, tm, 4, 1.0)
    assert (bar, round(beat,3)) == (1, 1.0)


def test_subindex_and_melisma():
    words = [
        {"Bar":1,"Beat":2.0,"WordStart_s":1.05,"Lyric":"a"},
        {"Bar":1,"Beat":2.0,"WordStart_s":1.02,"Lyric":"b"},
        {"Bar":1,"Beat":3.0,"WordStart_s":1.50,"Lyric":"c"},
    ]
    subs = subindex(words)
    assert subs == [1,0,0]  # ordered by start time within same beat

    w_short = {"WordStart_s":0.0,"WordEnd_s":0.49}
    w_long  = {"WordStart_s":0.0,"WordEnd_s":1.01}
    assert not is_melisma(w_short, bpm=60, ts_num=4, threshold_beats=1.0)
    assert is_melisma(w_long, bpm=60, ts_num=4, threshold_beats=1.0)
