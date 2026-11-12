"""테스트용 LLM(네트워크 없음). 기본 동작:
- 스키마에 summary가 있으면 user 글의 '- [에이전트:번호] 주장' 줄을 그대로 이어 붙인다(새 숫자 없음).
- 그 밖의 스키마는 타입별 빈 값(문자열 "", 숫자 0, 목록 [], 참거짓 false)."""
from __future__ import annotations

from typing import Callable

from app.llm.base import LLMReply

EMPTY = {"string": "", "integer": 0, "number": 0, "array": [], "boolean": False, "object": {}}


def _claim_lines(user: str) -> str:
    return " ".join(ln[2:].split("] ", 1)[-1] if ln.startswith("- [") else ln[2:]
                    for ln in user.splitlines() if ln.startswith("- "))


class MockProvider:
    name = "mock"
    model = "mock-1"

    def __init__(self, reply_fn: Callable[[str, str, dict | None], str | dict] | None = None, fail: bool = False):
        self.reply_fn = reply_fn
        self.fail = fail
        self.calls: list[tuple[str, str, dict | None]] = []

    def chat(self, system: str, user: str, schema: dict | None = None) -> LLMReply:
        self.calls.append((system, user, schema))
        if self.fail:
            raise RuntimeError("mock LLM 실패")
        if self.reply_fn:
            out = self.reply_fn(system, user, schema)
        elif schema and "summary" in schema.get("properties", {}):
            out = {"summary": _claim_lines(user)}
        elif schema:
            out = {k: EMPTY.get(v.get("type") if isinstance(v.get("type"), str) else "string", "")
                   for k, v in schema.get("properties", {}).items()}
        else:
            out = _claim_lines(user)
        if isinstance(out, dict):
            return LLMReply(text=str(out), data=out, model=self.model, ms=1)
        return LLMReply(text=out, data={"summary": out} if schema else None, model=self.model, ms=1)
