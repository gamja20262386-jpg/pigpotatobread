"""게이트(evidence/wording/privacy)와 지휘 AI 요약(1회 재요청 → 템플릿), run_flow는 예외를 내지 않는다."""
from app.contracts import Claim, Evidence
from app.harness.gates import apply_gates, check_summary
from app.harness.runner import run_flow
from app.llm.mock import MockProvider
from conftest import PLAN_MSG, ctx_at

INPUT = Evidence(kind="input", ref="message")


def C(text, *ev, level="fact"):
    return Claim(agent_id="t", text=text, level=level, evidence=list(ev))


def blocked(c):
    public, n = apply_gates([c])
    return n == 1 and not public and c.blocked and c.block_reasons


def test_number_without_qualifying_evidence_blocked():
    assert blocked(C("배송비는 3,500원이에요", Evidence(kind="llm", ref="m")))
    assert blocked(C("배송비는 3,500원이에요"))                      # 근거 없음
    assert blocked(C("다섯 명이 먹어요", Evidence(kind="llm", ref="m")))   # 한글 수 표현도 숫자


def test_forbidden_and_assertive_phrases_blocked():
    c = C("회는 무조건 신선하게 가요", INPUT)
    assert blocked(c) and any("금지 표현" in r for r in c.block_reasons)
    c = C("이 상품은 100% 안전해요", INPUT)
    assert blocked(c) and any("100% 안전" in r for r in c.block_reasons)
    assert blocked(C("반드시 30분 안에 가요", INPUT))


def test_privacy_shapes_blocked():
    c = C("사장님 번호는 010-1234-5678이에요", INPUT)
    assert blocked(c) and any("전화번호" in r for r in c.block_reasons)
    assert blocked(C("메일은 boss@example.com", INPUT))


def test_unknown_dataset_and_estimate_without_calc_blocked():
    assert blocked(C("재고 3개", Evidence(kind="dataset", ref="nope")))
    assert blocked(C("도착 예상 30분", INPUT, level="estimate"))


def test_good_claim_passes():
    c = C("배송비 3,000원", Evidence(kind="assumption", ref="market_bundle_fee"))
    public, n = apply_gates([c])
    assert public == [c] and n == 0 and not c.blocked


def test_check_summary_rejects_number_not_in_claims():
    claims = [C("배송비 3,000원", INPUT)]
    assert check_summary("배송비는 3,000원이에요", claims) == []
    assert any("9999" in r for r in check_summary("배송비는 9,999원이에요", claims))


def test_llm_summary_with_invented_number_retries_once_then_template():
    mock = MockProvider(reply_fn=lambda s, u, sc: {"summary": "총 99,999원이고 7분 뒤 도착해요"} if sc and "summary" in sc["properties"]
                        else {k: ([] if v["type"] == "array" else 0 if v["type"] == "integer" else "") for k, v in sc["properties"].items()})
    r = run_flow("plan_order", ctx_at("18:00", message=PLAN_MSG), llm=mock)
    assert r.summary_source == "template"
    assert "99,999" not in r.summary
    summary_calls = [c for c in mock.calls if c[2] and "summary" in c[2]["properties"]]
    assert len(summary_calls) == 2                       # 첫 요청 + 재요청 1회
    gate_events = [e for e in r.events if e.type == "gate" and e.payload.get("target") == "summary"]
    assert [e.payload["passed"] for e in gate_events] == [False, False]


def test_llm_summary_passes_when_numbers_come_from_claims():
    r = run_flow("plan_order", ctx_at("18:00", message=PLAN_MSG), llm=MockProvider())
    assert r.summary_source == "llm"
    assert r.llm["provider"] == "mock" and r.llm["available"]
    assert any(e.type == "llm" for e in r.events)


def test_llm_summary_forbidden_phrase_retry_then_ok():
    replies = iter(["회는 무조건 신선해요", "냉장 품목은 보냉 포장으로 보내요"])
    mock = MockProvider(reply_fn=lambda s, u, sc: {"summary": next(replies)} if sc and "summary" in sc["properties"] else {})
    r = run_flow("cart_check", ctx_at("18:00", items=[{"product_id": "p-30", "qty": 1}]), llm=mock)
    assert r.summary_source == "llm" and r.summary == "냉장 품목은 보냉 포장으로 보내요"


def test_llm_failure_falls_back_and_circuit_breaks():
    mock = MockProvider(fail=True)
    r = run_flow("plan_order", ctx_at("18:00", message="갈치구이 2인분"), llm=mock)
    assert r.summary_source == "template" and r.llm["available"] is False
    assert len(mock.calls) == 1                          # 첫 실패 뒤 나머지 LLM 호출은 건너뜀
    assert all(res.ok for res in r.results)


def test_run_flow_never_raises():
    r = run_flow("no_such_flow", {})
    assert r.plan == [] and r.summary_source == "template"
    assert any(e.type == "error" for e in r.events)
    r = run_flow("cart_check", {"items": [{"product_id": "없는상품", "qty": 1}]})
    assert r.results[0].ok is False and r.summary
