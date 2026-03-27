from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database import init_db
from app.api import auth, cameras, events, notifications, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 DB 초기화
    await init_db()
    yield
    # 종료 시 cleanup (필요 시 추가)


app = FastAPI(
    title="GateGuard API",
    description="🛡️ 지하철 개찰구 무임승차 감지 시스템 백엔드 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["인증"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["카메라"])
app.include_router(events.router, prefix="/api/events", tags=["감지 이벤트"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["알림"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


@app.get("/", tags=["헬스체크"])
async def root():
    return {"message": "GateGuard API is running 🛡️", "version": "0.1.0"}


@app.get("/health", tags=["헬스체크"])
async def health_check():
    return {"status": "healthy"}
