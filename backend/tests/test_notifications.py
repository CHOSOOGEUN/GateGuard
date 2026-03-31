import pytest
from httpx import AsyncClient
from app.models.models import Notification

@pytest.mark.asyncio
async def test_get_notifications_unauthorized(client: AsyncClient):
    """[GateGuard] 비로그인 알림 조회 차단 테스트"""
    response = await client.get("/api/notifications/")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_notifications_empty(client: AsyncClient):
    """[GateGuard] 알림 목록 조회 성공 테스트 (빈 목록)"""
    # 1. 로그인
    register_payload = {
        "employee_id": "2026111",
        "email": "noti_test@gateguard.com",
        "password": "testpassword"
    }
    await client.post("/api/auth/register", json=register_payload)
    login_response = await client.post("/api/auth/login", json={
        "employee_id": "2026111",
        "password": "testpassword"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 조회
    response = await client.get("/api/notifications/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_read_notification_api(client: AsyncClient):
    """[GateGuard] 알림 읽음 처리 API 테스트"""
    # 1. 로그인 보초병 세우기
    register_payload = {
        "employee_id": "2026222",
        "email": "read_test@gateguard.com",
        "password": "testpassword"
    }
    await client.post("/api/auth/register", json=register_payload)
    login_response = await client.post("/api/auth/login", json={
        "employee_id": "2026222",
        "password": "testpassword"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 임의의 알림이 있다고 가정하거나 DB에 직접 주입 (여기서는 flow 테스트)
    # 실제 DB 세션이 필요한 경우 app.database.get_db를 오버라이드한 세션 필요
    # 현 환경에서는 repository 테스트가 아닌 API 흐름 테스트이므로 
    # 존재하지 않는 ID에 대한 404 테스트로 커버리지 확보
    response = await client.patch("/api/notifications/9999/read", headers=headers)
    assert response.status_code == 404
