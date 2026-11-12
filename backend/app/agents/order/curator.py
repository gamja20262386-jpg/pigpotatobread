"""② 메뉴 고르기(curator): 조건에 맞는 상품을 여러 가게에서 골라 장바구니 제안을 만든다. LLM을 쓰지 않는다.
1. 후보 = 영업 중 가게 + 재고 1 이상 + excludes 태그 없음.
2. wants마다 점수 높은 상품 1개(점수 = 평점 + 태그 일치 + 상품 이름이 말과 맞음 + 동문시장 가게). 같으면 인원 기준 금액이 싼 것.
   wants가 없으면 시장 인기 상품.
3. 수량 = ceil(people / serves)(재고 이하). 예산(배달비 포함 합계)을 넘으면 비싼 줄부터 수량을 줄이고, 그래도 넘으면 빼며 unmet에 남긴다.
4. 원하던 것의 1순위가 품절·영업 종료면 다음 후보로 대체하고 substitutions에 기록("단, …")."""
from __future__ import annotations

import math
import re

from app.agents._common import claim, ctx_now, ev
from app.contracts import AgentResult
from app.tools import clock
from app.tools.calc import base_name, fees, fmt, josa, make_groups, make_lines
from app.tools.data import assumptions, catalog_of

ID = "curator"
POPULAR_COUNT = 2           # wants가 없을 때 고르는 시장 인기 상품 수
CLOSED_REF = "now"          # 영업시간 때문에 못 담은 주장의 input 근거 (지휘 AI가 요약에 꼭 넣음)
PARTICLE_RE = re.compile(r"(?:이랑|랑|하고|으로|로|은|는|이|가|을|를|도|만|과|와)$")
W_PRIMARY, W_OTHER, W_NAME, W_MARKET = 2.0, 0.5, 1.0, 0.3


def _tokens(text: str) -> set[str]:
    out = set()
    for t in re.findall(r"[가-힣]{2,}", text):
        t = PARTICLE_RE.sub("", t)
        if len(t) >= 2:
            out.add(t)
    return out


def _score(p: dict, store: dict, tags: list[str], tokens: set[str]) -> float:
    ptags = set(p.get("tags", []))
    s = store["rating"]
    s += W_PRIMARY if tags and tags[0] in ptags else 0
    s += W_OTHER * len(ptags & set(tags[1:]))
    name = re.sub(r"\s", "", p["name"])
    s += W_NAME if any(t in name for t in tokens) else 0
    s += W_MARKET if store["kind"] == "market" else 0
    return round(s, 3)


def _qty(p: dict, people: int) -> int:
    return max(1, min(math.ceil(people / max(1, p["serves"])), p["stock"]))


def _cost(lines: list[dict], catalog: dict) -> int:
    rows = make_lines(lines, catalog)
    return sum(r["line_total"] for r in rows) + fees(make_groups(rows, catalog), catalog)["total"]


def run(ctx: dict, llm=None) -> AgentResult:
    cond = (((ctx.get("results") or {}).get("intake") or {}).get("data") or {}).get("conditions") or ctx.get("conditions") or {}
    catalog = catalog_of(ctx)
    now = ctx_now(ctx)
    people = int(cond.get("people") or assumptions()["default_people"])
    budget = cond.get("budget")
    wants: list[str] = list(cond.get("wants") or [])
    want_tags: dict = cond.get("want_tags") or {}
    excl = set(cond.get("exclude_tags") or [])
    tokens = _tokens(str(ctx.get("message") or ""))
    stores, products = catalog["stores"], catalog["products"]
    prod_ev = ev("dataset", "products", "상품 데이터")

    def usable(p: dict) -> bool:
        return not (set(p.get("tags", [])) & excl)

    def available(p: dict) -> bool:
        return p["stock"] >= 1 and clock.is_open(stores[p["store_id"]], now)

    picks: list[dict] = []          # {product_id, qty, want}
    subs, unmet, claims = [], [], []
    closed: list[tuple[str, str]] = []      # (want, 가장 빨리 여는 시각)
    for want in wants:
        tags = want_tags.get(want) or [want]
        ranked = [p for p in products.values() if usable(p) and set(p.get("tags", [])) & set(tags)]
        ranked.sort(key=lambda p: (-_score(p, stores[p["store_id"]], tags, tokens), p["price"] * math.ceil(people / max(1, p["serves"])), p["id"]))
        if not ranked:
            unmet.append(want)
            continue
        top = ranked[0]
        chosen = next((p for p in ranked if available(p)), None)
        if chosen is None:
            unmet.append(want)
            in_stock = [p for p in ranked if p["stock"] >= 1]
            if in_stock:        # 재고는 있는데 가게가 닫힘 → 예산·메뉴가 아니라 영업시간 문제
                closed.append((want, min(stores[p["store_id"]]["open"] for p in in_stock)))
            continue
        if any(x["product_id"] == chosen["id"] for x in picks):      # 다른 want로 이미 고른 상품
            continue
        if chosen["id"] != top["id"]:
            reason = "품절" if top["stock"] <= 0 else "영업 시간이 아님"
            subs.append({"wanted": top["name"], "chosen": chosen["name"], "reason": reason, "want": want})
        picks.append({"product_id": chosen["id"], "qty": _qty(chosen, people), "want": want})

    if not wants:       # 시장 인기 상품: 가게마다 1개, 평점 높은 순
        seen_store = set()
        pool = sorted((p for p in products.values() if usable(p) and available(p) and stores[p["store_id"]]["kind"] == "market"),
                      key=lambda p: (-stores[p["store_id"]]["rating"], p["price"], p["id"]))
        for p in pool:
            if p["store_id"] in seen_store:
                continue
            seen_store.add(p["store_id"])
            picks.append({"product_id": p["id"], "qty": _qty(p, people), "want": "인기"})
            if len(picks) >= POPULAR_COUNT:
                break

    # 예산: 상품 합 + 배달비가 예산 × budget_slack 이하가 되게
    reduced, dropped = [], []
    if budget:
        limit = int(budget * assumptions()["budget_slack"])
        start = {x["product_id"]: x["qty"] for x in picks}
        while picks and _cost(picks, catalog) > limit:
            line_total = lambda x: products[x["product_id"]]["price"] * x["qty"]
            reducible = [x for x in picks if x["qty"] > 1]
            if reducible:
                max(reducible, key=line_total)["qty"] -= 1
            else:
                drop = max(picks, key=line_total)
                picks.remove(drop)
                dropped.append(drop)
                if drop["want"] not in unmet and drop["want"] != "인기":
                    unmet.append(drop["want"])
        reduced = [{"product_id": x["product_id"], "from": start[x["product_id"]], "to": x["qty"]}
                   for x in picks if x["qty"] < start[x["product_id"]]]

    proposal = [{"product_id": x["product_id"], "qty": x["qty"]} for x in picks]
    for x in picks:
        p = products[x["product_id"]]
        claims.append(claim(ID, f"{stores[p['store_id']]['name']} {p['name']} {x['qty']}개 {fmt(p['price'] * x['qty'])}원",
                            "fact", prod_ev, ev("input", "message", "주문 문장")))
    for s in subs:
        if any(products[x["product_id"]]["name"] == s["chosen"] for x in picks):
            why = "품절이라" if s["reason"] == "품절" else "지금 영업 시간이 아니라"
            claims.append(claim(ID, f"단, {josa(base_name(s['wanted']), '은')} {why} {josa(base_name(s['chosen']), '으로')} 바꿨어요",
                                "fact", prod_ev, ev("dataset", "stores", "영업시간")))
    budget_ev = (ev("input", "message", "주문 문장"), ev("calc", "상품 합 + 배달비 ≤ 예산"))
    for r in reduced:
        name = base_name(products[r["product_id"]]["name"])
        claims.append(claim(ID, f"예산 {fmt(budget)}원에 맞추려고 {name} 수량을 {r['from']}개에서 {r['to']}개로 줄였어요. "
                                f"{people}명이 먹기엔 모자랄 수 있어요", "question", *budget_ev))
    for d in dropped:
        claims.append(claim(ID, f"예산 {fmt(budget)}원을 넘어서 {josa(base_name(products[d['product_id']]['name']), '은')} 뺐어요",
                            "question", *budget_ev))
    hours_ev = (ev("dataset", "stores", "영업시간"), ev("input", CLOSED_REF, "현재 시각"))
    for w, opens in closed:
        claims.append(claim(ID, f"{josa(w, '은')} 지금 문 연 가게가 없어 담지 못했어요. {opens}부터 주문할 수 있어요", "fact", *hours_ev))
    closed_wants = {w for w, _ in closed}
    for w in unmet:
        if w in closed_wants:
            continue
        claims.append(claim(ID, f"{josa(w, '은')} 조건에 맞는 상품을 담지 못했어요. 예산이나 메뉴를 바꿔 볼까요?", "question",
                            ev("input", "message", "주문 문장"), prod_ev))
    if not wants and not picks:
        market_open = min((s["open"] for s in stores.values() if s["kind"] == "market"), default=None)
        if market_open and not any(clock.is_open(s, now) for s in stores.values() if s["kind"] == "market"):
            claims.append(claim(ID, f"지금은 문 연 시장 가게가 없어요. 동문시장은 {market_open}부터 열어요", "fact", *hours_ev))
    if not proposal:
        claims.append(claim(ID, "지금 조건으로 담을 수 있는 상품이 없어요", "question", ev("input", "message"), prod_ev))
    return AgentResult(agent_id=ID, claims=claims,
                       data={"proposal": proposal, "substitutions": [{k: s[k] for k in ("wanted", "chosen", "reason")} for s in subs],
                             "unmet": unmet, "reduced": reduced})
