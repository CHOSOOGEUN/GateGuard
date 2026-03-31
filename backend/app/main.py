from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, cameras, events, notifications, websocket
from app.core.config import settings
from app.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    [GateGuard] 애플리케이션 수명 주기 관리
    - 현재는 Alembic을 통한 마이그레이션 방식을 채택하여 별도의 초기화 로직은 스킵합니다.
    """
    yield


app = FastAPI(
    title="GateGuard API 🛰️",
    description="지하철 개찰구 무임승차 자동 감지 및 실시간 관제 시스템 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [GateGuard] 전략적 API 라우터 등록
app.include_router(auth.router, prefix="/api")
app.include_router(cameras.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(websocket.router)


@app.get("/health", tags=["system"])
async def health():
    """
    [GateGuard] 서버 건전성 체크 엔드포인트
    """
    return {"status": "ok", "service": "gateguard-backend"}
