"""카탈로그: 분류, 가게(영업 여부는 요청마다 계산), 상품 검색, 시장 정보."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import demo_now
from app.db.session import get_session
from app.features.catalog.service import delivery_info, product_view, snapshot, store_view
from app.tools.data import assumptions, destinations, load_json, market

router = APIRouter(prefix="/v1")


@router.get("/catalog/categories")
def categories():
    return {"categories": load_json("categories.json")}


SORTS = {   # 배민식 정렬: 기본 · 배달 빠른 순 · 별점 높은 순 · 배달팁 낮은 순 — 어느 정렬이든 영업 중인 가게가 먼저
    "default": lambda s: (not s["is_open"], -s["rating"]),
    "fast": lambda s: (not s["is_open"], s["eta_min"]),
    "rating": lambda s: (not s["is_open"], -s["rating"], s["eta_min"]),
    "fee": lambda s: (not s["is_open"], s["delivery_tip"], s["eta_min"]),
}


def _dest(destination_id: str | None) -> dict:
    dests = destinations()
    if destination_id and destination_id not in dests:
        raise HTTPException(400, "배송지를 찾을 수 없어요")
    return dests[destination_id or market()["default_destination"]]


@router.get("/catalog/stores")
def stores(kind: str | None = None, category: str | None = None, sort: str = "default", open_only: bool = False,
           destination_id: str | None = None, now: datetime = Depends(demo_now), session: Session = Depends(get_session)):
    if sort not in SORTS:
        raise HTTPException(400, "정렬 방법을 확인해 주세요")
    dest = _dest(destination_id)
    cat = snapshot(session)
    out = [{**store_view(s, now), **delivery_info(s, dest)} for s in cat["stores"].values()
           if (not kind or s["kind"] == kind) and (not category or s["category"] == category)]
    if open_only:
        out = [s for s in out if s["is_open"]]
    return {"stores": sorted(out, key=SORTS[sort]), "destination": {"id": dest["id"], "name": dest["name"]}}


@router.get("/catalog/stores/{store_id}")
def store_detail(store_id: str, destination_id: str | None = None, now: datetime = Depends(demo_now),
                 session: Session = Depends(get_session)):
    cat = snapshot(session)
    s = cat["stores"].get(store_id)
    if s is None:
        raise HTTPException(404, "가게를 찾을 수 없어요")
    return {"store": {**store_view(s, now), **delivery_info(s, _dest(destination_id))},
            "products": [product_view(p, cat["stores"]) for p in cat["products"].values() if p["store_id"] == store_id]}


@router.get("/catalog/products/{product_id}")
def product_detail(product_id: str, now: datetime = Depends(demo_now), session: Session = Depends(get_session)):
    cat = snapshot(session)
    p = cat["products"].get(product_id)
    if p is None:
        raise HTTPException(404, "메뉴를 찾을 수 없어요")
    return {"product": product_view(p, cat["stores"]), "store": store_view(cat["stores"][p["store_id"]], now)}


@router.get("/catalog/products")
def products(q: str | None = None, store_id: str | None = None, tag: str | None = None, session: Session = Depends(get_session)):
    cat = snapshot(session)
    needle = (q or "").strip().lower()
    out = []
    for p in cat["products"].values():
        if store_id and p["store_id"] != store_id:
            continue
        if tag and tag not in p["tags"]:
            continue
        if needle:
            hay = " ".join([p["name"], p["description"], *p["tags"], cat["stores"][p["store_id"]]["name"]]).lower()
            if needle not in hay and needle.replace(" ", "") not in hay.replace(" ", ""):
                continue
        out.append(product_view(p, cat["stores"]))
    return {"products": out}


@router.get("/market")
def market_info():
    """시장 정보 + 화면에 보여 줄 배달 규칙(묶음 배송비·배달 범위). 나머지 가정값은 내보내지 않는다."""
    a = assumptions()
    return {"market": {**market(), "bundle_fee": a["market_bundle_fee"], "delivery_radius_km": a["delivery_radius_km"]}}
