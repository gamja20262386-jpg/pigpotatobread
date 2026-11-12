"""백엔드와 앱이 함께 쓰는 하네스 타입(docs/ARCHITECTURE.md §2). 바꾸려면 문서를 먼저 고친다."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

EvidenceKind = Literal["dataset", "calc", "input", "assumption", "llm"]
ClaimLevel = Literal["fact", "estimate", "assumption", "question"]


class Evidence(BaseModel):
    kind: EvidenceKind
    ref: str            # dataset → data/sources.json id, assumption → harness.yaml 키, 그 밖은 식·필드명·모델명
    label: str = ""


class Claim(BaseModel):
    agent_id: str
    text: str
    level: ClaimLevel = "fact"
    evidence: list[Evidence] = Field(default_factory=list)
    blocked: bool = False
    block_reasons: list[str] = Field(default_factory=list)


class AgentResult(BaseModel):
    agent_id: str
    ok: bool = True
    claims: list[Claim] = Field(default_factory=list)
    data: dict[str, Any] = Field(default_factory=dict)   # 숫자는 코드가 만든 값만
    used_llm: bool = False
    error: str | None = None


class RunEvent(BaseModel):
    seq: int
    type: Literal["plan", "agent_start", "agent_done", "gate", "llm", "summary", "done", "error"]
    payload: dict[str, Any] = Field(default_factory=dict)


class RunResult(BaseModel):
    run_id: str
    flow: str
    plan: list[str]
    results: list[AgentResult]
    public_claims: list[Claim]
    blocked_count: int
    summary: str
    summary_source: Literal["llm", "template"]
    llm: dict[str, Any]          # {"provider", "model", "available"}
    events: list[RunEvent]
