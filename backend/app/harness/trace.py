"""실행 기록: 이벤트 만들기, 최근 실행 메모리 보관(200개), DB 저장(AgentRun 표)."""
from __future__ import annotations

from collections import OrderedDict

from app.contracts import RunEvent, RunResult

_RECENT: "OrderedDict[str, dict]" = OrderedDict()
_MAX_RECENT = 200


class EventLog:
    def __init__(self) -> None:
        self.events: list[RunEvent] = []

    def add(self, type_: str, **payload) -> None:
        self.events.append(RunEvent(seq=len(self.events) + 1, type=type_, payload=payload))


def remember(result: RunResult) -> None:
    _RECENT[result.run_id] = result.model_dump(mode="json")
    _RECENT.move_to_end(result.run_id)
    while len(_RECENT) > _MAX_RECENT:
        _RECENT.popitem(last=False)


def public_json(data: dict) -> dict:
    """응답용 RunResult JSON: 막힌 주장 본문은 가린다(개인정보 모양 등이 있을 수 있음). 막힌 이유는 남긴다."""
    for res in data.get("results") or []:
        for c in res.get("claims") or []:
            if c.get("blocked"):
                c["text"] = "[차단됨]"
    return data


def run_json(result: RunResult) -> dict:
    return public_json(result.model_dump(mode="json"))


def recent_run(run_id: str) -> dict | None:
    return _RECENT.get(run_id)


def save_run(session, result: RunResult) -> None:
    """메모리에 보관하고 DB 세션에 AgentRun을 넣는다(commit은 호출자 몫). DB 오류는 무시."""
    remember(result)
    if session is None:
        return
    try:
        from app.db.models import AgentRun
        session.merge(AgentRun(run_id=result.run_id, flow=result.flow, result=result.model_dump(mode="json")))
    except Exception:
        return
