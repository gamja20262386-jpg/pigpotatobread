"""DB가 비어 있으면 data/*.json(가게·상품)과 시연 계정(고객, dongmun-hoe 상인)을 넣는다.
시연 계정 비밀번호는 임의값이라 /auth/demo로만 로그인한다."""
from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import Product, Store, User
from app.tools.data import load_json, market

DEMO_USERS = {
    "customer": {"name": "시연 고객", "email": "customer@jejueat.demo", "role": "customer", "store_id": None},
    "merchant": {"name": "동문 바당횟집 사장님", "email": "merchant@jejueat.demo", "role": "merchant", "store_id": "dongmun-hoe"},
}


def seed(session: Session) -> None:
    if session.execute(select(Store.id).limit(1)).first() is None:
        session.add_all(Store(**s) for s in load_json("stores.json"))
        session.flush()
        session.add_all(Product(**p) for p in load_json("products.json"))
    for u in DEMO_USERS.values():
        if session.execute(select(User.id).where(User.email == u["email"])).first() is None:
            session.add(User(**u, password_hash=hash_password(secrets.token_urlsafe(16)),
                             prefs={"destination_id": market()["default_destination"], "likes": []}))
    session.commit()
