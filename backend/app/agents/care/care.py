"""⑥ 먼저 챙기기(care): 홈 '하르방이 먼저 챙겼어요' 카드(nudge)를 만든다. 안내만 하거나, 눌러서 맡길 문장(ask)을 준다.
사용자 대신 주문하거나 장바구니를 바꾸지 않는다. 앱이 닫은 id(ctx.dismissed)는 다시 내지 않는다."""
from __future__ import annotations

from app.agents._common import claim, ctx_now, ev
from app.contracts import AgentResult
from app.tools import clock
from app.tools.calc import QuoteError, base_name, josa, quote
from app.tools.data import assumptions, catalog_of

ID = "care"
STATUS_LABEL = {"received": "주문 접수", "preparing": "가게 준비 중", "hub_packed": "집하장 포장 완료",
                "delivering": "배달 중", "delivered": "도착"}


def _want_word(p: dict) -> str:
    """대체 요청 문장에 쓸 낱말: 상품 태그 중 want_keywords에 있는 첫 낱말."""
    kw = assumptions()["want_keywords"]
    return next((t for t in p.get("tags", []) if t in kw), base_name(p["name"]))


def run(ctx: dict, llm=None) -> AgentResult:
    catalog = catalog_of(ctx)
    now = ctx_now(ctx)
    cart = [it for it in (ctx.get("cart") or []) if str(it.get("product_id")) in catalog["products"]]
    dismissed = set(ctx.get("dismissed") or [])
    a = assumptions()
    nudges, claims = [], []

    def add(nudge: dict, text: str, *evidence):
        if nudge["id"] in dismissed or any(n["id"] == nudge["id"] for n in nudges):
            return
        nudges.append(nudge)
        claims.append(claim(ID, text, "fact", *evidence))

    cart_ev = ev("input", "cart", "앱 장바구니")
    seen_stores = []
    for it in cart:
        p = catalog["products"][it["product_id"]]
        s = catalog["stores"][p["store_id"]]
        if s["id"] not in seen_stores:
            seen_stores.append(s["id"])
            left = clock.closes_in_min(s, now)
            if left is not None and left <= a["closing_soon_min"]:
                text = f"{s['name']} 마감 {left}분 전이에요({s['close']} 마감). 주문을 서둘러 주세요"
                add({"id": f"closing_soon-{s['id']}", "kind": "closing_soon", "title": f"{s['name']} 곧 마감",
                     "body": text, "action": {"type": "open", "route": "/cart"}},
                    text, cart_ev, ev("dataset", "stores", "영업시간"), ev("calc", "마감 시각 − 지금"))
        if p["stock"] <= 0 or int(it.get("qty") or 1) > p["stock"]:
            word = _want_word(p)
            people = max(1, p.get("serves") or 1)
            body = (f"담은 {josa(base_name(p['name']), '이')} 품절이에요. 비슷한 메뉴로 바꿔 드릴까요?" if p["stock"] <= 0
                    else f"담은 {base_name(p['name'])} 재고가 {p['stock']}개뿐이에요. 비슷한 메뉴를 더할까요?")
            add({"id": f"sold_out_in_cart-{p['id']}", "kind": "sold_out_in_cart", "title": "담은 상품이 품절이에요",
                 "body": body, "action": {"type": "ask", "prompt": f"{word} 메뉴로 {people}인분 다시 골라줘"}},
                body, cart_ev, ev("dataset", "products", "재고"))

    if cart:
        try:
            q = quote(cart, catalog, ctx.get("destination_id"), now)
        except QuoteError:
            q = None
        limit = a["cold_max_transit_min"]
        if q and any(ln["temp"] == "cold" for ln in q["lines"]) and q["eta_min"] > limit:
            text = (f"냉장 품목이 있는데 {q['destination']['name']}까지 도착 예상 {q['eta_min']}분이에요. "
                    f"권장 이동 시간 {limit}분을 넘어서 더 가까운 배송지나 픽업을 생각해 보세요")
            add({"id": f"cold_far-{q['destination']['id']}", "kind": "cold_far", "title": "냉장 품목이 멀리 가요",
                 "body": text, "action": {"type": "open", "route": "/cart"}},
                text, cart_ev, ev("calc", "eta_min > cold_max_transit_min"),
                ev("assumption", "cold_max_transit_min", "냉장 품목 권장 최대 이동 시간(팀 가정)"))

    meal = clock.meal(now)
    if meal:
        word = "점심" if meal == "lunch" else "저녁"
        text = f"{word} 시간이에요. 동문시장 가게를 묶어서 {word} 장바구니를 짜 드릴까요?"
        add({"id": f"meal_time-{meal}-{now.date().isoformat()}", "kind": "meal_time", "title": f"{word} 뭐 먹을까요?",
             "body": text, "action": {"type": "ask", "prompt": f"{a['default_people']}명이서 {word}, 시장 인기 메뉴로 골라줘"}},
            text, ev("calc", "지금 시각과 식사 시간 비교"))

    for o in (ctx.get("orders") or [])[:5]:
        if o.get("status") in (None, "delivered"):
            continue
        label = STATUS_LABEL.get(o["status"], o["status"])
        text = f"주문이 '{label}' 단계예요"
        add({"id": f"order_update-{o['id']}-{o['status']}", "kind": "order_update", "title": "주문 진행 상황",
             "body": text, "action": {"type": "open", "route": f"/order/{o['id']}"}},
            text, ev("input", "orders", "내 주문"))

    return AgentResult(agent_id=ID, claims=claims, data={"nudges": nudges})
