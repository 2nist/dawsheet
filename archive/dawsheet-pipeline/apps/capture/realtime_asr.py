from __future__ import annotations
from typing import Dict, Any, List

# Stub realtime ASR. Wire faster-whisper or WhisperLive here when ready.
class RealtimeASR:
    def __init__(self, cfg: Dict[str, Any]):
        self.cfg = cfg
        self.running = False

    def start(self):
        self.running = True
        print("[ASR] realtime ASR started (stub)")

    def stop(self):
        self.running = False
        print("[ASR] realtime ASR stopped")
