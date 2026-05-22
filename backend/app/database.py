from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """
    [GateGuard] SQLAlchemy 비동기 DB 세션을 생성하고 자동 반납합니다.
    - FastAPI의 Depends(get_db)를 통해 주입받아 사용합니다.
    """
    async with AsyncSessionLocal() as session:
        yield session
