"""데이터 파일·harness.yaml 읽기 도구. 숫자 기준은 전부 여기서 읽어 쓴다(코드에 박지 않는다)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[3]      # 1팀/ (backend/의 부모)
DATA_DIR = ROOT / "data"
HARNESS_DIR = ROOT / "harness"


@lru_cache(maxsize=None)
def load_json(name: str) -> Any:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_harness() -> dict:
    return yaml.safe_load((HARNESS_DIR / "harness.yaml").read_text(encoding="utf-8"))


def assumptions() -> dict:
    return load_harness()["assumptions"]


def source_ids() -> set[str]:
    return {s["id"] for s in load_json("sources.json")}


@lru_cache(maxsize=1)
def forbidden_phrases() -> list[str]:
    path = HARNESS_DIR / "policies" / "forbidden-phrases.json"
    return [p["phrase"] for p in json.loads(path.read_text(encoding="utf-8"))]


def market() -> dict:
    return load_json("market.json")


def destinations() -> dict[str, dict]:
    return {d["id"]: d for d in market()["destinations"]}


def seed_catalog() -> dict:
    """DB가 없을 때(에이전트 단독 실행·테스트) 쓰는 시드 카탈로그. {stores: {id: dict}, products: {id: dict}}"""
    return {"stores": {s["id"]: dict(s) for s in load_json("stores.json")},
            "products": {p["id"]: dict(p) for p in load_json("products.json")}}


def catalog_of(ctx: dict) -> dict:
    """에이전트가 보는 카탈로그: 라우터가 넣은 DB 스냅숏(ctx.catalog), 없으면 시드 JSON."""
    return ctx.get("catalog") or seed_catalog()
