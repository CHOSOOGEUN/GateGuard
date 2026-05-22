from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.models import Notification, Admin
from app.schemas.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = 50, 
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    [GateGuard] 알림 이력을 조회합니다. (M2 완결용)
    """
    query = select(Notification).order_by(Notification.sent_at.desc()).limit(limit)
    if unread_only:
        query = query.where(Notification.read_at == None)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """
    [GateGuard] 특정 알림을 읽음 처리합니다.
    """
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
        
    notification.read_at = func.now()
    await db.commit()
    return {"message": "Success", "id": notification_id}

@router.post("/read-all")
async def mark_all_notifications_as_read(db: AsyncSession = Depends(get_db)):
    """
    [GateGuard] 모든 알림을 한꺼번에 읽음 처리합니다.
    """
    await db.execute(update(Notification).values(read_at=func.now()))
    await db.commit()
    return {"message": "All notifications marked as read"}
