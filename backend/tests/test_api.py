import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402
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


def test_evidence_list():
    r = client.get("/api/evidence")
    assert r.status_code == 200
    assert r.json() == ["labs", "radiation", "sleep"]


def test_evidence_labs():
    r = client.get("/api/evidence/labs")
    assert r.status_code == 200
    body = r.json()
    assert body["sourceIds"] == ["osdr-osd-575", "osdr-osd-569"]
    assert len(body["analytes"]) >= 5
    assert body["accessedAt"]


def test_evidence_radiation():
    r = client.get("/api/evidence/radiation")
    assert r.status_code == 200
    body = r.json()
    assert body["sourceId"] == "cdaweb-iss-tepc"
    assert body["unit"] == "uGy/min"
    assert len(body["points"]) > 0


def test_evidence_sleep():
    r = client.get("/api/evidence/sleep")
    assert r.status_code == 200
    body = r.json()
    assert body["sourceId"] == "barger-2014"
    assert len(body["groups"]) >= 4


def test_evidence_unknown():
    assert client.get("/api/evidence/co2").status_code == 404


def test_chat_empty_text():
    r = client.post("/api/chat", json={"text": "   "})
    assert r.status_code == 422


def test_chat_stub_without_llm(monkeypatch):
    from app import config
    monkeypatch.setattr(config, "LLM_BASE_URL", "")
    monkeypatch.setattr(config, "LLM_MODEL", "")
    r = client.post("/api/chat", json={"text": "What is on my agenda?", "lang": "en"})
    assert r.status_code == 200
    body = r.json()
    assert body["model"] is None
    assert "What is on my agenda?" in body["reply"]


def test_chat_llm_call(monkeypatch):
    from app import config

    class FakeClient:
        def __init__(self, timeout=None):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, json=None, headers=None):
            assert url == "http://llm.test/v1/chat/completions"
            assert json["model"] == "test-model"
            assert json["messages"][0]["role"] == "system"
            assert json["messages"][1]["content"].endswith("Hola")
            return type("R", (), {"status_code": 200, "json": staticmethod(lambda: {"choices": [{"message": {"content": "  Todo bien  "}}]}), "text": ""})()

    monkeypatch.setattr(config, "LLM_BASE_URL", "http://llm.test")
    monkeypatch.setattr(config, "LLM_MODEL", "test-model")
    monkeypatch.setattr(httpx, "AsyncClient", lambda timeout=None: FakeClient(timeout))

    r = client.post("/api/chat", json={"text": "Hola", "lang": "es", "context": "Contexto del día"})
    assert r.status_code == 200
    body = r.json()
    assert body["reply"] == "Todo bien"
    assert body["model"] == "test-model"
