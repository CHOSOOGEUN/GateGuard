from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Event, Notification
from app.schemas.schemas import EventCreate, EventResponse
from app.workers.tasks import process_event_task

router = APIRouter()


@router.get("/", response_model=list[EventResponse])
async def get_events(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Event).order_by(Event.timestamp.desc()).limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(data: EventCreate, db: AsyncSession = Depends(get_db)):
    """AI 추론 결과로부터 무임승차 이벤트를 등록합니다."""
    event = Event(**data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # 비동기로 클립 저장 + 알림 발송 처리
    process_event_task.delay(str(event.id))

    return event


@router.patch("/{event_id}/status")
async def update_event_status(
    event_id: str,
    status: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event:
        event.status = status
        await db.commit()
    return {"message": "updated"}
