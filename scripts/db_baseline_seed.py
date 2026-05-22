import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import select, text

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.models import Admin, Camera, Event


# ── 시드 데이터 정의 ─────────────────────────────────────────────────────────

ADMIN_ACCOUNTS = [
    {"employee_id": "2026001", "email": "admin@gateguard.com", "password": "admin1234"},
    {"employee_id": "2026002", "email": "station01@gateguard.com", "password": "station1234"},
]

_SHINBUNDANG_STATIONS = ["광교역", "광교중앙역", "상현역"]
EVENT_TYPES = ["tag_fail", "jump", "emergency_door"]

TEST_CAMERAS = [
    {"location": f"개찰구 {g}번 게이트", "station_name": st, "is_active": True}
    for st in _SHINBUNDANG_STATIONS
    for g in (1, 2)
]


async def seed():
    async with AsyncSessionLocal() as session:
        print("── 관리자 계정 시딩 ──────────────────────────────────────────────")
        for account in ADMIN_ACCOUNTS:
            exists = await session.execute(
                select(Admin).where(Admin.email == account["email"])
            )
            if exists.scalar_one_or_none():
                print(f"  [SKIP] 관리자 이미 존재: {account['email']}")
                continue

            admin = Admin(
                employee_id=account["employee_id"],
                email=account["email"],
                password=hash_password(account["password"]),
            )
            session.add(admin)
            print(f"  [ADD]  관리자 생성: {account['email']}")

        print("\n── 카메라 데이터 시딩 ────────────────────────────────────────────")
        camera_ids = []
        for cam in TEST_CAMERAS:
            exists = await session.execute(
                select(Camera).where(
                    Camera.location == cam["location"],
                    Camera.station_name == cam["station_name"],
                )
            )
            existing_cam = exists.scalar_one_or_none()
            if existing_cam:
                print(f"  [SKIP] 카메라 이미 존재: {cam['station_name']} - {cam['location']}")
                camera_ids.append(existing_cam.id)
                continue

            camera = Camera(**cam)
            session.add(camera)
            await session.flush()  # ID 확보
            camera_ids.append(camera.id)
            print(f"  [ADD]  카메라 생성: {cam['station_name']} - {cam['location']}")

        print("\n── 시각화용 이벤트 데이터(High-Density) 시딩 ──────────────────────")
        # 지난 24시간 동안의 데이터 생성
        now = datetime.now()
        event_count = 0
        
        # 각 카메라별로 데이터 생성
        for cam_id in camera_ids:
            # 24시간 동안의 각 시간대에 대해 가짜 데이터 생성
            for h in range(24):
                target_time = now - timedelta(hours=h)
                
                # 출퇴근 시간(8-9시, 18-19시)에는 가중치 부여 (더 많이 발생)
                is_rush_hour = target_time.hour in [8, 9, 18, 19]
                samples = random.randint(2, 5) if is_rush_hour else random.randint(0, 2)
                
                for _ in range(samples):
                    # 분/초 랜덤 부여
                    event_time = target_time.replace(
                        minute=random.randint(0, 59), 
                        second=random.randint(0, 59)
                    )
                    
                    event = Event(
                        camera_id=cam_id,
                        timestamp=event_time,
                        clip_url=f"https://gateguard-clips.s3.ap-northeast-2.amazonaws.com/test/mock_{random.randint(1000,9999)}.mp4",
                        track_id=random.randint(1, 100),
                        confidence=round(random.uniform(0.7, 0.99), 3),
                        event_type=random.choice(EVENT_TYPES),
                        status=random.choice(["pending", "confirmed", "dismissed"])
                    )
                    session.add(event)
                    event_count += 1
        
        print(f"  [ADD]  총 {event_count}개의 테스트 이벤트 생성 완료")

        await session.commit()
        
        # ── 마테리얼라이즈드 뷰 새로고침 ──────────────────────────────────────
        print("\n── 통계 뷰(Materialized View) 새로고침 ────────────────────────────")
        try:
            await session.execute(text("REFRESH MATERIALIZED VIEW hourly_event_stats;"))
            await session.commit()
            print("  [OK]   hourly_event_stats 뷰 업데이트 완료")
        except Exception as e:
            print(f"  [ERR]  뷰 업데이트 실패: {e}")

        print("\n🎯 시딩 및 작전 완료")


if __name__ == "__main__":
    print("🛰️ GateGuard Milestone 2.0 시딩 작전 시작...\n")
    asyncio.run(seed())
