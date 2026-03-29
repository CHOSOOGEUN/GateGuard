"""
  docker compose exec backend python seed.py
"""

import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.models import Admin, Camera


# ── 시드 데이터 정의 ─────────────────────────────────────────────────────────

ADMIN_ACCOUNTS = [
    {"email": "admin@gateguard.com", "password": "admin1234"},
    {"email": "station01@gateguard.com", "password": "station1234"},
]

# 신분당선
_SHINBUNDANG_STATIONS = [
    "광교역", "광교중앙역", "상현역",
]

TEST_CAMERAS = [
    {"location": f"개찰구 {g}번 게이트", "station_name": st, "is_active": True}
    for st in _SHINBUNDANG_STATIONS
    for g in (1, 2)
]


async def seed():
    async with AsyncSessionLocal() as session:
        # ── 관리자 계정 시딩 ──────────────────────────────────────────────
        for account in ADMIN_ACCOUNTS:
            exists = await session.execute(
                select(Admin).where(Admin.email == account["email"])
            )
            if exists.scalar_one_or_none():
                print(f"  [SKIP] 관리자 이미 존재: {account['email']}")
                continue

            admin = Admin(
                email=account["email"],
                password=hash_password(account["password"]),
            )
            session.add(admin)
            print(f"  [ADD]  관리자 생성: {account['email']}")

        # ── 카메라 데이터 시딩 ────────────────────────────────────────────
        for cam in TEST_CAMERAS:
            exists = await session.execute(
                select(Camera).where(
                    Camera.location == cam["location"],
                    Camera.station_name == cam["station_name"],
                )
            )
            if exists.scalar_one_or_none():
                print(f"  [SKIP] 카메라 이미 존재: {cam['station_name']} - {cam['location']}")
                continue

            camera = Camera(**cam)
            session.add(camera)
            print(f"  [ADD]  카메라 생성: {cam['station_name']} - {cam['location']}")

        await session.commit()
        print("\n 시딩 완료")


if __name__ == "__main__":
    print("GateGuard 초기 데이터 시딩 시작...\n")
    asyncio.run(seed())
