"""헬스·카탈로그·시장·인증·개인화 API."""
from conftest import at, login


def test_health_reports_llm_off(client):
    r = client.get("/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "llm": {"provider": "off", "model": "", "available": False}}


def test_categories_and_market(client):
    cats = client.get("/v1/catalog/categories").json()["categories"]
    assert len(cats) == 11 and cats[0]["id"] == "japanese"
    m = client.get("/v1/market").json()["market"]
    assert m["hub"]["id"] == "hub" and len(m["destinations"]) == 6


def test_stores_open_state_follows_demo_time(client):
    stores = client.get("/v1/catalog/stores", params={"kind": "market"}, headers=at("20:30")).json()["stores"]
    assert len(stores) == 12 and all(s["kind"] == "market" for s in stores)
    hoe = next(s for s in stores if s["id"] == "dongmun-hoe")
    assert hoe["is_open"] is True and hoe["closes_in_min"] == 30
    omegi = next(s for s in stores if s["id"] == "omegi")
    assert omegi["is_open"] is False and omegi["closes_in_min"] is None
    pork = client.get("/v1/catalog/stores", params={"category": "pork"}).json()["stores"]
    assert [s["id"] for s in pork] == ["store-2"]


def test_bad_demo_time_is_korean_400(client):
    r = client.get("/v1/catalog/stores", headers=at("8pm"))
    assert r.status_code == 400 and "HH:MM" in r.json()["detail"]


def test_store_detail_and_404(client):
    r = client.get("/v1/catalog/stores/galchi-house", headers=at("12:00")).json()
    assert r["store"]["is_open"] and {p["id"] for p in r["products"]} == {"p-31", "p-32"}
    p31 = next(p for p in r["products"] if p["id"] == "p-31")
    assert p31["sold_out"] is True and p31["store_name"] == "은갈치 구이집"
    r = client.get("/v1/catalog/stores/nope")
    assert r.status_code == 404 and r.json()["detail"] == "가게를 찾을 수 없어요"


def test_product_search(client):
    ids = {p["id"] for p in client.get("/v1/catalog/products", params={"q": "갈치"}).json()["products"]}
    assert {"p-31"} <= ids                                      # 이름
    ids = {p["id"] for p in client.get("/v1/catalog/products", params={"q": "동문 바당횟집"}).json()["products"]}
    assert ids == {"p-28", "p-29", "p-30"}                      # 가게명
    tagged = client.get("/v1/catalog/products", params={"tag": "오메기떡"}).json()["products"]
    assert {p["id"] for p in tagged} == {"p-35", "p-36"}
    assert len(client.get("/v1/catalog/products").json()["products"]) == 40


def test_unknown_route_detail_is_korean(client):
    r = client.get("/v1/nope")
    assert r.status_code == 404 and r.json() == {"detail": "찾을 수 없어요"}


def test_demo_login_roles(client):
    me = client.get("/v1/me", headers=login(client, "merchant")).json()["user"]
    assert me["role"] == "merchant" and me["store_id"] == "dongmun-hoe"
    me = client.get("/v1/me", headers=login(client, "customer")).json()["user"]
    assert me["role"] == "customer" and me["store_id"] is None
    assert client.get("/v1/me").status_code == 401
    assert client.get("/v1/me", headers={"Authorization": "Bearer nope"}).json()["detail"] == "로그인이 필요해요"


def test_signup_login_and_duplicates(client):
    body = {"name": "여행자", "email": "Trip@Example.com", "password": "password123"}
    r = client.post("/v1/auth/signup", json=body)
    assert r.status_code == 200 and r.json()["user"]["email"] == "trip@example.com"
    assert client.post("/v1/auth/signup", json=body).status_code == 409
    assert client.post("/v1/auth/signup", json={**body, "email": "a@b.co", "password": "short"}).status_code == 422
    assert client.post("/v1/auth/login", json={"email": "trip@example.com", "password": "wrongpass1"}).status_code == 401
    r = client.post("/v1/auth/login", json={"email": "trip@example.com", "password": "password123"})
    assert r.status_code == 200 and r.json()["token"]
    assert client.post("/v1/auth/login", json={"email": "ghost@example.com", "password": "password123"}).status_code == 401


def test_password_is_hashed(client):
    client.post("/v1/auth/signup", json={"name": "a", "email": "h@example.com", "password": "password123"})
    from app.db.models import User
    from app.db.session import get_session
    from app.main import app
    gen = app.dependency_overrides[get_session]()
    s = next(gen)
    u = s.query(User).filter_by(email="h@example.com").one()
    gen.close()
    assert "password123" not in u.password_hash and "$" in u.password_hash


def test_prefs_update(client):
    h = login(client, "customer")
    r = client.patch("/v1/me/prefs", json={"destination_id": "hamdeok", "likes": ["회", "회", " 떡 "]}, headers=h)
    assert r.status_code == 200 and r.json()["user"]["prefs"] == {"destination_id": "hamdeok", "likes": ["회", "떡"]}
    assert client.patch("/v1/me/prefs", json={"destination_id": "moon"}, headers=h).status_code == 400
    assert client.get("/v1/me", headers=h).json()["user"]["prefs"]["destination_id"] == "hamdeok"


def test_harness_agents_have_numbers(client):
    agents = client.get("/v1/harness").json()["agents"]
    assert [a["no"] for a in agents] == list(range(9))      # YAML 'no' 키가 false로 읽히지 않음
    assert all("false" not in a and False not in a for a in agents)


def test_market_exposes_delivery_rules_only(client):
    m = client.get("/v1/market").json()["market"]
    assert m["bundle_fee"] == {"base": 3000, "per_extra_stall": 500, "max": 5000}
    assert m["delivery_radius_km"] == 25
    assert "cold_max_transit_min" not in m
