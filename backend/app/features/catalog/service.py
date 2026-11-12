"""카탈로그 조회 도우미: DB 행 → Store/Product JSON(ARCHITECTURE §2), 에이전트용 스냅숏."""
from __future__ import annotations

import math
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Product, Store
from app.tools import clock
from app.tools.calc import haversine_km
from app.tools.data import assumptions, market

STORE_FIELDS = ("id", "name", "kind", "category", "label", "icon", "story", "open", "close", "prep_min", "lat", "lng",
                "rating", "delivery_fee", "min_order", "pickup", "image")
PRODUCT_FIELDS = ("id", "store_id", "name", "description", "price", "emoji", "temp", "stock", "serves", "tags", "group", "popular", "image")


def store_dict(s: Store) -> dict:
    return {f: getattr(s, f) for f in STORE_FIELDS}


def product_dict(p: Product) -> dict:
    d = {f: getattr(p, f) for f in PRODUCT_FIELDS}
    d["tags"] = list(d["tags"] or [])
    return d


def store_view(s: dict, now: datetime) -> dict:
    return {**s, "is_open": clock.is_open(s, now), "closes_in_min": clock.closes_in_min(s, now)}


def delivery_info(s: dict, dest: dict) -> dict:
    """목록·가게 화면용 배달 정보(배송지 기준). 장바구니 견적(cart_check)과 같은 가정값·공식을 쓴다.
    시장 가게: 집하장 출발 + 집하 포장 시간, 배달팁은 묶음 배송 기본료. 맛집: 가게 출발, 가게 배달비."""
    a = assumptions()
    hub = market()["hub"]
    origin = hub if s["kind"] == "market" else s
    dist = round(haversine_km(origin, dest), 1)
    eta = s["prep_min"] + (a["hub_pack_min"] if s["kind"] == "market" else 0) + math.ceil(dist * a["min_per_km"])
    tip = a["market_bundle_fee"]["base"] if s["kind"] == "market" else s["delivery_fee"]
    return {"eta_min": eta, "distance_km": dist, "delivery_tip": tip, "in_zone": dist <= a["delivery_radius_km"]}


def product_view(p: dict, stores: dict[str, dict]) -> dict:
    return {**p, "store_name": stores[p["store_id"]]["name"], "sold_out": p["stock"] <= 0}


def snapshot(session: Session) -> dict:
    """에이전트·견적 계산용 카탈로그 {stores: {id: dict}, products: {id: dict}} (DB의 지금 재고·가격). 순서는 시드 순서(SQLite rowid)."""
    stores = {s.id: store_dict(s) for s in session.execute(select(Store)).scalars()}
    products = {p.id: product_dict(p) for p in session.execute(select(Product)).scalars()}
    return {"stores": stores, "products": products}
