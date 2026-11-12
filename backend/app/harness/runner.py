"""run_flow: flow 순서대로 에이전트 실행 → 게이트 → 요약 → RunResult. 절대 예외를 내지 않는다."""
from __future__ import annotations

import time
import uuid

from app.agents.orchestrator import summarize, template_summary
from app.contracts import AgentResult, Claim, RunResult
from app.harness import registry
from app.harness.gates import apply_gates
from app.harness.trace import EventLog, remember
from app.llm import get_provider
from app.tools.data import load_harness

AUTO = "auto"


class _Tracked:
    """LLM 호출을 기록하고 실패를 세는 감싸개(실패는 그대로 다시 던진다).
    회로 차단: 한 번 실패하면 이 run의 나머지 LLM 호출은 건너뛴다(호출자는 규칙·템플릿으로).
    시간 예산: 한 run에서 LLM에 쓴 시간이 호출 1번 상한의 1.5배를 넘으면 나머지 호출을 건너뛴다(느린 성공이 쌓여 앱이 기다리다 끊지 않게).
    이벤트에는 예외 종류만 남긴다(예외 문장에 LLM 서버 주소가 들어갈 수 있음)."""

    def __init__(self, inner, log: EventLog):
        self.inner, self.name, self.model = inner, inner.name, inner.model
        self.log = log
        self.failures = 0
        self.calls = 0
        self.budget_s = float(getattr(inner, "deadline_s", 20)) * 1.5
        self.spent_s = 0.0

    def chat(self, system, user, schema=None):
        if self.failures:
            raise RuntimeError("LLM 이전 호출 실패로 건너뜀")
        if self.spent_s >= self.budget_s:
            self.log.add("llm", ok=False, error="시간 예산을 다 써서 건너뜀")
            raise RuntimeError("LLM 시간 예산 초과로 건너뜀")
        self.calls += 1
        t0 = time.monotonic()
        try:
            reply = self.inner.chat(system, user, schema)
        except Exception as e:
            self.spent_s += time.monotonic() - t0
            self.failures += 1
            self.log.add("llm", ok=False, error=type(e).__name__)
            raise
        self.spent_s += time.monotonic() - t0
        self.log.add("llm", ok=True, ms=reply.ms, model=reply.model or self.model)
        return reply


def _llm_flows() -> set[str]:
    """harness.yaml llm_flows: LLM을 쓰는 흐름(없으면 전부). 테스트처럼 llm을 직접 넘기면 이 목록과 상관없이 그것을 쓴다."""
    h = load_harness()
    return set(h.get("llm_flows") or h["flows"])


def run_flow(flow: str, ctx: dict, llm=AUTO) -> RunResult:
    run_id = uuid.uuid4().hex
    log = EventLog()
    tracked = None
    try:
        provider = (get_provider() if flow in _llm_flows() else None) if llm == AUTO else llm
        tracked = _Tracked(provider, log) if provider is not None else None
        result = _run(run_id, flow, ctx, tracked, log)
    except Exception as e:      # 마지막 방어선
        log.add("error", where="run_flow", message=type(e).__name__)
        result = RunResult(run_id=run_id, flow=flow, plan=[], results=[], public_claims=[], blocked_count=0,
                           summary=template_summary(flow, []), summary_source="template",
                           llm=_llm_info(tracked), events=log.events)
    remember(result)
    return result


def _llm_info(tracked) -> dict:
    if tracked is None:
        return {"provider": "off", "model": "", "available": False}
    return {"provider": tracked.name, "model": tracked.model, "available": tracked.failures == 0}


def _run(run_id: str, flow: str, ctx: dict, llm, log: EventLog) -> RunResult:
    plan = registry.flow_plan(flow)
    if plan is None:
        raise ValueError(f"알 수 없는 flow: {flow}")
    log.add("plan", flow=flow, agents=plan)
    ctx = dict(ctx or {})
    ctx["results"] = {}
    results: list[AgentResult] = []
    for agent_id in plan:
        log.add("agent_start", agent_id=agent_id)
        try:
            res = registry.get_agent(agent_id)(ctx, llm)
        except Exception as e:
            res = AgentResult(agent_id=agent_id, ok=False, error=f"{type(e).__name__}: {e}"[:300])
        ctx["results"][agent_id] = res.model_dump()
        results.append(res)
        log.add("agent_done", agent_id=agent_id, ok=res.ok, claims=len(res.claims), used_llm=res.used_llm, error=res.error)

    all_claims: list[Claim] = [c for r in results for c in r.claims]
    public, blocked = apply_gates(all_claims)
    log.add("gate", target="claims", passed=len(public), blocked=blocked,
            blocked_claims=[{"agent_id": c.agent_id, "reasons": c.block_reasons} for c in all_claims if c.blocked])

    summary, source = summarize(flow, public, llm, log, ctx)
    log.add("summary", source=source)
    log.add("done", run_id=run_id)
    return RunResult(run_id=run_id, flow=flow, plan=plan, results=results, public_claims=public, blocked_count=blocked,
                     summary=summary, summary_source=source, llm=_llm_info(llm), events=log.events)
