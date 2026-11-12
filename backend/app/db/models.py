"""DB 표: 가게, 상품, 사용자, 주문, 에이전트 실행 기록. 분류·시장·배송지는 data/*.json을 그대로 읽는다."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Store(Base):
    __tablename__ = "stores"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)            # restaurant | market
    category: Mapped[str] = mapped_column(String)
    label: Mapped[str] = mapped_column(String, default="")
    icon: Mapped[str] = mapped_column(String, default="")
    story: Mapped[str] = mapped_column(String, default="")
    open: Mapped[str] = mapped_column(String)            # HH:MM
    close: Mapped[str] = mapped_column(String)
    prep_min: Mapped[int] = mapped_column(Integer)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    rating: Mapped[float] = mapped_column(Float)
    delivery_fee: Mapped[int] = mapped_column(Integer, default=0)


class Product(Base):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    price: Mapped[int] = mapped_column(Integer)
    emoji: Mapped[str] = mapped_column(String, default="")
    temp: Mapped[str] = mapped_column(String)            # cold | hot | room
    stock: Mapped[int] = mapped_column(Integer)
    serves: Mapped[int] = mapped_column(Integer, default=1)
    tags: Mapped[list] = mapped_column(JSON, default=list)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="customer")     # customer | merchant
    store_id: Mapped[str | None] = mapped_column(String, nullable=True)
    prefs: Mapped[dict] = mapped_column(JSON, default=dict)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(String, default="received")
    destination: Mapped[dict] = mapped_column(JSON)
    items: Mapped[list] = mapped_column(JSON)
    quote: Mapped[dict] = mapped_column(JSON)
    agent_run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    history: Mapped[list] = mapped_column(JSON, default=list)


class AgentRun(Base):
    __tablename__ = "agent_runs"
    run_id: Mapped[str] = mapped_column(String, primary_key=True)
    flow: Mapped[str] = mapped_column(String)
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
