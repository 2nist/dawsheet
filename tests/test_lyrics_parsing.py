import json
from pathlib import Path
from webapp.routers import lyrics


FIX = Path(__file__).parent / 'fixtures'


def test_parse_lrc_fixture():
    data = (FIX / 'lyrics_sample.lrc').read_bytes()
    out = lyrics.parse_lrc_bytes(data)
    assert len(out) == 2
    assert out[0].startSec == 0.0
    assert out[1].startSec == 5.5


def test_parse_txt_fixture():
    data = (FIX / 'lyrics_sample.txt').read_bytes()
    out = lyrics.parse_txt_bytes(data)
    assert len(out) == 2
    assert out[0].conf == 'low'
