from pathlib import Path
import json
from tools.beatles_batch import analyze_batch


def test_analyze_batch_writes_files(tmp_path: Path):
    # create a sample .lab file tree
    root = tmp_path / 'root'
    root.mkdir()
    lab = root / 'sample.lab'
    lab.write_text('0.0 Verse\n15.2 Chorus\n')
    out = tmp_path / 'out'
    analyze_batch(root, out)
    # expected files
    song_id = 'sample'
    sr_file = out / f"{song_id}.json"
    diag_file = out / f"{song_id}.diag.json"
    assert sr_file.exists()
    assert diag_file.exists()
    sr = json.loads(sr_file.read_text(encoding='utf-8'))
    diag = json.loads(diag_file.read_text(encoding='utf-8'))
    assert sr.get('id') == song_id
    assert isinstance(sr.get('events'), list) and len(sr['events']) == 2
    assert diag.get('songId') == song_id
