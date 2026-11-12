"""시각 도구: 서버 기준 '지금'(KST)과 X-Demo-Time(HH:MM) 덮어쓰기, 영업 여부, 마감까지 남은 분, 식사 시간."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
DEMO_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
LUNCH = (11 * 60, 13 * 60)      # care 카드: 점심 11~13시
DINNER = (17 * 60, 20 * 60)     # care 카드: 저녁 17~20시


def now_kst(demo_time: str | None = None) -> datetime:
    """지금(KST). demo_time이 'HH:MM'이면 오늘 날짜에 그 시각. 형식이 틀리면 ValueError."""
    now = datetime.now(KST)
    if demo_time is None or demo_time == "":
        return now
    m = DEMO_RE.match(demo_time.strip())
    if not m:
        raise ValueError("X-Demo-Time은 HH:MM 형식(예: 20:30)이어야 해요")
    return now.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=0, microsecond=0)


def minutes(hhmm: str) -> int:
    """'HH:MM' → 자정부터 분. '24:00' = 1440."""
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def minute_of_day(now: datetime) -> int:
    return now.hour * 60 + now.minute


def is_open(store: dict, now: datetime) -> bool:
    o, c, m = minutes(store["open"]), minutes(store["close"]), minute_of_day(now)
    if c > o:
        return o <= m < c
    return m >= o or m < c          # 자정을 넘기는 영업


def closes_in_min(store: dict, now: datetime) -> int | None:
    """영업 중이면 마감까지 남은 분, 아니면 None."""
    if not is_open(store, now):
        return None
    return (minutes(store["close"]) - minute_of_day(now)) % 1440 or 1440


def meal(now: datetime) -> str | None:
    m = minute_of_day(now)
    if LUNCH[0] <= m < LUNCH[1]:
        return "lunch"
    if DINNER[0] <= m < DINNER[1]:
        return "dinner"
    return None
