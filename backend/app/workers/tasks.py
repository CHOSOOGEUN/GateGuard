import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.workers.celery_app import celery_app


from sqlalchemy import update
from app.database import engine
from app.models.models import Event

import asyncio
import datetime
from sqlalchemy import select

@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def upload_clip_task(self, event_id: int, local_path: str):
    """무임승차 영상 클립을 S3에 업로드하고 DB를 업데이트합니다."""
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        s3_key = f"clips/event_{event_id}_{int(datetime.datetime.now().timestamp())}.mp4"
        s3.upload_file(local_path, settings.AWS_S3_BUCKET, s3_key)
        
        # 🛡️ 수근 팀장님의 'DB URL 연동 마감' 지침 100% 준수
        clip_url = f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        
        # 🧪 비동기 엔진으로 DB 업데이트 (Celery 워커용 브릿지)
        async def update_db():
            from app.database import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Event).filter(Event.id == event_id))
                event = result.scalars().first()
                if event:
                    event.clip_url = clip_url
                    await db.commit()
                    print(f"🚀 [SUCCESS] Event #{event_id} clip_url updated via Async Bridge")
        
        asyncio.run(update_db())

        # 임시 로컬 파일 소각 (정렬 장교 작전)
        import os
        if os.path.exists(local_path):
            os.remove(local_path)

        return {"event_id": event_id, "clip_url": clip_url}
    except (ClientError, FileNotFoundError) as exc:
        raise self.retry(exc=exc)
