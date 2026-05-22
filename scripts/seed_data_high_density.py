import asyncio
import random
from datetime import datetime, timedelta
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import sys
import os
sys.path.append("/app")

from app.models.models import Camera, Event, Notification
from app.core.config import settings

# DB 설정
DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

STATIONS = ["강남역", "홍대입구역", "판교역", "수원역", "광교중앙역"]
EVENT_TYPES = ["jump", "tag_fail", "emergency_door"]

async def seed_data():
    async with AsyncSessionLocal() as session:
        # 1. 카메라 데이터 확인 및 생성
        result = await session.execute(select(Camera))
        cameras = result.scalars().all()
        
        if not cameras:
            print("Creating cameras...")
            for i, station in enumerate(STATIONS):
                camera = Camera(location=f"개찰구 {i+1}", station_name=station, is_active=True)
                session.add(camera)
            await session.commit()
            result = await session.execute(select(Camera))
            cameras = result.scalars().all()
        
        print(f"Cameras found: {len(cameras)}")
        
        # 2. 대량 이벤트 데이터 생성 (5,000건)
        print("Generating 5,000 events for the last 30 days...")
        events_to_insert = []
        now = datetime.now()
        
        for _ in range(5000):
            camera = random.choice(cameras)
            event_type = random.choice(EVENT_TYPES)
            # 최근 30일 내 랜덤 시점
            days_ago = random.uniform(0, 30)
            timestamp = now - timedelta(days=days_ago)
            
            events_to_insert.append({
                "camera_id": camera.id,
                "timestamp": timestamp,
                "event_type": event_type,
                "confidence": random.uniform(0.7, 0.99),
                "status": random.choice(["confirmed", "dismissed", "pending"]),
                "clip_url": f"https://s3.example.com/videos/test_{random.randint(100, 999)}.mp4"
            })
        
        # 벌크 인서트
        await session.execute(insert(Event), events_to_insert)
        await session.commit()
        print("Successfully inserted 5,000 events.")

        # 3. 알림 데이터 생성 (일부 반영)
        print("Generating notifications for recent events...")
        result = await session.execute(select(Event.id).limit(1000))
        event_ids = result.scalars().all()
        
        notifs_to_insert = []
        for eid in event_ids:
            notifs_to_insert.append({"event_id": eid, "sent_at": now})
            
        await session.execute(insert(Notification), notifs_to_insert)
        await session.commit()
        print("Successfully inserted 1,000 notifications.")

if __name__ == "__main__":
    asyncio.run(seed_data())
