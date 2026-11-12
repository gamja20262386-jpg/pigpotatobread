"""공통 의존성: 로그인 사용자, 역할 확인, X-Demo-Time 시각."""
from __future__ import annotations

from datetime import datetime

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.security import read_token
from app.db.models import User
from app.db.session import get_session
from app.tools import clock


def _resolve(authorization: str | None, session: Session) -> User | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    uid = read_token(token.strip()) if scheme.lower() == "bearer" else None
    return session.get(User, uid) if uid is not None else None


def current_user(authorization: str | None = Header(default=None), session: Session = Depends(get_session)) -> User:
    user = _resolve(authorization, session)
    if user is None:
        raise HTTPException(401, "로그인이 필요해요")
    return user


def optional_user(authorization: str | None = Header(default=None), session: Session = Depends(get_session)) -> User | None:
    return _resolve(authorization, session)


def customer_user(user: User = Depends(current_user)) -> User:
    if user.role != "customer":
        raise HTTPException(403, "고객 계정으로만 쓸 수 있어요")
    return user


def merchant_user(user: User = Depends(current_user)) -> User:
    if user.role != "merchant" or not user.store_id:
        raise HTTPException(403, "상인 계정으로만 쓸 수 있어요")
    return user


def demo_now(x_demo_time: str | None = Header(default=None)) -> datetime:
    """서버 기준 지금(KST). 시연용 X-Demo-Time: HH:MM이 있으면 그 시각."""
    try:
        return clock.now_kst(x_demo_time)
    except ValueError as e:
        raise HTTPException(400, str(e)) from None
