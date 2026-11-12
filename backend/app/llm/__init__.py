"""LLM 공급자 선택: 환경변수(LLM_PROVIDER, OLLAMA_URL, OLLAMA_MODEL, LLM_DEADLINE_S) > harness.yaml. off → None."""
from __future__ import annotations

import os

from app.llm.base import DEADLINE_S, LLMProvider, LLMReply, call_with_deadline
from app.tools.data import load_harness

__all__ = ["LLMProvider", "LLMReply", "get_provider", "llm_settings", "provider_health"]


def llm_settings() -> dict:
    return load_harness()["llm"]


def _deadline(cfg: dict) -> float:
    try:
        return float(os.environ.get("LLM_DEADLINE_S") or cfg.get("deadline_s") or DEADLINE_S)
    except (TypeError, ValueError):
        return DEADLINE_S


def provider_name(name: str | None = None) -> str:
    return (name or os.environ.get("LLM_PROVIDER") or llm_settings().get("provider") or "off").lower()


def get_provider(name: str | None = None) -> LLMProvider | None:
    cfg = llm_settings()
    name = provider_name(name)
    if name == "ollama":
        from app.llm.ollama import OllamaProvider
        o = cfg["ollama"]
        return OllamaProvider(os.environ.get("OLLAMA_URL") or o["url"], os.environ.get("OLLAMA_MODEL") or o["model"],
                              o.get("timeout_s", 20), _deadline(cfg))
    if name == "claude":
        from app.llm.claude import ClaudeProvider
        c = cfg["claude"]
        return ClaudeProvider(c["model"], c.get("max_tokens", 1500), _deadline(cfg))
    if name == "mock":
        from app.llm.mock import MockProvider
        return MockProvider()
    return None


def provider_health(name: str | None = None) -> dict:
    """{provider, model, available}: 실제로 확인한다(Ollama /api/tags 1초, Claude는 키 존재, off는 False)."""
    p = get_provider(name)
    if p is None:
        return {"provider": "off", "model": "", "available": False}
    if p.name == "ollama":
        try:
            import httpx
            ok = call_with_deadline(lambda: httpx.get(f"{p.url}/api/tags", timeout=1).status_code == 200, 1.0)
        except Exception:
            ok = False
    elif p.name == "claude":
        ok = bool(os.environ.get("ANTHROPIC_API_KEY"))
    else:
        ok = True
    return {"provider": p.name, "model": p.model, "available": ok}
