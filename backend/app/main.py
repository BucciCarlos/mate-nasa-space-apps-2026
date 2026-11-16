"""M.A.T.E. backend — FastAPI app.

Single source of truth for the scenario/source data that the frontend
previously shipped inside the bundle (frontend/src/data/*.json).

Run:
    uvicorn app.main:app --reload --port 8002
"""
from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Load .env from the repo root (one level above backend/) BEFORE importing the
# routers: config.py reads os.environ at import time, so the variables must be
# in place first. uvicorn is started with cwd=backend/, so the root .env is
# never picked up automatically. Existing env vars (e.g. set by Vercel) win.
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from . import config  # noqa: E402
from .routers import data as data_router  # noqa: E402
from .routers import chat as chat_router  # noqa: E402

# Static build of the frontend (emitted by `pnpm build` in frontend/).
# Present in production (Vercel) and after a local build; absent in dev.
STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(
    title="M.A.T.E. backend",
    description="Serves the M.A.T.E. scenario and source data (NASA Space Apps 2026, Team Sora).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# API routers — registered BEFORE the SPA catch-all so FastAPI matches them
# first. The catch-all is GET-only; if it came before the routers, a
# POST /api/chat would hit the fallback and return 405 (Method Not Allowed)
# instead of reaching the chat endpoint.
# ---------------------------------------------------------------------------
app.include_router(data_router.router, prefix="/api")
app.include_router(chat_router.router, prefix="/api")


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
