"""비밀번호 해시(scrypt)와 로그인 토큰(JWT, HS256). JWT_SECRET이 없으면 개발용 임의값을 만들고 경고한다."""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
import time
from functools import lru_cache

import jwt

TOKEN_TTL_S = 7 * 24 * 3600
_ALGORITHM = "HS256"
_SCRYPT = {"n": 2 ** 14, "r": 8, "p": 1}
log = logging.getLogger("jejueat")


@lru_cache(maxsize=1)
def jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET", "")
    if not secret:
        log.warning("JWT_SECRET 환경변수가 없어 개발용 임의 비밀값을 만듭니다(서버를 다시 켜면 로그인이 풀려요)")
        secret = secrets.token_hex(32)
    return secret


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, dklen=32, **_SCRYPT)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    return f"{salt.hex()}${_derive(password, salt).hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    """stored가 None(없는 계정)이어도 같은 계산을 하고 False를 돌려준다(시간 차이로 계정 유무를 알 수 없게)."""
    salt_hex, _, digest_hex = (stored or ("00" * 16 + "$")).partition("$")
    same = hmac.compare_digest(_derive(password, bytes.fromhex(salt_hex)).hex(), digest_hex)
    return same and stored is not None


def create_token(user_id: int) -> str:
    now = int(time.time())
    return jwt.encode({"sub": str(user_id), "iat": now, "exp": now + TOKEN_TTL_S}, jwt_secret(), algorithm=_ALGORITHM)


def read_token(token: str) -> int | None:
    try:
        claims = jwt.decode(token, jwt_secret(), algorithms=[_ALGORITHM], options={"require": ["exp", "sub"]})
        return int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
