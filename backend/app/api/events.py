from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.api.websocket import manager
from app.database import get_db
from app.models.models import Event, Notification, Admin
from app.schemas.schemas import EventCreate, EventResponse, EventStatusUpdate
from app.workers.tasks import upload_clip_task
from pydantic import BaseModel
from sqlalchemy import func

class FalseAlarmRequest(BaseModel):
    reason: str

# 라우터 기초 설정 (최종 통합본 v1)
router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[EventResponse])
async def list_events(
    camera_id: Optional[int] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
) -> list[Event]:
    """
    [통합 v1] 모든 무임승차 이벤트를 최신순으로 조회합니다. (보안 인증 필수)
    
    Args:
        camera_id: 특정 카메라 ID로 필터링 (선택)
        status: 이벤트 상태로 필터링 (선택)
        type: 무임승차 유형별 필터링 (선택)
        date_from: 시작일 (선택)
        date_to: 종료일 (선택)
        limit: 조회할 최대 이벤트 개수 (기본값: 50)
        offset: 페이지네이션 오프셋 (기본값: 0)
        db: SQLAlchemy 비동기 세션
        current_admin: 인증된 관리자 객체
        
    Returns:
        list[Event]: 조회된 이벤트 객체 리스트
    """
    query = select(Event).order_by(Event.timestamp.desc()).offset(offset).limit(limit)
    
    if camera_id is not None:
        query = query.where(Event.camera_id == camera_id)
    if status:
        query = query.where(Event.status == status)
    if type:
        query = query.where(Event.event_type == type)
    if date_from:
        query = query.where(Event.timestamp >= date_from)
    if date_to:
        query = query.where(Event.timestamp <= date_to)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def get_event_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """[M2] 대시보드 상단 통계 카드 데이터 조회 API"""
    start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_total = await db.scalar(select(func.count(Event.id)).where(Event.timestamp >= start_of_day))
    pending_count = await db.scalar(select(func.count(Event.id)).where(Event.status == 'pending'))
    confirmed_count = await db.scalar(select(func.count(Event.id)).where(Event.status == 'confirmed'))
    false_alarm_count = await db.scalar(select(func.count(Event.id)).where(Event.status == 'dismissed'))
    
    return {
        "today_total": today_total or 0,
        "pending": pending_count or 0,
        "confirmed": confirmed_count or 0,
        "false_alarm": false_alarm_count or 0
    }


@router.get("/stats/by-camera")
async def get_camera_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """[M2] 대시보드 우측 역별/게이트별 통계 (카메라별 집계) API"""
    query = select(Event.camera_id, func.count(Event.id).label("count")).group_by(Event.camera_id)
    result = await db.execute(query)
    return [{"camera_id": row.camera_id, "count": row.count} for row in result.all()]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_admin: Admin = Depends(get_current_admin)
):
    """[M2] 단건 이벤트 상세보기 API (상세보기 버튼 동작)"""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="해당 사건 기록을 찾을 수 없습니다.")
    return event


@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(
    body: EventCreate, 
    db: AsyncSession = Depends(get_db)
) -> Event:
    """
    [GateGuard] AI 실시간 추론 결과로부터 무임승차 이벤트를 기록하고 관제 대시보드에 즉시 브로드캐스트합니다.
    - AI 추론 엔진(inference.py)에서 호출됩니다.
    """
    # 1. DB에 사건 기록 (Persistence)
    event = Event(**body.model_dump())
    db.add(event)
    await db.flush()

    # 2. 실시간 알림 레코드 생성 (관제 기록용)
    notification = Notification(event_id=event.id)
    db.add(notification)
    await db.commit()
    await db.refresh(event)

    # 3. 📡 [광속 전송] 관리자 브라우저에 실시간 데이터 브로드캐스트
    await manager.broadcast({
        "type": "NEW_EVENT",
        "data": EventResponse.model_validate(event).model_dump()
    })

    # 4. 🎥 [비동기 위임] 영상 클립은 무거우니 Celery 워커에 스케줄링 위임
    if event.clip_url:
        upload_clip_task.delay(event.id, event.clip_url)

    return event


@router.post("/{event_id}/false-alarm", response_model=EventResponse)
async def report_false_alarm(
    event_id: int,
    body: FalseAlarmRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """[M2] 오탐 신고 접수 API"""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="해당 사건 기록을 찾을 수 없습니다.")
        
    event.status = "dismissed"
    event.handled_by = current_admin.id
    event.handled_at = datetime.now()
    
    await db.commit()
    await db.refresh(event)

    # 실시간 상태 변경 브로드캐스트
    await manager.broadcast({
        "type": "EVENT_STATUS_UPDATED",
        "data": {
            "id": event.id,
            "status": event.status,
            "handled_by_employee_id": current_admin.employee_id,
            "reason": body.reason
        }
    })

    return event


@router.patch("/{event_id}/status", response_model=EventResponse)
async def update_event_status(
    event_id: int, 
    body: EventStatusUpdate, 
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
) -> Event:
    """
    [GateGuard] 특정 무임승차 사건의 처리 상태(오감지, 조치완료 등)를 수동 업데이트하고 기록을 남깁니다.
    - 권한: 인증된 관리자(Admin)만 가능하며, 조치한 사원의 정보가 영구 기록됩니다.
    """
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="해당 사건 기록을 찾을 수 없습니다.")
    
    # 🛡️ 지휘권 각인
    event.status = body.status
    event.handled_by = current_admin.id
    event.handled_at = datetime.now()
    
    await db.commit()
    await db.refresh(event)

    # 📡 실시간 상태 변경 브로드캐스트 (모든 대시보드 동기화)
    await manager.broadcast({
        "type": "EVENT_STATUS_UPDATED",
        "data": {
            "id": event.id,
            "status": event.status,
            "handled_by_employee_id": current_admin.employee_id
        }
    })

    return event
