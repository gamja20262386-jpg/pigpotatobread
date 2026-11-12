"""모든 flow가 LLM 꺼짐 / MockProvider / 실패하는 LLM에서 예외 없이 끝까지 돈다."""
import pytest

from app.harness.runner import run_flow
from app.llm.mock import MockProvider
from conftest import PLAN_MSG, ctx_at

CTX = {
    "plan_order": {"message": PLAN_MSG},
    "cart_check": {"items": [{"product_id": "p-30", "qty": 1}, {"product_id": "p-3", "qty": 2}], "destination_id": "hamdeok"},
    "assistant_chat": {"message": "배달비랑 영업시간 알려줘"},
    "care_nudges": {"cart": [{"product_id": "p-31", "qty": 1}], "dismissed": []},
    "stock_intake": {"message": "고등어회 3개 더 들어왔어, 2만 6천원으로", "store_id": "dongmun-hoe"},
}
LLMS = {"off": lambda: None, "mock": MockProvider, "fail": lambda: MockProvider(fail=True)}


@pytest.mark.parametrize("llm_kind", list(LLMS))
@pytest.mark.parametrize("flow", list(CTX))
def test_every_flow_runs(flow, llm_kind):
    llm = LLMS[llm_kind]()
    r = run_flow(flow, ctx_at("18:00", **CTX[flow]), llm=llm)
    assert r.flow == flow and r.plan and all(res.ok for res in r.results), [res.error for res in r.results]
    assert r.public_claims and r.blocked_count == 0, [c.block_reasons for res in r.results for c in res.claims if c.blocked]
    assert r.summary
    assert r.summary_source == ("llm" if llm_kind == "mock" else "template")
    assert r.llm["provider"] == {"off": "off", "mock": "mock", "fail": "mock"}[llm_kind]
    assert [e.seq for e in r.events] == list(range(1, len(r.events) + 1))
    for c in r.public_claims:
        assert c.evidence


def test_llm_flows_policy_keeps_cart_and_nudges_rule_only(monkeypatch):
    from app.harness import runner
    monkeypatch.setattr(runner, "get_provider", lambda: MockProvider())
    cart = run_flow("cart_check", ctx_at("18:00", **CTX["cart_check"]))
    nudges = run_flow("care_nudges", ctx_at("18:00", **CTX["care_nudges"]))
    plan = run_flow("plan_order", ctx_at("18:00", **CTX["plan_order"]))
    assert cart.llm["provider"] == "off" and cart.summary_source == "template"
    assert nudges.llm["provider"] == "off"
    assert plan.llm["provider"] == "mock" and plan.summary_source == "llm"
