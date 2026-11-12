"""FastAPI 앱 조립. 모든 API는 /v1 아래, 오류는 {detail: "한국어 문장"}."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.security import jwt_secret
from app.db.models import Base
from app.db.seed import seed
from app.db.session import SessionLocal, engine
from app.features.agent.router import router as agent
from app.features.auth.router import router as auth
from app.features.cart.router import router as cart
from app.features.catalog.router import router as catalog
from app.features.merchant.router import router as merchant
from app.features.orders.router import router as orders
from app.llm import provider_health


@asynccontextmanager
async def lifespan(app: FastAPI):
    jwt_secret()        # 없으면 여기서 개발용 값을 만들고 경고
    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        seed(s)
    yield


app = FastAPI(title="제주잇", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])   # Expo 웹(:8081) 개발용

DEFAULT_DETAIL = {400: "요청이 올바르지 않아요", 401: "로그인이 필요해요", 403: "권한이 없어요", 404: "찾을 수 없어요",
                  405: "지원하지 않는 요청 방식이에요", 409: "지금 상태로는 처리할 수 없어요", 500: "서버에서 문제가 생겼어요"}


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) and any("가" <= ch <= "힣" for ch in exc.detail) else None
    return JSONResponse(status_code=exc.status_code, content={"detail": detail or DEFAULT_DETAIL.get(exc.status_code, "요청을 처리하지 못했어요")},
                        headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def bad_request(request: Request, exc: RequestValidationError):
    fields = ", ".join(".".join(str(x) for x in e["loc"] if x != "body") or "본문" for e in exc.errors()[:3])
    return JSONResponse(status_code=422, content={"detail": f"입력 값이 올바르지 않아요({fields})"})


for r in (auth, catalog, cart, agent, orders, merchant):
    app.include_router(r)


@app.get("/v1/health")
def health():
    llm = provider_health()
    return {"status": "ok", "llm": {"provider": llm["provider"], "model": llm["model"], "available": llm["available"]}}
