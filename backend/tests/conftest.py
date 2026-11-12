import os

# app import 전에: 테스트는 네트워크(LLM)와 파일 DB를 건드리지 않는다. LLM은 테스트가 MockProvider를 넣을 때만.
os.environ["LLM_PROVIDER"] = "off"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ.setdefault("JWT_SECRET", "test-only-secret-test-only-secret-1234")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.db.models import Base
from app.db.seed import seed
from app.db.session import get_session, make_engine
from app.harness import runner
from app.main import app
from app.tools.clock import now_kst

PLAN_MSG = "4명이서 저녁, 회랑 흑돼지, 5만원 이하, 함덕 숙소로"


def at(hhmm: str) -> dict:
    return {"X-Demo-Time": hhmm}


@pytest.fixture
def client():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    with Session() as s:
        seed(s)

    def override():
        with Session() as s:
            yield s

    app.dependency_overrides[get_session] = override
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def use_mock(monkeypatch):
    """API 경로의 run_flow가 MockProvider를 쓰게 한다. 돌려준 객체로 호출 기록을 본다."""
    from app.llm.mock import MockProvider
    mock = MockProvider()
    monkeypatch.setattr(runner, "get_provider", lambda: mock)
    return mock


def login(client, role: str) -> dict:
    r = client.post("/v1/auth/demo", json={"role": role})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def ctx_at(hhmm: str, **kw) -> dict:
    return {"now": now_kst(hhmm), **kw}
