import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_scenarios_list():
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    assert r.json() == ["cislunar", "iss"]


def test_scenario_iss():
    r = client.get("/api/scenarios/iss")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "iss"
    assert body["onboardUserId"] == "iss:crew-lf"
    assert len(body["crew"]) == 3
    assert len(body["blocks"]) > 10


def test_scenario_unknown():
    assert client.get("/api/scenarios/mars").status_code == 404


def test_sources():
    r = client.get("/api/sources")
    assert r.status_code == 200
    sources = r.json()
    assert len(sources) >= 1
    assert all(s["url"].startswith("https://") for s in sources)
