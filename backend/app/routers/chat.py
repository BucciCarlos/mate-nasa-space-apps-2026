"""Chat endpoint: proxies the FD30 companion conversation to a llama.cpp server.

The frontend transcribes speech locally (Whisper in the browser) and POSTs the
text here. Every request starts a fresh conversation seeded with the system
prompt, so there is no server-side session state.

Env:
    MATE_LLM_BASE_URL   OpenAI-compatible llama.cpp base URL (e.g. http://localhost:8080)
    MATE_LLM_MODEL      served model name
    MATE_LLM_API_KEY    API key, sent as Authorization: Bearer (optional)
    MATE_LLM_TIMEOUT_S  request timeout in seconds (default 120)
"""

from __future__ import annotations

import logging
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from fastapi import Request

from .. import config
from ..config import LLM_TIMEOUT_S

# Hostnames that are always allowed to call /api/chat (local dev).
_ALWAYS_ALLOWED_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _allowed_hosts() -> set[str]:
    """Hostnames allowed to call /api/chat.

    Always includes localhost/127.0.0.1. In production, also includes the
    Vercel hostname(s) from MATE_CORS_ORIGINS (e.g. https://mate.vercel.app
    → mate.vercel.app).
    """
    hosts = set(_ALWAYS_ALLOWED_HOSTS)
    for origin in config.CORS_ORIGINS:
        if origin == "*":
            # Wildcard CORS (local dev) — allow any host.
            return set()
        try:
            from urllib.parse import urlparse
            netloc = urlparse(origin).netloc
            if netloc:
                hosts.add(netloc)
        except Exception:
            pass
    return hosts

logger = logging.getLogger("mate.chat")
router = APIRouter(tags=["chat"])

SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are Sora, a calm mission companion aboard a simulated 30-day "
        "low-Earth-orbit flight. You help the astronaut review their day: "
        "planned agenda, exercise sessions, and laboratory sample workflow. "
        "Answer in the same language the user writes in, in 1-3 short sentences. "
        "Only use the context given in the user message. Never invent medical "
        "results, measurements, or status that are not present in the context. "
        "If you do not have the data, say so plainly."
    ),
    "es": (
        "Sos Sora, una compañera de misión serena a bordo de un vuelo "
        "simulado de 30 días en órbita terrestre baja. Ayudás al astronauta a "
        "revisar su día: agenda planificada, sesiones de ejercicio y el "
        "trabajo de muestras de laboratorio. Respondé en el mismo idioma en el "
        "que escribe el usuario, en 1-3 frases cortas. Usá solo el contexto que "
        "aparece en el mensaje. No inventes resultados médicos, mediciones ni "
        "estados que no estén en el contexto. Si no tenés los datos, decilo "
        "claramente."
    ),
}


class ChatRequest(BaseModel):
    text: str = Field(
        ..., min_length=1, max_length=4000, description="Transcribed user message"
    )
    lang: Literal["en", "es"] = "en"
    context: str | None = Field(
        None, max_length=8000, description="Optional scenario context (plan, receipts)"
    )


class ChatResponse(BaseModel):
    reply: str
    model: str | None = None


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request) -> ChatResponse:
    # Hostname guard: only allow requests from the same origin (production)
    # or localhost (dev). Returns 403 for any other host.
    allowed = _allowed_hosts()
    if allowed:  # empty set means wildcard CORS → allow all (local dev)
        host = request.headers.get("host", "").split(":")[0].lower()
        if host not in allowed:
            raise HTTPException(status_code=403, detail="forbidden host")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text is empty")

    system = SYSTEM_PROMPTS[req.lang]
    user = text if not req.context else f"{req.context}\n\nQuestion: {text}"
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    if not config.LLM_BASE_URL or not config.LLM_MODEL:
        # Demo mode: no LLM configured. Keeps the pipeline testable.
        logger.warning(
            "MATE_LLM_BASE_URL / MATE_LLM_MODEL not set; returning stub reply"
        )
        return ChatResponse(
            reply=f"[llama.cpp not configured] Received: “{text}”",
            model=None,
        )

    headers = (
        {"Authorization": f"Bearer {config.LLM_API_KEY}"} if config.LLM_API_KEY else {}
    )

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT_S) as client:
            r = await client.post(
                f"{config.LLM_BASE_URL}/v1/chat/completions",
                json={
                    "model": config.LLM_MODEL,
                    "messages": messages,
                    "temperature": 0.4,
                    "max_tokens": 300,
                },
                headers=headers,
            )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502, detail=f"llama.cpp unreachable: {e}"
        ) from e

    if r.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"llama.cpp error {r.status_code}: {r.text[:300]}"
        )

    try:
        data = r.json()
        reply = (data["choices"][0]["message"]["content"] or "").strip()
    except (KeyError, IndexError, ValueError) as e:
        raise HTTPException(
            status_code=502, detail=f"unexpected llama.cpp response: {e}"
        ) from e

    if not reply:
        raise HTTPException(status_code=502, detail="llama.cpp returned an empty reply")
    return ChatResponse(reply=reply, model=config.LLM_MODEL)
