"""카탈로그 조회 도우미: DB 행 → Store/Product JSON(ARCHITECTURE §2), 에이전트용 스냅숏."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Product, Store
from app.tools import clock

STORE_FIELDS = ("id", "name", "kind", "category", "label", "icon", "story", "open", "close", "prep_min", "lat", "lng",
                "rating", "delivery_fee")
PRODUCT_FIELDS = ("id", "store_id", "name", "description", "price", "emoji", "temp", "stock", "serves", "tags")


def store_dict(s: Store) -> dict:
    return {f: getattr(s, f) for f in STORE_FIELDS}


def product_dict(p: Product) -> dict:
    d = {f: getattr(p, f) for f in PRODUCT_FIELDS}
    d["tags"] = list(d["tags"] or [])
    return d


def store_view(s: dict, now: datetime) -> dict:
    return {**s, "is_open": clock.is_open(s, now), "closes_in_min": clock.closes_in_min(s, now)}


def product_view(p: dict, stores: dict[str, dict]) -> dict:
    return {**p, "store_name": stores[p["store_id"]]["name"], "sold_out": p["stock"] <= 0}


def snapshot(session: Session) -> dict:
    """에이전트·견적 계산용 카탈로그 {stores: {id: dict}, products: {id: dict}} (DB의 지금 재고·가격). 순서는 시드 순서(SQLite rowid)."""
    stores = {s.id: store_dict(s) for s in session.execute(select(Store)).scalars()}
    products = {p.id: product_dict(p) for p in session.execute(select(Product)).scalars()}
    return {"stores": stores, "products": products}
