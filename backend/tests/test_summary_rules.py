"""제안 흐름 요약 규칙: '주문했다'고 쓰면 거절, 품절 대체·신선 경고·범위 밖은 요약에서 빠지지 않는다."""
from app.harness.runner import run_flow
from app.llm.mock import MockProvider
from conftest import PLAN_MSG, ctx_at


def _llm(summary: str) -> MockProvider:
    return MockProvider(reply_fn=lambda system, user, schema: {"summary": summary})


def test_substitution_is_appended_when_llm_omits_it():
    r = run_flow("plan_order", ctx_at("18:00", message="갈치구이 2인분 탑동으로"), llm=_llm("고등어구이를 골랐어요."))
    assert r.summary_source == "llm"
    assert r.summary.startswith("고등어구이를 골랐어요.")
    assert "단, 은갈치구이는 품절이라 고등어구이로 바꿨어요" in r.summary


def test_freshness_warning_is_kept_in_summary():
    r = run_flow("plan_order", ctx_at("18:00", message=PLAN_MSG), llm=_llm("회와 흑돼지를 골랐어요."))
    warning = next(c.text for c in r.public_claims if c.agent_id == "freshness" and c.level == "estimate")
    assert warning in r.summary


def test_out_of_zone_is_kept_in_summary():
    r = run_flow("plan_order", ctx_at("18:00", message="서귀포 숙소로 오메기떡 보내줘"), llm=_llm("오메기떡을 골랐어요."))
    zone = next(c.text for c in r.public_claims if c.agent_id == "delivery" and c.level == "question")
    assert zone in r.summary


def test_saying_ordered_is_rejected_then_template():
    llm = _llm("고등어구이를 주문했어요.")
    r = run_flow("plan_order", ctx_at("18:00", message="갈치구이 2인분 탑동으로"), llm=llm)
    assert r.summary_source == "template"
    assert "주문했" not in r.summary
    assert "단, 은갈치구이는 품절이라 고등어구이로 바꿨어요" in r.summary
    summary_calls = [c for c in llm.calls if '"summary"' in c[0]]
    assert len(summary_calls) == 2      # 첫 시도 + 재요청 1회


def test_template_for_plan_without_warnings_is_short():
    r = run_flow("plan_order", ctx_at("18:00", message="오메기떡 탑동으로"), llm=None)
    assert r.summary == "하르방이 장바구니를 짜 봤어요."


def test_closed_hours_says_when_to_order_not_budget():
    r = run_flow("plan_order", ctx_at("00:40", message="갈치구이 2인분 탑동으로"), llm=None)
    texts = [c.text for c in r.public_claims]
    assert any("지금 문 연 가게가 없어 담지 못했어요. 10:00부터 주문할 수 있어요" in t for t in texts), texts
    assert not any("예산이나 메뉴를 바꿔" in t for t in texts)
    assert "10:00부터 주문할 수 있어요" in r.summary


def test_closed_market_without_wants():
    r = run_flow("plan_order", ctx_at("00:40", message="아무거나 추천해줘"), llm=None)
    assert any("지금은 문 연 시장 가게가 없어요. 동문시장은 08:00부터 열어요" == c.text for c in r.public_claims)


def test_paraphrased_key_sentence_is_not_duplicated():
    llm = _llm("현재 갈치는 문 연 가게가 없어 담지 못했어요. 10:00부터 주문할 수 있어요. 탑동 호텔가까지 직선거리는 0.8km입니다.")
    r = run_flow("plan_order", ctx_at("00:40", message="갈치구이 2인분 탑동으로"), llm=llm)
    assert r.summary_source == "llm"
    assert r.summary.count("10:00부터") == 1, r.summary
    assert "탑동 호텔가까지 직선거리는 0.8km입니다." in r.summary


def test_message_destination_wins_over_app_destination():
    r = run_flow("plan_order", ctx_at("18:00", message="서귀포로 2명 흑돼지 5만원", destination_id="tapdong"), llm=None)
    dest = next(x for x in r.results if x.agent_id == "delivery").data["destination"]
    assert dest["id"] == "seogwipo"
    assert any("배달 범위" in c.text for c in r.public_claims)


def test_llm_errors_do_not_leak_server_url():
    class Boom:
        name, model, deadline_s = "ollama", "m", 20
        def chat(self, system, user, schema=None):
            raise RuntimeError("Client error for url 'http://172.20.32.1:11434/api/chat'")
    r = run_flow("plan_order", ctx_at("18:00", message="오메기떡 탑동으로"), llm=Boom())
    assert "11434" not in r.model_dump_json()


def test_llm_time_budget_skips_remaining_calls():
    import time as _t
    from app.llm.base import LLMReply
    class Slow:
        name, model, deadline_s = "ollama", "m", 0.02
        calls = 0
        def chat(self, system, user, schema=None):
            Slow.calls += 1
            _t.sleep(0.04)
            return LLMReply(text="", data={"summary": "골랐어요."}, model="m", ms=40)
    r = run_flow("plan_order", ctx_at("18:00", message="흑돼지 좀 골라줘"), llm=Slow())
    assert Slow.calls == 1          # 첫 호출로 예산(0.03초)을 다 써서 나머지는 건너뜀
    assert any(e.type == "llm" and e.payload.get("error") == "시간 예산을 다 써서 건너뜀" for e in r.events)
