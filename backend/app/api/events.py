from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.api.websocket import manager
from app.database import get_db
from app.models.models import Event, Notification, Admin
from app.schemas.schemas import EventCreate, EventResponse, EventStatusUpdate
from app.workers.tasks import upload_clip_task

# 라우터 기초 설정 (최종 통합본 v1)
router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[EventResponse])
async def list_events(
    camera_id: int | None = None,
    status: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    [통합 v1] 모든 무임승차 이벤트를 최신순으로 조회합니다. (보안 인증 필수)
    """
    query = select(Event).order_by(Event.timestamp.desc()).limit(limit)
    if camera_id:
        query = query.where(Event.camera_id == camera_id)
    if status:
        query = query.where(Event.status == status)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(
    body: EventCreate, 
    db: AsyncSession = Depends(get_db)
):
    """
    [통합 v1] AI 실시간 추론 결과로부터 이벤트를 기록하고 방송합니다.
    """
    # 1. DB에 사건 기록 (Persistence)
    event = Event(**body.model_dump())
    db.add(event)
    await db.flush()

    # 2. 실시간 알림 레코드 생성
    notification = Notification(event_id=event.id)
    db.add(notification)
    await db.commit()
    await db.refresh(event)

    # 3. 📡 [광속 전송] 관리자 브라우저에 실시간 데이터 브로드캐스트
    await manager.broadcast({
        "type": "NEW_EVENT",
        "data": EventResponse.model_validate(event).model_dump()
    })

    # 4. 🎥 [비동기 위임] 영상 클립은 무거우니 셀러리 워커에 위임하여 처리
    if event.clip_url:
        upload_clip_task.delay(event.id, event.clip_url)

    return event


@router.patch("/{event_id}/status", response_model=EventResponse)
async def update_event_status(
    event_id: int, 
    body: EventStatusUpdate, 
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    [통합 v1] 무임승차 이벤트의 상태(오감지, 완료 등)를 수동 업데이트합니다. (보안 인증 필수)
    """
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="해당 사건 기록을 찾을 수 없습니다.")
    
    event.status = body.status
    await db.commit()
    await db.refresh(event)
    return event
