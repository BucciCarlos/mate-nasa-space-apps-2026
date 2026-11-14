"""M.A.T.E. backend — FastAPI app.

Single source of truth for the scenario/source data that the frontend
previously shipped inside the bundle (frontend/src/data/*.json).

Run:
    uvicorn app.main:app --reload --port 8002
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routers import data as data_router

# Static build of the frontend (emitted by `pnpm build` in frontend/).
# Present in production (Vercel) and after a local build; absent in dev.
STATIC_DIR = Path(__file__).resolve().parent / "static"

# Comma-separated list of allowed origins; "*" allows all (local dev).
_cors_raw = os.environ.get("MATE_CORS_ORIGINS", "*")
CORS_ORIGINS = ["*"] if _cors_raw == "*" else [o.strip() for o in _cors_raw.split(",") if o.strip()]

app = FastAPI(
    title="M.A.T.E. backend",
    description="Serves the M.A.T.E. scenario and source data (NASA Space Apps 2026, Team Sora).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(data_router.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# SPA fallback: serve the frontend build if it exists.
# Static assets first, then a catch-all that returns index.html for any
# non-API route so client-side routing works on refresh.
# ---------------------------------------------------------------------------
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{ruta:path}")
    def spa_fallback(ruta: str) -> FileResponse:
        # Never shadow the API.
        if ruta.startswith("api/"):
            raise HTTPException(status_code=404, detail="not found")
        index = STATIC_DIR / "index.html"
        if not index.is_file():
            raise HTTPException(status_code=404, detail="frontend build not found")
        return FileResponse(index)
