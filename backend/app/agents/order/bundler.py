"""③ 묶음 배송(bundler): 장바구니를 가게별로 나누고 동문시장 가게들은 공동 집하장에서 한 번에 묶는다.
온도대(cold/hot/room)별로 봉투를 나눈다. 가격을 바꾸지 않고 실제 배차를 하지 않는다."""
from __future__ import annotations

from app.agents._common import claim, ctx_now, ev
from app.contracts import AgentResult
from app.tools import clock
from app.tools.calc import QuoteError, base_name, josa, make_bags, make_groups, make_lines, ready_min
from app.tools.data import assumptions, catalog_of

ID = "bundler"


def cart_items(ctx: dict) -> list[dict]:
    """ctx.items(사용자가 담은 것) 또는 curator 제안."""
    if ctx.get("items") is not None:
        return list(ctx["items"])
    cur = ((ctx.get("results") or {}).get("curator") or {}).get("data") or {}
    return list(cur.get("proposal") or [])


def run(ctx: dict, llm=None) -> AgentResult:
    catalog = catalog_of(ctx)
    now = ctx_now(ctx)
    items = cart_items(ctx)
    try:
        lines = make_lines(items, catalog)
    except QuoteError as e:
        return AgentResult(agent_id=ID, ok=False, error=str(e),
                           claims=[claim(ID, str(e), "question", ev("input", "cart", "장바구니"))])
    groups = make_groups(lines, catalog)
    bags = make_bags(lines)
    stalls = sum(1 for g in groups if g["kind"] == "market")
    restaurants = [g for g in groups if g["kind"] == "restaurant"]
    claims = []
    if not lines:
        claims.append(claim(ID, "장바구니에 담긴 상품이 없어요", "question", ev("input", "cart", "장바구니")))
    if stalls >= 2:
        claims.append(claim(ID, f"동문시장 {stalls}곳을 공동 집하장에서 한 번에 묶어요", "fact",
                            ev("calc", "시장 가게 수", "장바구니 가게별 나눔"), ev("dataset", "market", "공동 집하장")))
    elif stalls == 1:
        claims.append(claim(ID, "동문시장 가게 상품은 공동 집하장에서 포장해 보내요", "fact", ev("dataset", "market", "공동 집하장")))
    if stalls:
        claims.append(claim(ID, f"집하장 포장 {assumptions()['hub_pack_min']}분을 준비 시간에 더해요", "assumption",
                            ev("assumption", "hub_pack_min", "집하장 포장 시간(팀 가정)")))
    for b in bags:
        claims.append(claim(ID, f"{b['label']}: {', '.join(b['items'])}", "fact", ev("dataset", "products", "상품 온도대")))
    if restaurants:
        claims.append(claim(ID, f"맛집 {len(restaurants)}곳은 가게별로 따로 배달해요", "fact", ev("dataset", "stores", "가게 종류")))
    for ln in lines:
        stock = catalog["products"][ln["product_id"]]["stock"]
        if ln["sold_out"]:
            claims.append(claim(ID, f"{josa(base_name(ln['name']), '은')} 품절이에요", "fact", ev("dataset", "products", "재고")))
        elif ln["qty"] > stock:
            claims.append(claim(ID, f"{base_name(ln['name'])} 재고가 {stock}개뿐이에요", "fact", ev("dataset", "products", "재고")))
    for g in groups:
        if not clock.is_open(catalog["stores"][g["store_id"]], now):
            claims.append(claim(ID, f"{josa(g['store_name'], '은')} 지금 영업 시간이 아니에요", "fact",
                                ev("dataset", "stores", "영업시간"), ev("calc", "현재 시각과 영업시간 비교")))
    return AgentResult(agent_id=ID, claims=claims,
                       data={"items": items, "groups": groups, "bags": bags, "market_stalls": stalls, "ready_min": ready_min(groups)})
