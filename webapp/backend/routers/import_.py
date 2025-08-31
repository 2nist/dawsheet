from fastapi import APIRouter, HTTPException
from ..models.import_ import ImportRequest
from webapp.backend.io.sheets_writer import append_timeline_rows, append_guidedrums_rows, upsert_metadata, append_sections_rows
import os

router = APIRouter()

def _require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise HTTPException(status_code=500, detail=f"Missing env {name}")
    return v

@router.post("")
def do_import(req: ImportRequest):
    sa = _require_env("GOOGLE_SA_JSON")
    written = {"timeline": 0, "guidedrums": 0, "metadata": 0}

    # Lyrics → Timeline
    if req.layers.lyrics and req.apply and req.apply.lyrics:
        written["timeline"] += append_timeline_rows(req.sheet_id, req.apply.lyrics, sa)

    # Sections → Sections tab
    if req.layers.sections and req.apply and req.apply.sections:
        written["sections"] = append_sections_rows(req.sheet_id, req.apply.sections, sa)

    # Key/Mode → Metadata (placeholder)
    if req.layers.keymode and req.apply:
        # Example: upsert key/mode if provided in apply
        km = {}
        if km:
            upsert_metadata(req.sheet_id, km, sa)
            written["metadata"] += 1

    # Guide Drums → GuideDrums tab
    if req.layers.drums and req.apply and req.apply.drums:
        written["guidedrums"] += append_guidedrums_rows(req.sheet_id, req.apply.drums, sa)

    return {"ok": True, "rows_written": written}
