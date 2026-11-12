"""주문: 서버가 견적을 다시 계산하고 품절·재고 부족·배달 범위 밖이면 409, 통과하면 재고를 줄이고 주문을 만든다."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.deps import current_user, customer_user, demo_now
from app.db.models import Order, Product, User
from app.db.session import get_session
from app.features.cart.router import CartItem, build_quote
from app.features.catalog.service import snapshot
from app.features.orders.service import history_entry, next_status, order_view
from app.tools.calc import base_name, josa

router = APIRouter(prefix="/v1")


class OrderIn(BaseModel):
    items: list[CartItem] = Field(min_length=1, max_length=50)
    destination_id: str = Field(min_length=1)
    agent_run_id: str | None = Field(default=None, max_length=64)


def _own(session: Session, order_id: str, user: User) -> Order:
    o = session.get(Order, order_id)
    if o is None or o.user_id != user.id:
        raise HTTPException(404, "주문을 찾을 수 없어요")
    return o


@router.post("/orders")
def create_order(body: OrderIn, user: User = Depends(customer_user), now: datetime = Depends(demo_now),
                 session: Session = Depends(get_session)):
    catalog = snapshot(session)
    items = [i.model_dump() for i in body.items]
    q = build_quote(items, catalog, body.destination_id, now)
    for ln in q["lines"]:
        stock = catalog["products"][ln["product_id"]]["stock"]
        if ln["sold_out"] or ln["qty"] > stock:
            raise HTTPException(409, f"{base_name(ln['name'])} 재고가 부족해요(남은 수량 {stock}개)")
    if not q["in_zone"]:
        raise HTTPException(409, f"{josa(q['destination']['name'], '은')} 배달 범위 밖이에요")
    for ln in q["lines"]:          # 조건부 차감: 그사이 다른 주문이 재고를 가져갔으면 409
        res = session.execute(update(Product).where(Product.id == ln["product_id"], Product.stock >= ln["qty"])
                              .values(stock=Product.stock - ln["qty"]))
        if res.rowcount != 1:
            session.rollback()
            raise HTTPException(409, f"{base_name(ln['name'])} 재고가 방금 바뀌었어요. 다시 확인해 주세요")
    o = Order(id=uuid.uuid4().hex[:12], user_id=user.id, status="received", destination=q["destination"], items=items,
              quote=q, agent_run_id=body.agent_run_id, history=[history_entry("received")])
    session.add(o)
    session.commit()
    return {"order": order_view(o)}


@router.get("/orders")
def list_orders(user: User = Depends(current_user), session: Session = Depends(get_session)):
    rows = session.execute(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())).scalars()
    return {"orders": [order_view(o) for o in rows]}


@router.get("/orders/{order_id}")
def get_order(order_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)):
    return {"order": order_view(_own(session, order_id, user))}


@router.post("/orders/{order_id}/advance")
def advance(order_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)):
    o = _own(session, order_id, user)
    nxt = next_status(o.status, o.quote)
    if nxt is None:
        raise HTTPException(409, "이미 도착한 주문이에요")
    o.status = nxt
    o.history = [*(o.history or []), history_entry(nxt)]
    session.commit()
    return {"order": order_view(o)}
