"""주문 상태(ARCHITECTURE §4)와 Order JSON."""
from __future__ import annotations

from datetime import datetime, timezone

from app.db.models import Order

STATUSES = ("received", "preparing", "hub_packed", "delivering", "delivered")
STATUS_LABEL = {"received": "주문 접수", "preparing": "가게 준비 중", "hub_packed": "집하장 포장 완료",
                "delivering": "배달 중", "delivered": "도착"}


def iso(dt: datetime) -> str:
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).astimezone(timezone.utc).isoformat()


def has_market(quote: dict) -> bool:
    return any(g["kind"] == "market" for g in quote.get("groups") or [])


def next_status(status: str, quote: dict) -> str | None:
    """앞으로 한 칸. 맛집만 있는 주문은 hub_packed를 건너뛴다. 끝이면 None."""
    i = STATUSES.index(status)
    for s in STATUSES[i + 1:]:
        if s == "hub_packed" and not has_market(quote):
            continue
        return s
    return None


def history_entry(status: str) -> dict:
    return {"status": status, "status_label": STATUS_LABEL[status], "at": datetime.now(timezone.utc).isoformat()}


def order_view(o: Order) -> dict:
    return {"id": o.id, "created_at": iso(o.created_at), "status": o.status, "status_label": STATUS_LABEL[o.status],
            "destination": o.destination, "quote": o.quote, "agent_run_id": o.agent_run_id, "history": list(o.history or [])}
