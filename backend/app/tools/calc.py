"""계산 도구(ARCHITECTURE §5 계산 규칙). 가격·배달비·거리·시간은 전부 여기서 만든다. LLM은 쓰지 않는다.
bundler·delivery·freshness 에이전트와 /cart/quote·/orders가 같은 함수를 써서 숫자가 어긋나지 않는다."""
from __future__ import annotations

import math
import re
from datetime import datetime

from app.tools import clock
from app.tools.data import assumptions, destinations, market

TEMP_ORDER = ("cold", "hot", "room")
BAG_LABEL = {"cold": "냉장 보냉팩", "hot": "따뜻한 보온백", "room": "상온 봉투"}


class QuoteError(ValueError):
    """없는 상품·배송지(라우터가 404로 바꾼다)."""


def fmt(n: int | float) -> str:
    return f"{int(n):,}"


def has_batchim(word: str) -> bool:
    for ch in reversed(word):
        if "가" <= ch <= "힣":
            return (ord(ch) - 0xAC00) % 28 != 0
        if ch.isdigit():
            return ch in "013678"
    return False


def josa(word: str, pair: str) -> str:
    """josa('고등어구이', '로') → '고등어구이로'. pair: 은/는, 이/가, 을/를, 으로/로, 과/와."""
    pairs = {"은": ("은", "는"), "는": ("은", "는"), "이": ("이", "가"), "가": ("이", "가"), "을": ("을", "를"),
             "를": ("을", "를"), "으로": ("으로", "로"), "로": ("으로", "로"), "과": ("과", "와"), "와": ("과", "와")}
    with_b, without = pairs[pair]
    last = next((ch for ch in reversed(word) if "가" <= ch <= "힣"), "")
    if with_b == "으로" and last and (ord(last) - 0xAC00) % 28 == 8:     # ㄹ 받침은 '로'
        return word + "로"
    return word + (with_b if has_batchim(word) else without)


def base_name(name: str) -> str:
    """'은갈치구이 (2인)' → '은갈치구이' (괄호 설명을 뗀 이름)."""
    return re.sub(r"\s*\(.*?\)\s*$", "", name).strip()


WON_RES = [
    re.compile(r"(\d+)\s*만(?:\s*(\d+)\s*천)?(?:\s*원)?"),         # 5만원, 2만 6천원, 3만5천
    re.compile(r"(?<![\d만])(\d+)\s*천\s*원"),                     # 6천원
    re.compile(r"(\d{1,3}(?:,\d{3})+|\d{3,})\s*원"),               # 26,000원, 26000원
]


def parse_won(text: str) -> list[tuple[int, tuple[int, int]]]:
    """글에서 금액(원)과 위치. 겹치는 표현은 앞 규칙이 먼저 잡는다."""
    found: list[tuple[int, tuple[int, int]]] = []
    used: list[tuple[int, int]] = []
    for i, rx in enumerate(WON_RES):
        for m in rx.finditer(text):
            if any(m.start() < e and s < m.end() for s, e in used):
                continue
            if i == 0:
                value = int(m.group(1)) * 10000 + (int(m.group(2)) * 1000 if m.group(2) else 0)
            elif i == 1:
                value = int(m.group(1)) * 1000
            else:
                value = int(m.group(1).replace(",", ""))
            used.append(m.span())
            found.append((value, m.span()))
    return sorted(found, key=lambda x: x[1][0])


def haversine_km(a: dict, b: dict) -> float:
    r = 6371.0088
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lng"] - a["lng"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def destination(dest_id: str | None) -> dict:
    """배송지 dict. None이면 market.json default_destination. 없는 id면 QuoteError."""
    dest_id = dest_id or market()["default_destination"]
    d = destinations().get(dest_id)
    if d is None:
        raise QuoteError(f"없는 배송지예요: {dest_id}")
    return d


def make_lines(items: list[dict], catalog: dict) -> list[dict]:
    """[{product_id, qty}] → Quote.lines. 같은 상품은 수량을 합친다. 없는 상품이면 QuoteError."""
    merged: dict[str, int] = {}
    for it in items:
        pid, qty = str(it["product_id"]), int(it["qty"])
        if pid not in catalog["products"]:
            raise QuoteError(f"없는 상품이에요: {pid}")
        merged[pid] = merged.get(pid, 0) + qty
    lines = []
    for pid, qty in merged.items():
        p = catalog["products"][pid]
        s = catalog["stores"][p["store_id"]]
        lines.append({"product_id": pid, "name": p["name"], "store_id": s["id"], "store_name": s["name"],
                      "price": p["price"], "qty": qty, "line_total": p["price"] * qty, "temp": p["temp"],
                      "sold_out": p["stock"] <= 0})
    return lines


def make_groups(lines: list[dict], catalog: dict) -> list[dict]:
    groups: dict[str, dict] = {}
    for ln in lines:
        s = catalog["stores"][ln["store_id"]]
        g = groups.setdefault(s["id"], {"store_id": s["id"], "store_name": s["name"], "kind": s["kind"],
                                        "subtotal": 0, "prep_min": s["prep_min"]})
        g["subtotal"] += ln["line_total"]
    return list(groups.values())


def make_bags(lines: list[dict]) -> list[dict]:
    return [{"temp": t, "label": BAG_LABEL[t], "items": [f"{ln['name']} ×{ln['qty']}" for ln in lines if ln["temp"] == t]}
            for t in TEMP_ORDER if any(ln["temp"] == t for ln in lines)]


def market_fee(stalls: int) -> int:
    """시장 묶음 배송비 = min(max, base + per_extra_stall × (시장 가게 수 − 1)), 시장 상품이 없으면 0."""
    if stalls <= 0:
        return 0
    f = assumptions()["market_bundle_fee"]
    return min(f["max"], f["base"] + f["per_extra_stall"] * (stalls - 1))


def fees(groups: list[dict], catalog: dict) -> dict:
    stalls = sum(1 for g in groups if g["kind"] == "market")
    default = assumptions()["restaurant_fee_default"]
    rest = 0
    for g in groups:
        if g["kind"] == "restaurant":
            fee = catalog["stores"][g["store_id"]].get("delivery_fee")
            rest += default if fee is None else int(fee)
    m = market_fee(stalls)
    return {"market": m, "restaurants": rest, "total": m + rest}


def distance_km(groups: list[dict], catalog: dict, dest: dict) -> float:
    """집하장(맛집은 그 가게) → 배송지 직선거리, 출발지가 여럿이면 최댓값. 상품이 없으면 집하장 기준."""
    origins = [market()["hub"]] if not groups or any(g["kind"] == "market" for g in groups) else []
    origins += [catalog["stores"][g["store_id"]] for g in groups if g["kind"] == "restaurant"]
    return round(max(haversine_km(o, dest) for o in origins), 1)


def ready_min(groups: list[dict]) -> int:
    """가게 prep_min 최댓값 + (시장 상품 있으면 hub_pack_min)."""
    if not groups:
        return 0
    hub = assumptions()["hub_pack_min"] if any(g["kind"] == "market" for g in groups) else 0
    return max(g["prep_min"] for g in groups) + hub


def travel_min(dist_km: float) -> int:
    return math.ceil(round(dist_km * assumptions()["min_per_km"], 6))


def in_zone(dist_km: float) -> bool:
    return dist_km <= assumptions()["delivery_radius_km"]


def freshness_warning(eta: int, has_cold: bool) -> str | None:
    limit = assumptions()["cold_max_transit_min"]
    if has_cold and eta > limit:
        return (f"냉장 품목 도착 예상 {eta}분이 권장 이동 시간 {limit}분을 넘어요. "
                "회는 가까운 픽업으로 바꾸거나 시간을 앞당겨요")
    return None


def hot_warning(eta: int, has_hot: bool) -> str | None:
    limit = assumptions()["hot_max_transit_min"]
    if has_hot and eta > limit:
        return f"따뜻한 음식은 도착 예상 {eta}분이면 식을 수 있어요(권장 {limit}분). 가까운 가게나 포장을 골라 보세요"
    return None


def quote(items: list[dict], catalog: dict, dest_id: str | None, now: datetime | None = None) -> dict:
    """Quote(ARCHITECTURE §2). 서버가 언제나 이 함수로 다시 계산한다."""
    now = now or clock.now_kst()
    dest = destination(dest_id)
    lines = make_lines(items, catalog)
    groups = make_groups(lines, catalog)
    f = fees(groups, catalog)
    dist = distance_km(groups, catalog, dest)
    eta = ready_min(groups) + travel_min(dist)
    zone = in_zone(dist)
    subtotal = sum(ln["line_total"] for ln in lines)
    warnings: list[str] = []
    for ln in lines:
        stock = catalog["products"][ln["product_id"]]["stock"]
        if ln["sold_out"]:
            warnings.append(f"{josa(base_name(ln['name']), '은')} 품절이에요")
        elif ln["qty"] > stock:
            warnings.append(f"{base_name(ln['name'])} 재고가 {stock}개뿐이에요")
    for g in groups:
        if not clock.is_open(catalog["stores"][g["store_id"]], now):
            warnings.append(f"{josa(g['store_name'], '은')} 지금 영업 시간이 아니에요")
    if not zone:
        warnings.append(f"{josa(dest['name'], '은')} 배달 범위({assumptions()['delivery_radius_km']}km) 밖이에요")
    fw = freshness_warning(eta, any(ln["temp"] == "cold" for ln in lines))
    if fw:
        warnings.append(fw)
    hw = hot_warning(eta, any(ln["temp"] == "hot" for ln in lines))
    if hw:
        warnings.append(hw)
    return {"lines": lines, "groups": groups, "bags": make_bags(lines), "fees": f, "subtotal": subtotal,
            "total": subtotal + f["total"], "eta_min": eta, "distance_km": dist, "in_zone": zone,
            "destination": {"id": dest["id"], "name": dest["name"]}, "warnings": warnings}
