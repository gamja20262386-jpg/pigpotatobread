"""에이전트: 한 문장 주문(plan_order), 대화(assistant_chat), 먼저 챙기기(care_nudges), 실행 기록, 하네스 보기."""
from __future__ import annotations

import copy
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import demo_now, optional_user
from app.db.models import AgentRun, Order, User
from app.db.session import get_session
from app.features.cart.router import CartItem, build_quote
from app.features.catalog.service import snapshot
from app.features.orders.service import order_view
from app.harness.registry import harness_view
from app.harness.runner import run_flow
from app.harness.trace import public_json, recent_run, run_json, save_run
from app.tools.data import destinations

router = APIRouter(prefix="/v1")


class PlanIn(BaseModel):
    message: str = Field(min_length=1, max_length=300)
    destination_id: str | None = None


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=300)


class NudgesIn(BaseModel):
    cart: list[CartItem] = Field(default_factory=list, max_length=50)
    destination_id: str | None = None
    dismissed: list[str] = Field(default_factory=list, max_length=200)


def _check_dest(dest_id: str | None) -> None:
    if dest_id is not None and dest_id not in destinations():
        raise HTTPException(400, "없는 배송지예요")


def _result(run, agent_id: str) -> dict:
    res = next((r for r in run.results if r.agent_id == agent_id), None)
    return res.data if res and res.ok else {}


def _my_orders(session: Session, user: User | None) -> list[dict] | None:
    if user is None:
        return None
    rows = session.execute(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(10)).scalars()
    return [order_view(o) for o in rows]


@router.post("/agent/plan")
def plan(body: PlanIn, now: datetime = Depends(demo_now), session: Session = Depends(get_session)):
    _check_dest(body.destination_id)
    catalog = snapshot(session)
    run = run_flow("plan_order", {"message": body.message, "destination_id": body.destination_id, "now": now, "catalog": catalog})
    save_run(session, run)
    session.commit()
    items = _result(run, "curator").get("proposal") or []
    proposal = None
    if items:
        dest = (_result(run, "delivery").get("destination") or {}).get("id") or body.destination_id
        proposal = {"items": items, "quote": build_quote(items, catalog, dest, now)}
    return {"run": run_json(run), "proposal": proposal}


@router.post("/agent/chat")
def chat(body: ChatIn, user: User | None = Depends(optional_user), now: datetime = Depends(demo_now),
         session: Session = Depends(get_session)):
    run = run_flow("assistant_chat", {"message": body.message, "orders": _my_orders(session, user), "now": now,
                                      "catalog": snapshot(session)})
    save_run(session, run)
    session.commit()
    return {"run": run_json(run), "suggest_plan": bool(_result(run, "concierge").get("suggest_plan"))}


@router.post("/agent/nudges")
def nudges(body: NudgesIn, user: User | None = Depends(optional_user), now: datetime = Depends(demo_now),
           session: Session = Depends(get_session)):
    _check_dest(body.destination_id)
    run = run_flow("care_nudges", {"cart": [i.model_dump() for i in body.cart], "destination_id": body.destination_id,
                                   "dismissed": body.dismissed, "orders": _my_orders(session, user), "now": now,
                                   "catalog": snapshot(session)})
    save_run(session, run)
    session.commit()
    return {"nudges": _result(run, "care").get("nudges") or [], "run_id": run.run_id}


@router.get("/agent-runs/{run_id}")
def get_run(run_id: str, session: Session = Depends(get_session)):
    data = recent_run(run_id)
    if data is None:
        row = session.get(AgentRun, run_id)
        data = row.result if row else None
    if data is None:
        raise HTTPException(404, "실행 기록을 찾을 수 없어요")
    return public_json(copy.deepcopy(data))


@router.get("/harness")
def harness():
    return harness_view()
