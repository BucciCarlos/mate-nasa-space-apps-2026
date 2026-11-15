"""Data endpoints: scenarios and sources."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from ..config import DATA_DIR

router = APIRouter(tags=["data"])

_SCENARIOS = {"iss": "iss.json", "cislunar": "cislunar.json"}


def _load(name: str) -> str:
    path = DATA_DIR / name
    if not path.is_file():
        raise HTTPException(status_code=500, detail=f"missing data file: {name}")
    return path.read_text(encoding="utf-8")


@router.get("/scenarios")
def list_scenarios() -> list[str]:
    return sorted(_SCENARIOS)


@router.get("/scenarios/{mission_id}")
def get_scenario(mission_id: str) -> dict:
    try:
        filename = _SCENARIOS[mission_id]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"unknown mission: {mission_id}")
    return json.loads(_load(filename))


@router.get("/sources")
def list_sources() -> list[dict]:
    return json.loads(_load("sources.json"))


@router.get("/fd30")
def get_fd30() -> dict:
    """FD30 visual-cut fixture (IMP02+IMP03+IMP04): clock, wake, rest, exercise, lab."""
    return json.loads(_load("fd30.json"))
