"""상인: 내 가게·상품·주문 보기, 상품 가격·재고 수정(내 가게만), 말로 입력(stock_intake, 저장 안 함)."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import demo_now, merchant_user
from app.db.models import Order, Product, User
from app.db.session import get_session
from app.features.catalog.service import product_dict, product_view, snapshot, store_view
from app.features.orders.service import STATUS_LABEL, iso
from app.harness.runner import run_flow
from app.harness.trace import run_json, save_run

router = APIRouter(prefix="/v1/merchant")


class ProductPatch(BaseModel):
    price: int | None = Field(default=None, ge=0, le=10_000_000)
    stock: int | None = Field(default=None, ge=0, le=999)
    expected_stock: int | None = Field(default=None, ge=0, le=999)    # 말 입력 반영 때 '이전 재고' — 그사이 주문으로 바뀌었으면 409


class IntakeIn(BaseModel):
    message: str = Field(min_length=1, max_length=300)


@router.get("/store")
def my_store(user: User = Depends(merchant_user), now: datetime = Depends(demo_now), session: Session = Depends(get_session)):
    cat = snapshot(session)
    store = cat["stores"].get(user.store_id)
    if store is None:
        raise HTTPException(404, "내 가게를 찾을 수 없어요")
    orders = []
    for o in session.execute(select(Order).order_by(Order.created_at.desc())).scalars():
        lines = [ln for ln in (o.quote or {}).get("lines", []) if ln["store_id"] == user.store_id]
        if lines:
            orders.append({"id": o.id, "status_label": STATUS_LABEL[o.status], "created_at": iso(o.created_at), "lines": lines})
    return {"store": store_view(store, now),
            "products": [product_view(p, cat["stores"]) for p in cat["products"].values() if p["store_id"] == user.store_id],
            "orders": orders}


@router.patch("/products/{product_id}")
def patch_product(product_id: str, body: ProductPatch, user: User = Depends(merchant_user), session: Session = Depends(get_session)):
    p = session.get(Product, product_id)
    if p is None:
        raise HTTPException(404, "상품을 찾을 수 없어요")
    if p.store_id != user.store_id:
        raise HTTPException(403, "내 가게 상품만 바꿀 수 있어요")
    if body.expected_stock is not None and body.expected_stock != p.stock:
        raise HTTPException(409, f"그사이 재고가 {p.stock}개로 바뀌었어요. 다시 말해 주세요")
    if body.price is not None:
        p.price = body.price
    if body.stock is not None:
        p.stock = body.stock
    session.commit()
    stores = snapshot(session)["stores"]
    return {"product": product_view(product_dict(p), stores)}


@router.post("/intake")
def intake(body: IntakeIn, user: User = Depends(merchant_user), now: datetime = Depends(demo_now),
           session: Session = Depends(get_session)):
    catalog = snapshot(session)
    run = run_flow("stock_intake", {"message": body.message, "store_id": user.store_id, "now": now, "catalog": catalog})
    save_run(session, run)
    session.commit()
    res = next((r for r in run.results if r.agent_id == "stock_intake"), None)
    return {"run": run_json(run), "changes": (res.data.get("changes") if res else None) or []}
