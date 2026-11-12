"""⑤ 신선 지킴(freshness): 냉장 품목이 있으면 이동 시간과 포장을 점검한다(식품안전나라 수산물 운반 요령 근거).
'무조건 신선', '100% 안전' 같은 단정 표현을 쓰지 않는다."""
from __future__ import annotations

from app.agents._common import claim, ev
from app.contracts import AgentResult
from app.tools.calc import freshness_warning, hot_warning
from app.tools.data import assumptions

ID = "freshness"
HOW = {"cold": "아이스팩을 넣은 보냉 포장", "hot": "따뜻한 보온백", "room": "상온 봉투"}


def run(ctx: dict, llm=None) -> AgentResult:
    res = ctx.get("results") or {}
    bags = ((res.get("bundler") or {}).get("data") or {}).get("bags") or []
    eta = ((res.get("delivery") or {}).get("data") or {}).get("eta_min")
    cold_items = [i for b in bags if b["temp"] == "cold" for i in b["items"]]
    packaging = [{"temp": b["temp"], "how": HOW[b["temp"]]} for b in bags]
    claims = []
    warning = None
    if cold_items:
        claims.append(claim(ID, "냉장 품목은 아이스팩을 넣은 보냉 포장으로 차갑게 보내요", "fact",
                            ev("dataset", "foodsafety-seafood", "식품안전나라 수산물 운반 요령")))
        if isinstance(eta, int):
            warning = freshness_warning(eta, True)
            if warning:
                claims.append(claim(ID, warning, "estimate", ev("calc", "eta_min > cold_max_transit_min"),
                                    ev("assumption", "cold_max_transit_min", "냉장 품목 권장 최대 이동 시간(팀 가정)")))
            else:
                claims.append(claim(ID, f"도착 예상 {eta}분으로 냉장 품목 권장 이동 시간 {assumptions()['cold_max_transit_min']}분 안이에요",
                                    "estimate", ev("calc", "eta_min ≤ cold_max_transit_min"),
                                    ev("assumption", "cold_max_transit_min", "냉장 품목 권장 최대 이동 시간(팀 가정)")))
    if any(b["temp"] == "hot" for b in bags) and isinstance(eta, int):
        hot = hot_warning(eta, True)
        if hot:
            claims.append(claim(ID, hot, "estimate", ev("calc", "eta_min > hot_max_transit_min"),
                                ev("assumption", "hot_max_transit_min", "따뜻한 음식 권장 최대 시간(팀 가정)")))
            warning = warning or hot
    return AgentResult(agent_id=ID, claims=claims,
                       data={"cold_items": cold_items, "warning": bool(warning), "packaging": packaging})
