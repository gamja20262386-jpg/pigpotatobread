"""장바구니 견적, 주문(재계산·409·재고 차감·상태), 상인 API."""
from app.tools.calc import travel_min
from app.tools.data import assumptions
from conftest import at, login

MIXED = [{"product_id": "p-30", "qty": 1}, {"product_id": "p-22", "qty": 2}, {"product_id": "p-35", "qty": 1},
         {"product_id": "p-3", "qty": 1}, {"product_id": "p-11", "qty": 1}]


def stock(client, pid):
    return next(p for p in client.get("/v1/catalog/products").json()["products"] if p["id"] == pid)["stock"]


def test_quote_fee_math_and_totals_consistent(client):
    r = client.post("/v1/cart/quote", json={"items": MIXED, "destination_id": "tapdong"}, headers=at("18:00"))
    assert r.status_code == 200
    q = r.json()["quote"]
    f = assumptions()["market_bundle_fee"]
    stalls = sum(1 for g in q["groups"] if g["kind"] == "market")
    assert stalls == 3
    assert q["fees"]["market"] == min(f["max"], f["base"] + f["per_extra_stall"] * (stalls - 1))
    assert q["fees"]["restaurants"] == 2000 + 2000                          # store-2, store-6 delivery_fee 합
    assert q["fees"]["total"] == q["fees"]["market"] + q["fees"]["restaurants"]
    assert q["subtotal"] == sum(ln["line_total"] for ln in q["lines"]) == sum(g["subtotal"] for g in q["groups"])
    assert all(ln["line_total"] == ln["price"] * ln["qty"] for ln in q["lines"])
    assert q["total"] == q["subtotal"] + q["fees"]["total"]
    assert q["eta_min"] >= max(g["prep_min"] for g in q["groups"]) + assumptions()["hub_pack_min"]
    assert [b["label"] for b in q["bags"]] == ["냉장 보냉팩", "따뜻한 보온백", "상온 봉투"]
    assert r.json()["run"]["flow"] == "cart_check"


def test_quote_restaurant_only_and_default_destination(client):
    q = client.post("/v1/cart/quote", json={"items": [{"product_id": "p-7", "qty": 1}]}, headers=at("18:00")).json()["quote"]
    assert q["fees"] == {"market": 0, "restaurants": 3000, "total": 3000}
    assert q["destination"]["id"] == "tapdong"
    assert q["eta_min"] == 25 + travel_min(q["distance_km"])                 # 맛집만: 집하 포장 없음, 가게에서 출발
    assert client.post("/v1/cart/quote", json={"items": [{"product_id": "zzz", "qty": 1}]}).status_code == 404
    assert client.post("/v1/cart/quote", json={"items": [{"product_id": "p-1", "qty": 0}]}).status_code == 422


def test_order_requires_customer(client):
    body = {"items": [{"product_id": "p-35", "qty": 1}], "destination_id": "tapdong"}
    assert client.post("/v1/orders", json=body).status_code == 401
    assert client.post("/v1/orders", json=body, headers=login(client, "merchant")).status_code == 403


def test_order_recomputes_quote_and_decrements_stock(client):
    h = login(client, "customer")
    before = stock(client, "p-29")
    r = client.post("/v1/orders", json={"items": [{"product_id": "p-29", "qty": 2}, {"product_id": "p-35", "qty": 1}],
                                        "destination_id": "tapdong", "agent_run_id": "abc"}, headers=h)
    assert r.status_code == 200
    o = r.json()["order"]
    assert o["status"] == "received" and o["status_label"] == "주문 접수" and o["agent_run_id"] == "abc"
    assert o["quote"]["subtotal"] == 28000 * 2 + 11000 and o["destination"]["id"] == "tapdong"
    assert stock(client, "p-29") == before - 2
    assert [x["id"] for x in client.get("/v1/orders", headers=h).json()["orders"]] == [o["id"]]


def test_order_rejects_sold_out_and_over_stock(client):
    h = login(client, "customer")
    r = client.post("/v1/orders", json={"items": [{"product_id": "p-31", "qty": 1}], "destination_id": "tapdong"}, headers=h)
    assert r.status_code == 409 and "은갈치구이" in r.json()["detail"]
    r = client.post("/v1/orders", json={"items": [{"product_id": "p-29", "qty": 5}], "destination_id": "tapdong"}, headers=h)
    assert r.status_code == 409
    assert stock(client, "p-29") == 4                                        # 실패한 주문은 재고를 건드리지 않음
    assert client.post("/v1/orders", json={"items": [], "destination_id": "tapdong"}, headers=h).status_code == 422


def test_advance_walks_states_with_hub(client):
    h = login(client, "customer")
    oid = client.post("/v1/orders", json={"items": [{"product_id": "p-35", "qty": 1}], "destination_id": "tapdong"}, headers=h).json()["order"]["id"]
    seen = [client.post(f"/v1/orders/{oid}/advance", headers=h).json()["order"]["status"] for _ in range(4)]
    assert seen == ["preparing", "hub_packed", "delivering", "delivered"]
    r = client.post(f"/v1/orders/{oid}/advance", headers=h)
    assert r.status_code == 409
    hist = client.get(f"/v1/orders/{oid}", headers=h).json()["order"]["history"]
    assert [x["status"] for x in hist] == ["received", "preparing", "hub_packed", "delivering", "delivered"]


def test_advance_skips_hub_for_restaurant_only(client):
    h = login(client, "customer")
    oid = client.post("/v1/orders", json={"items": [{"product_id": "p-5", "qty": 1}], "destination_id": "tapdong"}, headers=h).json()["order"]["id"]
    seen = [client.post(f"/v1/orders/{oid}/advance", headers=h).json()["order"]["status"] for _ in range(3)]
    assert seen == ["preparing", "delivering", "delivered"]


def test_orders_are_private(client):
    h = login(client, "customer")
    oid = client.post("/v1/orders", json={"items": [{"product_id": "p-35", "qty": 1}], "destination_id": "tapdong"}, headers=h).json()["order"]["id"]
    other = client.post("/v1/auth/signup", json={"name": "b", "email": "b@example.com", "password": "password123"}).json()["token"]
    oh = {"Authorization": f"Bearer {other}"}
    assert client.get(f"/v1/orders/{oid}", headers=oh).status_code == 404
    assert client.post(f"/v1/orders/{oid}/advance", headers=oh).status_code == 404
    assert client.get("/v1/orders", headers=oh).json()["orders"] == []


def test_merchant_patch_only_own_products(client):
    m = login(client, "merchant")
    r = client.patch("/v1/merchant/products/p-29", json={"price": 27000, "stock": 9}, headers=m)
    assert r.status_code == 200 and r.json()["product"]["price"] == 27000 and r.json()["product"]["stock"] == 9
    r = client.patch("/v1/merchant/products/p-32", json={"stock": 1}, headers=m)
    assert r.status_code == 403 and r.json()["detail"] == "내 가게 상품만 바꿀 수 있어요"
    assert client.patch("/v1/merchant/products/p-29", json={"stock": -1}, headers=m).status_code == 422
    assert client.patch("/v1/merchant/products/p-29", json={"stock": 1}, headers=login(client, "customer")).status_code == 403
    assert client.patch("/v1/merchant/products/zzz", json={"stock": 1}, headers=m).status_code == 404


def test_merchant_intake_proposes_without_saving(client):
    m = login(client, "merchant")
    r = client.post("/v1/merchant/intake", json={"message": "고등어회 3개 더 들어왔어, 2만 6천원으로"}, headers=m)
    assert r.status_code == 200
    (ch,) = r.json()["changes"]
    assert ch == {"product_id": "p-29", "name": "고등어회 (2인)", "before": {"price": 28000, "stock": 4},
                  "after": {"stock": 7, "price": 26000}}
    assert r.json()["run"]["flow"] == "stock_intake"
    r = client.post("/v1/merchant/intake", json={"message": "딱새우 다 팔렸어"}, headers=m)
    assert r.json()["changes"][0]["product_id"] == "p-30" and r.json()["changes"][0]["after"] == {"stock": 0}
    assert stock(client, "p-29") == 4 and stock(client, "p-30") == 5        # 반영 안 함
    assert client.post("/v1/merchant/intake", json={"message": "x"}, headers=login(client, "customer")).status_code == 403


def test_merchant_store_view_shows_only_my_lines(client):
    c = login(client, "customer")
    client.post("/v1/orders", json={"items": [{"product_id": "p-29", "qty": 1}, {"product_id": "p-35", "qty": 1}],
                                    "destination_id": "tapdong"}, headers=c)
    r = client.get("/v1/merchant/store", headers={**login(client, "merchant"), **at("20:30")}).json()
    assert r["store"]["id"] == "dongmun-hoe" and r["store"]["closes_in_min"] == 30
    assert {p["id"] for p in r["products"]} == {"p-28", "p-29", "p-30"}
    (o,) = r["orders"]
    assert [ln["product_id"] for ln in o["lines"]] == ["p-29"] and o["status_label"] == "주문 접수"


def test_merchant_patch_rejects_stale_expected_stock(client):
    tok = client.post("/v1/auth/demo", json={"role": "merchant"}).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    cur = client.get("/v1/merchant/store", headers=h).json()["products"]
    p = next(x for x in cur if x["id"] == "p-29")
    r = client.patch("/v1/merchant/products/p-29", json={"stock": p["stock"] + 3, "expected_stock": p["stock"] - 1}, headers=h)
    assert r.status_code == 409 and "그사이 재고" in r.json()["detail"]
    r = client.patch("/v1/merchant/products/p-29", json={"stock": p["stock"] + 3, "expected_stock": p["stock"]}, headers=h)
    assert r.status_code == 200 and r.json()["product"]["stock"] == p["stock"] + 3
