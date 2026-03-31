from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    [GateGuard] 서버 전역 예외 처리기
    - 예기치 못한 에러(500) 발생 시 프론트엔드가 인지할 수 있도록 표준 JSON 포맷을 반환합니다.
    """
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "서버 내부 오류가 발생했습니다. (Internal Server Error)",
            "detail": str(exc) if settings.DEBUG else "시스템 관리자에게 문의하세요."
        },
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
