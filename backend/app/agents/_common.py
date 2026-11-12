"""에이전트 공통 도우미: 주장·근거 만들기, 개인정보 가리기, 메시지 낱말 다루기, ctx에서 시각 읽기."""
from __future__ import annotations

import re
from datetime import datetime

from app.contracts import Claim, Evidence
from app.harness.gates import EMAIL_RE, PHONE_RE, RRN_RE
from app.tools import clock

LLM_LABEL = "말에서 추출(확인 필요)"


def ev(kind: str, ref: str, label: str = "") -> Evidence:
    return Evidence(kind=kind, ref=ref, label=label)


def claim(agent_id: str, text: str, level: str, *evidence: Evidence) -> Claim:
    return Claim(agent_id=agent_id, text=text, level=level, evidence=list(evidence))


LONG_DIGITS_RE = re.compile(r"\d(?:[\s()./-]*\d){6,}")     # 게이트 모양을 벗어난 긴 숫자


def mask_personal(text: str) -> str:
    """전화번호·이메일·주민번호 모양을 가린다(LLM에 보내기 전). 모양은 게이트와 같은 정규식."""
    for rx in (RRN_RE, PHONE_RE, EMAIL_RE, LONG_DIGITS_RE):
        text = rx.sub("[가림]", text)
    return text


def squash(s: str) -> str:
    return re.sub(r"\s+", "", str(s)).lower()


def ctx_now(ctx: dict) -> datetime:
    now = ctx.get("now")
    return now if isinstance(now, datetime) else clock.now_kst()


def llm_ev(llm) -> Evidence:
    return ev("llm", getattr(llm, "model", "") or "llm", LLM_LABEL)
