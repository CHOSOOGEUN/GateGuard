from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models.models import Notification
from app.schemas.schemas import NotificationResponse

router = APIRouter()


@router.get("/", response_model=list[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).order_by(Notification.sent_at.desc())
    if unread_only:
        query = query.where(Notification.read_at == None)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/{notification_id}/read")
async def mark_as_read(notification_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    if notification:
        notification.read_at = datetime.utcnow()
        await db.commit()
    return {"message": "읽음 처리 완료"}
