from __future__ import annotations
from typing import List, Dict, Optional
import re
import requests


LRCLIB_GET = "https://lrclib.net/api/get"
LRCLIB_SEARCH = "https://lrclib.net/api/search"


def _norm(s: str) -> str:
    s = (s or "").lower()
    # remove common noise words
    s = re.sub(r"\b(official|lyrics|lyric|video|audio|remaster(?:ed)?|hd|time[-_ ]?aligned|music\s+video)\b", " ", s)
    # collapse punctuation to space
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    # drop leading 'the'
    s = re.sub(r"^the\s+", "", s)
    return s


def _sim(a: str, b: str) -> float:
    ta = set(_norm(a).split())
    tb = set(_norm(b).split())
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union


def fetch_lrc(artist: str, title: str, duration_s: Optional[float] = None) -> Optional[str]:
    """Fetch synced LRC text from LRCLIB via fuzzy search.

    Strategy:
    - Use /api/search with artist_name + track_name
    - Prefer results with syncedLyrics present
    - Rank by combined title/artists similarity
    - Fallback to /api/get exact match
    """
    artist = artist or ""
    title = title or ""
    if not artist and not title:
        return None
    try:
        # Ignore bogus artist tokens like 'Chordify'
        if _norm(artist) == 'chordify':
            artist = ''

        def _search(a: str, t: str) -> Optional[str]:
            r = requests.get(LRCLIB_SEARCH, params={"track_name": t, "artist_name": a, "limit": 10}, timeout=12)
            if r.status_code != 200:
                return None
            results = r.json() or []
            if not isinstance(results, list):
                results = [results]
            best = None
            best_score = -1.0
            for it in results:
                tname = it.get("trackName") or it.get("name") or ""
                aname = it.get("artistName") or it.get("artist") or ""
                has_sync = bool((it.get("syncedLyrics") or "").strip())
                score = 0.7 * _sim(tname, t) + 0.3 * _sim(aname, a)
                # If we have a duration hint, reward close matches
                if duration_s is not None:
                    # LRCLIB duration fields: duration or length maybe in seconds or ms; try both keys
                    dur = it.get("duration") or it.get("length") or it.get("durationMs") or it.get("lengthMs")
                    if isinstance(dur, (int, float)):
                        dur_s = float(dur)
                        if dur_s > 1000:  # looks like ms
                            dur_s = dur_s / 1000.0
                        diff = abs(dur_s - float(duration_s))
                        # up to ~10s diff penalty; closer => higher score
                        score += max(0.0, 0.2 - min(diff, 10.0) * 0.02)
                if has_sync:
                    score += 0.2
                if score > best_score:
                    best = it
                    best_score = score
            if best and (best.get("syncedLyrics") or best.get("plainLyrics")):
                lrc = best.get("syncedLyrics") or best.get("plainLyrics")
                if isinstance(lrc, str) and lrc.strip():
                    return lrc
            return None

        # Try several strategies
        for a, t in [
            (artist, title),               # both if available
            ('', title),                   # title only
            ('', f"{artist} {title}".strip()),  # combined
            (title, artist),               # swapped
            (artist, ''),                  # artist only (rarely useful)
        ]:
            if not t:
                continue
            res = _search(a, t)
            if res:
                return res

        # Fallback to exact get
        # Try GET with track_name/artist_name keys
        r2 = requests.get(LRCLIB_GET, params={"track_name": title, "artist_name": artist}, timeout=12)
        if r2.status_code == 200:
            data = r2.json()
            lrc = data.get("syncedLyrics") or data.get("plainLyrics")
            if isinstance(lrc, str) and lrc.strip():
                return lrc
        # Fallback to legacy keys if supported
        r3 = requests.get(LRCLIB_GET, params={"track": title, "artist": artist}, timeout=12)
        if r3.status_code == 200:
            data = r3.json()
            lrc = data.get("syncedLyrics") or data.get("plainLyrics")
            if isinstance(lrc, str) and lrc.strip():
                return lrc
    except Exception:
        return None
    return None


def parse_lrc_to_words(lrc_text: str) -> List[Dict]:
    """Parse LRC into word rows using the existing capture parser for consistency.

    Output shape per row: {Lyric, WordStart_s, WordEnd_s, EventType="Lyric"}
    """
    from apps.capture.lyrics_parse import parse_lrc_to_words as base_parse
    return base_parse(lrc_text or "")
