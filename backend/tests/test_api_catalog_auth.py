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
    assert {s["id"] for s in pork} == {"store-2", "store-13", "store-14"} and all(s["category"] == "pork" for s in pork)


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
    import json, pathlib
    seeded = json.loads((pathlib.Path(__file__).resolve().parents[2] / "data" / "products.json").read_text(encoding="utf-8"))
    assert len(client.get("/v1/catalog/products").json()["products"]) == len(seeded)   # 시드 데이터 전부


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


def test_store_list_sort_filter_and_delivery_info(client):
    h = {"X-Demo-Time": "18:30"}
    stores = client.get("/v1/catalog/stores?category=market&sort=fast&destination_id=hamdeok", headers=h).json()
    assert stores["destination"]["id"] == "hamdeok"
    lst = stores["stores"]
    assert all({"eta_min", "delivery_tip", "distance_km", "min_order", "pickup", "image"} <= set(s) for s in lst)
    assert all(s["delivery_tip"] == 3000 and s["distance_km"] == 13.7 for s in lst)     # 시장 가게는 집하장 출발
    open_etas = [s["eta_min"] for s in lst if s["is_open"]]
    assert open_etas == sorted(open_etas)
    rating = [s["rating"] for s in client.get("/v1/catalog/stores?sort=rating", headers=h).json()["stores"]]
    assert rating == sorted(rating, reverse=True)
    closed = client.get("/v1/catalog/stores?open_only=true", headers={"X-Demo-Time": "07:30"}).json()["stores"]
    assert closed and all(s["is_open"] for s in closed)
    assert client.get("/v1/catalog/stores?sort=nope").status_code == 400
    assert client.get("/v1/catalog/stores?destination_id=moon").status_code == 400


def test_product_detail_and_menu_groups(client):
    d = client.get("/v1/catalog/products/p-28").json()
    assert d["product"]["name"].startswith("방어·광어 모둠회") and d["product"]["group"] == "대표 메뉴" and d["product"]["popular"]
    assert d["product"]["image"].startswith("https://images.unsplash.com/") and d["store"]["id"] == "dongmun-hoe"
    assert client.get("/v1/catalog/products/nope").status_code == 404
    groups = {p["group"] for p in client.get("/v1/catalog/stores/makgeolli").json()["products"]}
    assert groups == {"대표 메뉴", "사이드·음료"} or groups <= {"대표 메뉴", "메뉴", "사이드·음료"}
