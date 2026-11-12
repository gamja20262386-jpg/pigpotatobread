"""인증: 시연 로그인, 가입, 로그인, 내 정보, 개인화 설정."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import current_user
from app.core.security import create_token, hash_password, verify_password
from app.db.models import User
from app.db.seed import DEMO_USERS
from app.db.session import get_session
from app.tools.data import destinations

router = APIRouter(prefix="/v1")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def user_view(u: User) -> dict:
    prefs = u.prefs or {}
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "store_id": u.store_id,
            "prefs": {"destination_id": prefs.get("destination_id"), "likes": list(prefs.get("likes") or [])}}


def _auth_reply(u: User) -> dict:
    return {"token": create_token(u.id), "user": user_view(u)}


class DemoIn(BaseModel):
    role: str = Field(pattern="^(customer|merchant)$")


class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    email: str = Field(max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(max_length=120)
    password: str = Field(max_length=128)


class PrefsIn(BaseModel):
    destination_id: str | None = None
    likes: list[str] | None = Field(default=None, max_length=20)


@router.post("/auth/demo")
def demo_login(body: DemoIn, session: Session = Depends(get_session)):
    u = session.execute(select(User).where(User.email == DEMO_USERS[body.role]["email"])).scalar_one_or_none()
    if u is None:
        raise HTTPException(503, "시연 계정이 아직 준비되지 않았어요")
    return _auth_reply(u)


@router.post("/auth/signup")
def signup(body: SignupIn, session: Session = Depends(get_session)):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "이메일 형식이 올바르지 않아요")
    if session.execute(select(User.id).where(User.email == email)).first():
        raise HTTPException(409, "이미 가입한 이메일이에요")
    u = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role="customer",
             prefs={"destination_id": None, "likes": []})
    session.add(u)
    session.commit()
    return _auth_reply(u)


@router.post("/auth/login")
def login(body: LoginIn, session: Session = Depends(get_session)):
    u = session.execute(select(User).where(User.email == body.email.strip().lower())).scalar_one_or_none()
    if not verify_password(body.password, u.password_hash if u else None) or u is None:
        raise HTTPException(401, "이메일이나 비밀번호가 맞지 않아요")
    return _auth_reply(u)


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"user": user_view(user)}


@router.patch("/me/prefs")
def update_prefs(body: PrefsIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    prefs = dict(user.prefs or {})
    if body.destination_id is not None:
        if body.destination_id not in destinations():
            raise HTTPException(400, "없는 배송지예요")
        prefs["destination_id"] = body.destination_id
    if body.likes is not None:
        prefs["likes"] = list(dict.fromkeys(s.strip()[:20] for s in body.likes if s.strip()))
    user.prefs = prefs
    session.add(user)
    session.commit()
    return {"user": user_view(user)}
