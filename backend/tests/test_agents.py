"""에이전트 카드대로 동작하는지(DB 없이 시드 카탈로그로)."""
from app.agents.order import intake
from app.harness.runner import run_flow
from app.llm.mock import MockProvider
from app.tools.data import assumptions, seed_catalog
from conftest import PLAN_MSG, ctx_at


def agent(run, agent_id):
    return next(r for r in run.results if r.agent_id == agent_id)


def texts(run, agent_id):
    return [c.text for c in agent(run, agent_id).claims]


def test_intake_rules_extract_conditions():
    cond = intake.run({"message": PLAN_MSG}).data["conditions"]
    assert cond["people"] == 4 and cond["budget"] == 50000
    assert {"회", "흑돼지"} <= set(cond["wants"])
    assert cond["destination_id"] == "hamdeok" and cond["when"] == "dinner"


def test_intake_excludes_korean_numbers_and_app_destination():
    cond = intake.run({"message": "둘이서 점심, 해산물 빼고 흑돼지랑 떡", "destination_id": "aewol"}).data["conditions"]
    assert cond["people"] == 2 and cond["when"] == "lunch"
    assert cond["excludes"] == ["해산물"] and "해산물" not in cond["wants"]
    assert cond["wants"] == ["흑돼지", "떡"] and cond["destination_id"] == "aewol"
    assert intake.run({"message": "세 명이 먹을 오메기떡"}).data["conditions"]["wants"] == ["오메기떡"]


def test_intake_default_people_is_assumption_claim():
    res = intake.run({"message": "막걸리 안주 추천"})
    assert res.data["conditions"]["people"] == assumptions()["default_people"]
    assert any(c.level == "assumption" and c.evidence[-1].ref == "default_people" for c in res.claims)


def test_intake_llm_fills_only_empty_fields_and_must_appear_in_text():
    seen = {}

    def reply(system, user, schema):
        seen["user"] = user
        return {"people": 9, "budget": 30000, "wants": ["갈치", "피자"], "excludes": [], "destination": "공항", "when": "dinner"}

    res = intake.run({"message": "우리 셋이 갈치 먹고 싶어 3만원 정도"}, MockProvider(reply_fn=reply))
    c = res.data["conditions"]
    assert c["people"] == 3 and res.data["sources"]["people"] == "rule"       # 규칙 값은 LLM이 덮지 않음
    assert c["budget"] == 30000 and c["wants"] == ["갈치"]
    assert c["destination_id"] is None and c["when"] is None                   # 원문에 없는 '공항', '저녁'은 버림
    assert set(res.data["dropped"]) >= {"destination", "when"}
    assert res.used_llm


def test_intake_llm_value_accepted_with_llm_evidence():
    res = intake.run({"message": "고등어 먹을래"}, MockProvider(reply_fn=lambda s, u, sc: {
        "people": 0, "budget": 0, "wants": [], "excludes": [], "destination": "", "when": ""}))
    assert res.data["conditions"]["wants"] == ["고등어"]
    res = intake.run({"message": "구이 먹을래"}, MockProvider(reply_fn=lambda s, u, sc: {
        "people": 0, "budget": 0, "wants": ["구이"], "excludes": [], "destination": "", "when": ""}))
    assert res.data["conditions"]["wants"] == ["구이"] and res.data["sources"]["wants"] == "llm"
    want_claim = next(c for c in res.claims if c.text.startswith("원하는 메뉴"))
    assert any(e.kind == "llm" and e.label == "말에서 추출(확인 필요)" for e in want_claim.evidence)


def test_plan_order_covers_wants_within_budget_and_warns_freshness():
    run = run_flow("plan_order", ctx_at("18:00", message=PLAN_MSG))
    cat = seed_catalog()
    cur = agent(run, "curator").data
    picked = [cat["products"][x["product_id"]] for x in cur["proposal"]]
    assert all(cat["stores"][p["store_id"]]["kind"] == "market" for p in picked)
    assert any({"회"} & set(p["tags"]) for p in picked) and any("흑돼지" in p["tags"] for p in picked)
    from app.tools.calc import quote
    q = quote(cur["proposal"], cat, "hamdeok")
    assert q["total"] <= 50000 and cur["unmet"] == []
    d = agent(run, "delivery").data
    assert d["distance_km"] == 13.7 and d["eta_min"] > assumptions()["cold_max_transit_min"]
    assert agent(run, "freshness").data["warning"] is True
    assert any("권장 이동 시간" in t for t in texts(run, "freshness"))
    assert run.blocked_count == 0 and run.summary_source == "template"


def test_curator_drops_and_reports_unmet_when_budget_too_small():
    run = run_flow("plan_order", ctx_at("18:00", message="4명이서 회랑 흑돼지, 2만원 이하, 탑동"))
    cur = agent(run, "curator").data
    from app.tools.calc import quote
    q = quote(cur["proposal"], seed_catalog(), "tapdong")
    assert q["total"] <= 20000
    assert cur["unmet"]
    assert any(c.level == "question" for c in agent(run, "curator").claims)


def test_sold_out_substitution_claim_starts_with_dan():
    run = run_flow("plan_order", ctx_at("12:00", message="갈치구이 2인분"))
    cur = agent(run, "curator").data
    assert cur["proposal"] == [{"product_id": "p-32", "qty": 1}]
    assert cur["substitutions"][0]["wanted"].startswith("은갈치구이") and cur["substitutions"][0]["chosen"].startswith("고등어구이")
    dan = [c for c in run.public_claims if c.text.startswith("단,")]
    assert dan and "고등어구이" in dan[0].text


def test_closed_store_not_proposed():
    run = run_flow("plan_order", ctx_at("06:00", message="흑돼지 2명"))
    assert agent(run, "curator").data["proposal"] == []
    assert any(c.level == "question" for c in agent(run, "curator").claims)


def test_out_of_zone_destination_is_question():
    run = run_flow("plan_order", ctx_at("12:00", message="떡 2명 서귀포로"))
    d = agent(run, "delivery").data
    assert d["in_zone"] is False
    assert any(c.level == "question" and "배달 범위" in c.text for c in agent(run, "delivery").claims)


def test_bundler_groups_bags_and_restaurants():
    items = [{"product_id": "p-30", "qty": 1}, {"product_id": "p-22", "qty": 2}, {"product_id": "p-35", "qty": 1},
             {"product_id": "p-3", "qty": 1}]
    run = run_flow("cart_check", ctx_at("18:00", items=items, destination_id="tapdong"))
    b = agent(run, "bundler").data
    assert b["market_stalls"] == 3
    assert [x["temp"] for x in b["bags"]] == ["cold", "hot", "room"]
    assert any("동문시장 3곳" in t for t in texts(run, "bundler"))
    assert any("맛집 1곳" in t for t in texts(run, "bundler"))
    f = agent(run, "delivery").data["fees"]
    assert f == {"market": 4000, "restaurants": 2000, "total": 6000}


def test_stock_intake_rules():
    from app.agents.merchant import stock_intake
    res = stock_intake.run({"message": "고등어회 3개 더 들어왔어, 2만 6천원으로", "store_id": "dongmun-hoe"})
    (ch,) = res.data["changes"]
    assert ch["product_id"] == "p-29" and ch["before"] == {"price": 28000, "stock": 4}
    assert ch["after"] == {"stock": 7, "price": 26000}
    res = stock_intake.run({"message": "딱새우 다 팔렸어", "store_id": "dongmun-hoe"})
    assert res.data["changes"][0]["after"] == {"stock": 0}
    res = stock_intake.run({"message": "모둠회 5개 남았어", "store_id": "dongmun-hoe"})
    assert res.data["changes"][0]["after"] == {"stock": 5}
    res = stock_intake.run({"message": "고등어구이 3개 더", "store_id": "dongmun-hoe"})
    assert res.data["changes"] == [] and any("다른 가게" in c.text for c in res.claims)


def test_concierge_topics():
    from app.agents import concierge
    assert concierge.find_topics("시장 몇 시까지 해요?") == ["hours"]
    assert concierge.find_topics("배달비 어떻게 계산돼?") == ["fee"]
    assert concierge.find_topics("품절된 거 뭐야") == ["soldout"]
    res = concierge.run(ctx_at("12:00", message="저녁 메뉴 추천해줘"))
    assert res.data["suggest_plan"] is True
    res = concierge.run(ctx_at("12:00", message="오늘 날씨 어때"), MockProvider(reply_fn=lambda s, u, sc: {"topic": "none"}))
    assert res.data["topics"] == [] and res.claims[0].level == "question"
    res = concierge.run(ctx_at("12:00", message="그거 아직 있나요?"), MockProvider(reply_fn=lambda s, u, sc: {"topic": "soldout"}))
    assert res.data["topics"] == ["soldout"]
