"""에이전트 API: plan, chat, nudges, harness, agent-runs."""
from app.tools.data import assumptions
from conftest import PLAN_MSG, at, login


def test_plan_proposal_respects_budget_and_warns(client):
    r = client.post("/v1/agent/plan", json={"message": PLAN_MSG}, headers=at("18:00"))
    assert r.status_code == 200
    body = r.json()
    run, prop = body["run"], body["proposal"]
    assert run["flow"] == "plan_order" and run["plan"] == ["intake", "curator", "bundler", "delivery", "freshness"]
    intake = next(x for x in run["results"] if x["agent_id"] == "intake")["data"]["conditions"]
    assert intake["people"] == 4 and intake["budget"] == 50000 and intake["destination_id"] == "hamdeok"
    q = prop["quote"]
    assert q["total"] <= 50000 and q["destination"] == {"id": "hamdeok", "name": "함덕 해수욕장 숙소"}
    assert q["distance_km"] == 13.7 and q["eta_min"] > assumptions()["cold_max_transit_min"]
    assert any("권장 이동 시간" in w for w in q["warnings"])
    assert all(g["kind"] == "market" for g in q["groups"])
    assert run["summary_source"] == "template" and run["llm"]["provider"] == "off"
    types = [e["type"] for e in run["events"]]
    assert types[0] == "plan" and types[-1] == "done" and "gate" in types
    for c in run["public_claims"]:
        assert c["evidence"] and not c["blocked"]


def test_plan_substitution_via_api(client):
    body = client.post("/v1/agent/plan", json={"message": "갈치구이 2인분"}, headers=at("12:00")).json()
    assert body["proposal"]["items"] == [{"product_id": "p-32", "qty": 1}]
    assert any(c["text"].startswith("단,") for c in body["run"]["public_claims"])


def test_plan_out_of_zone_then_order_409(client):
    body = client.post("/v1/agent/plan", json={"message": "떡 2명", "destination_id": "seogwipo"}, headers=at("12:00")).json()
    q = body["proposal"]["quote"]
    assert q["in_zone"] is False
    assert any(c["level"] == "question" and "배달 범위" in c["text"] for c in body["run"]["public_claims"])
    r = client.post("/v1/orders", json={"items": body["proposal"]["items"], "destination_id": "seogwipo"}, headers=login(client, "customer"))
    assert r.status_code == 409 and "배달 범위" in r.json()["detail"]


def test_plan_validation(client):
    assert client.post("/v1/agent/plan", json={"message": ""}).status_code == 422
    assert client.post("/v1/agent/plan", json={"message": "x" * 301}).status_code == 422
    r = client.post("/v1/agent/plan", json={"message": "떡", "destination_id": "moon"})
    assert r.status_code == 400 and r.json()["detail"] == "없는 배송지예요"


def test_plan_with_mock_llm_summary(client, use_mock):
    body = client.post("/v1/agent/plan", json={"message": PLAN_MSG}, headers=at("18:00")).json()
    assert body["run"]["summary_source"] == "llm" and body["run"]["llm"]["provider"] == "mock"
    assert any(e["type"] == "llm" for e in body["run"]["events"])
    assert use_mock.calls


def test_chat_topics(client):
    r = client.post("/v1/agent/chat", json={"message": "동문 바당횟집 몇 시까지 해요?"}, headers=at("20:30")).json()
    assert r["suggest_plan"] is False
    assert any("동문 바당횟집 영업시간 10:00~21:00" in c["text"] for c in r["run"]["public_claims"])
    r = client.post("/v1/agent/chat", json={"message": "배달비는 어떻게 돼?"}).json()
    assert any("3,000원" in c["text"] for c in r["run"]["public_claims"])
    r = client.post("/v1/agent/chat", json={"message": "품절된 거 있어?"}).json()
    assert any("은갈치구이" in c["text"] for c in r["run"]["public_claims"])
    r = client.post("/v1/agent/chat", json={"message": "저녁 메뉴 추천해줘"}).json()
    assert r["suggest_plan"] is True


def test_chat_order_status_uses_my_orders(client):
    r = client.post("/v1/agent/chat", json={"message": "내 주문 어디쯤이야?"}).json()
    assert any("로그인" in c["text"] for c in r["run"]["public_claims"])
    h = login(client, "customer")
    client.post("/v1/orders", json={"items": [{"product_id": "p-35", "qty": 1}], "destination_id": "tapdong"}, headers=h)
    r = client.post("/v1/agent/chat", json={"message": "내 주문 어디쯤이야?"}, headers=h).json()
    texts = [c["text"] for c in r["run"]["public_claims"]]
    assert any("1건" in t for t in texts) and any("주문 접수" in t for t in texts)
    assert "내 주문 어디쯤이야" not in " ".join(texts)              # 질문 원문을 주장에 남기지 않는다


def test_nudges_closing_soon_sold_out_and_dismissed(client):
    cart = [{"product_id": "p-29", "qty": 1}, {"product_id": "p-31", "qty": 1}]
    r = client.post("/v1/agent/nudges", json={"cart": cart, "destination_id": "tapdong", "dismissed": []}, headers=at("20:30"))
    assert r.status_code == 200
    nudges = r.json()["nudges"]
    kinds = {n["kind"]: n for n in nudges}
    assert kinds["closing_soon"]["id"] == "closing_soon-dongmun-hoe"
    assert "30분" in kinds["closing_soon"]["body"]
    so = kinds["sold_out_in_cart"]
    assert so["action"]["type"] == "ask" and so["action"]["prompt"]
    assert r.json()["run_id"]
    dismissed = [n["id"] for n in nudges]
    again = client.post("/v1/agent/nudges", json={"cart": cart, "destination_id": "tapdong", "dismissed": dismissed}, headers=at("20:30")).json()
    assert not {n["id"] for n in again["nudges"]} & set(dismissed)


def test_nudge_ask_prompt_replans_to_substitute(client):
    cart = [{"product_id": "p-31", "qty": 1}]
    nudges = client.post("/v1/agent/nudges", json={"cart": cart}, headers=at("12:00")).json()["nudges"]
    prompt = next(n for n in nudges if n["kind"] == "sold_out_in_cart")["action"]["prompt"]
    body = client.post("/v1/agent/plan", json={"message": prompt}, headers=at("12:00")).json()
    assert body["proposal"]["items"] == [{"product_id": "p-32", "qty": 1}]


def test_nudges_meal_time_cold_far_and_order_update(client):
    h = login(client, "customer")
    client.post("/v1/orders", json={"items": [{"product_id": "p-35", "qty": 1}], "destination_id": "tapdong"}, headers=h)
    r = client.post("/v1/agent/nudges", json={"cart": [{"product_id": "p-30", "qty": 1}], "destination_id": "hamdeok"},
                    headers={**h, **at("18:00")}).json()
    kinds = {n["kind"] for n in r["nudges"]}
    assert {"meal_time", "cold_far", "order_update"} <= kinds


def test_harness_view_hides_llm_and_assumptions(client):
    h = client.get("/v1/harness").json()
    assert set(h) == {"name", "persona", "teams", "agents", "flows", "cards"}
    assert len(h["agents"]) == 9 and len(h["flows"]) == 5 and len(h["cards"]) == 9
    assert h["cards"]["curator"].startswith("# ② 메뉴 고르기")
    flat = str({k: v for k, v in h.items() if k != "cards"})        # 카드 본문은 가정 '이름'을 설명할 수 있다
    for secret in ("11434", "ax4-light", "172.20", "deadline", "base", "per_extra_stall", "want_keywords"):
        assert secret not in flat
    assert "11434" not in str(h["cards"]) and "ax4-light" not in str(h["cards"])


def test_agent_run_lookup(client):
    run_id = client.post("/v1/agent/plan", json={"message": "떡 2명"}, headers=at("12:00")).json()["run"]["run_id"]
    r = client.get(f"/v1/agent-runs/{run_id}")
    assert r.status_code == 200 and r.json()["run_id"] == run_id and r.json()["flow"] == "plan_order"
    from app.harness import trace
    trace._RECENT.pop(run_id)                       # 메모리에서 빠져도 DB에서 읽는다
    assert client.get(f"/v1/agent-runs/{run_id}").json()["run_id"] == run_id
    assert client.get("/v1/agent-runs/nope").status_code == 404
