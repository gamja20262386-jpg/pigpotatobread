"""설정: 환경변수."""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]      # backend/


def database_url() -> str:
    return os.environ.get("DATABASE_URL") or f"sqlite:///{BACKEND_DIR / 'jejueat.db'}"
