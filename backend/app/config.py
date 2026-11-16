"""Shared configuration."""
from __future__ import annotations

import os
from pathlib import Path

# backend/data
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# --- LLM (llama.cpp server) ------------------------------------------------
# The chat endpoint proxies transcription to a llama.cpp OpenAI-compatible
# server. Both values come from the environment:
#   MATE_LLM_BASE_URL  e.g. http://localhost:8080
#   MATE_LLM_MODEL     e.g. llama-3.2-3b-instruct.Q4_K_M
#   MATE_LLM_API_KEY   API key (sent as Bearer token); empty = no auth
# When either is missing, /api/chat still works and answers with a
# deterministic stub (demo mode), so the frontend keeps working end to end.
LLM_BASE_URL = os.environ.get("MATE_LLM_BASE_URL", "").rstrip("/")
LLM_MODEL = os.environ.get("MATE_LLM_MODEL", "")
LLM_API_KEY = os.environ.get("MATE_LLM_API_KEY", "")

# Request timeout (seconds) for the LLM call.
LLM_TIMEOUT_S = float(os.environ.get("MATE_LLM_TIMEOUT_S", "120"))

# --- CORS / allowed origins -------------------------------------------------
# Comma-separated list of allowed origins; "*" allows all (local dev).
# In production, set to the Vercel URL(s), e.g. https://mate.vercel.app.
CORS_ORIGINS: list[str]
_cors_raw = os.environ.get("MATE_CORS_ORIGINS", "*")
CORS_ORIGINS = ["*"] if _cors_raw == "*" else [o.strip() for o in _cors_raw.split(",") if o.strip()]
