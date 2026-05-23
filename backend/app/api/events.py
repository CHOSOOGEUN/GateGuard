import re
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, or_, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.api.websocket import manager
from app.database import get_db
from app.models.models import Event, Notification, Admin, Camera
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
    response: Response,
    camera_id: Optional[int] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    station: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
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
    query = select(Event)

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

    # Camera 조인은 station 필터나 search 가 들어올 때만 (중복 join 방지)
    station_q = station.strip() if station else ""
    search_q = search.strip() if search else ""
    if station_q or search_q:
        query = query.join(Camera, Event.camera_id == Camera.id)

    # 역 이름 명시 필터
    if station_q:
        query = query.where(Camera.station_name.ilike(f"%{station_q}%"))

    # 서버사이드 통합 검색: EV-번호 / CAM-번호 / 역이름 / 게이트(위치) / event_type / reason
    if search_q:
        pattern = f"%{search_q}%"
        conds = [
            Camera.station_name.ilike(pattern),
            Camera.location.ilike(pattern),
            Event.event_type.ilike(pattern),
            Event.reason.ilike(pattern),
        ]
        m = re.search(r"EV[-_]?(\d+)", search_q, re.IGNORECASE)
        if m:
            conds.append(Event.id == int(m.group(1)))
        m = re.search(r"CAM[-_]?(\d+)", search_q, re.IGNORECASE)
        if m:
            conds.append(Event.camera_id == int(m.group(1)))
        if search_q.isdigit():
            conds.append(Event.id == int(search_q))
        query = query.where(or_(*conds))

    # 필터링된 전체 건수를 X-Total-Count 헤더로 노출 (페이지네이션 메타)
    # CORS expose 는 main.py 의 CORSMiddleware(expose_headers=...) 에서 처리
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    response.headers["X-Total-Count"] = str(total or 0)

    query = query.order_by(Event.timestamp.desc()).offset(offset).limit(limit)

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
    false_alarm_count = await db.scalar(select(func.count(Event.id)).where(Event.status == 'false_alarm'))
    
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


@router.get("/stats/by-type")
async def get_stats_by_type(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """이벤트 유형별 집계 (StatsPage EventTypeChart 용)."""
    q = (
        select(Event.event_type, func.count(Event.id).label("count"))
        .group_by(Event.event_type)
        .order_by(func.count(Event.id).desc())
    )
    result = await db.execute(q)
    return [{"event_type": row.event_type, "count": row.count} for row in result.all()]


@router.get("/stats/hourly")
async def get_stats_hourly(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    """시간대(0~23)별 발생 건수 (StatsPage HourlyDistributionChart 용).
    date_from/date_to 로 기간 제한 가능 (기본: 전체)."""
    hour_col = extract("hour", Event.timestamp).label("hour")
    q = select(hour_col, func.count(Event.id).label("count")).group_by(hour_col).order_by(hour_col)
    if date_from:
        q = q.where(Event.timestamp >= date_from)
    if date_to:
        q = q.where(Event.timestamp <= date_to)
    result = await db.execute(q)
    return [{"hour": int(row.hour), "count": row.count} for row in result.all()]


@router.get("/stats/daily")
async def get_stats_daily(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    days: int = 30,
):
    """최근 N일(기본 30일) 일자별 발생 건수 (StatsPage DailyTrendChart 용)."""
    cutoff = datetime.now() - timedelta(days=max(days, 1))
    day_col = func.date(Event.timestamp).label("day")
    q = (
        select(day_col, func.count(Event.id).label("count"))
        .where(Event.timestamp >= cutoff)
        .group_by(day_col)
        .order_by(day_col)
    )
    result = await db.execute(q)
    return [{"day": str(row.day), "count": row.count} for row in result.all()]


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
    # 0. 카메라 검증 — 존재해야 하고 활성 상태여야 이벤트를 받음
    camera = await db.scalar(select(Camera).where(Camera.id == body.camera_id))
    if not camera:
        raise HTTPException(status_code=404, detail=f"카메라 #{body.camera_id} 가 존재하지 않습니다.")
    if not camera.is_active:
        raise HTTPException(status_code=400, detail=f"카메라 #{body.camera_id} 가 비활성 상태입니다.")

    # 1. DB에 사건 기록 (Persistence)
    # exclude_none: 비전송 필드는 모델 default 가 적용되도록 (event_type → 'unknown')
    event = Event(**body.model_dump(exclude_none=True))
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
        
    event.status = "false_alarm"
    event.reason = body.reason
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
