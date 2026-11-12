"""엔진·세션. 기본은 backend/jejueat.db(SQLite 파일). 테스트는 get_session을 메모리 DB로 바꾼다."""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import database_url


def make_engine(url: str):
    if url in ("sqlite://", "sqlite:///:memory:"):      # 메모리 DB는 연결 하나를 같이 쓴다
        return create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    return create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {})


engine = make_engine(database_url())
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session():
    with SessionLocal() as session:
        yield session
