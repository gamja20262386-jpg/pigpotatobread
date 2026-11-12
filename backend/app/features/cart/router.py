"""장바구니 견적: 서버가 계산한 Quote + cart_check 흐름(bundler → delivery → freshness) 실행 결과."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import demo_now
from app.db.session import get_session
from app.features.catalog.service import snapshot
from app.harness.runner import run_flow
from app.harness.trace import run_json, save_run
from app.tools.calc import QuoteError, quote

router = APIRouter(prefix="/v1")


class CartItem(BaseModel):
    product_id: str = Field(min_length=1, max_length=40)
    qty: int = Field(ge=1, le=99)


class QuoteIn(BaseModel):
    items: list[CartItem] = Field(max_length=50)
    destination_id: str | None = None


def build_quote(items: list[dict], catalog: dict, destination_id: str | None, now: datetime) -> dict:
    try:
        return quote(items, catalog, destination_id, now)
    except QuoteError as e:
        raise HTTPException(404, str(e)) from None


@router.post("/cart/quote")
def cart_quote(body: QuoteIn, now: datetime = Depends(demo_now), session: Session = Depends(get_session)):
    catalog = snapshot(session)
    items = [i.model_dump() for i in body.items]
    q = build_quote(items, catalog, body.destination_id, now)
    run = run_flow("cart_check", {"items": items, "destination_id": q["destination"]["id"], "now": now, "catalog": catalog})
    save_run(session, run)
    session.commit()
    return {"quote": q, "run": run_json(run)}
