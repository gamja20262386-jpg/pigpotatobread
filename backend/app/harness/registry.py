"""harness.yaml에서 에이전트·flow를 읽고 에이전트 모듈을 찾는다(파일 1개 = 에이전트 1개)."""
from __future__ import annotations

import importlib
from typing import Callable

from app.tools.data import HARNESS_DIR, load_harness

MODULES = {
    "concierge": "app.agents.concierge",
    "intake": "app.agents.order.intake",
    "curator": "app.agents.order.curator",
    "bundler": "app.agents.order.bundler",
    "delivery": "app.agents.order.delivery",
    "freshness": "app.agents.care.freshness",
    "care": "app.agents.care.care",
    "stock_intake": "app.agents.merchant.stock_intake",
}


def flow_plan(flow: str) -> list[str] | None:
    return load_harness()["flows"].get(flow)


def get_agent(agent_id: str) -> Callable:
    return importlib.import_module(MODULES[agent_id]).run


def agent_card(agent_id: str) -> str:
    meta = next((a for a in load_harness()["agents"] if a["id"] == agent_id), None)
    if not meta:
        return ""
    path = HARNESS_DIR / meta["card"]
    return path.read_text(encoding="utf-8") if path.exists() else ""


def harness_view() -> dict:
    """GET /v1/harness: 이름·페르소나·팀·에이전트·flow·카드 본문만(LLM 주소·모델·가정값은 내보내지 않음)."""
    h = load_harness()
    return {"name": h["name"], "persona": h["agent_persona"], "teams": h["teams"],
            "agents": [{k: v for k, v in a.items() if k != "card"} for a in h["agents"]],
            "flows": h["flows"], "cards": {a["id"]: agent_card(a["id"]) for a in h["agents"]}}
