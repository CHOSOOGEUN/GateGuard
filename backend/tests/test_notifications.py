import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Notification, Admin

@pytest.fixture
async def auth_headers(client: AsyncClient):
    """테스트용 관리자 토큰 헤더 생성"""
    register_payload = {
        "employee_id": "2026888",
        "email": "noti_tester@gateguard.com",
        "password": "testpassword123"
    }
    await client.post("/api/auth/register", json=register_payload)
    login_payload = {"employee_id": "2026888", "password": "testpassword123"}
    response = await client.post("/api/auth/login", json=login_payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_get_notifications_with_data(client: AsyncClient, auth_headers, db_session: AsyncSession):
    # n1: read_at is None
    n1 = Notification(event_id=1, read_at=None)
    db_session.add(n1)
    await db_session.commit()
    await db_session.refresh(n1) # Ensures ID is bound

    # Test list
    response = await client.get("/api/notifications/", headers=auth_headers)
    assert response.status_code == 200
    
    # Test read success path (39-46)
    read_resp = await client.patch(f"/api/notifications/{n1.id}/read", headers=auth_headers)
    assert read_resp.status_code == 200
    assert "Success" in read_resp.json()["message"]

@pytest.mark.asyncio
async def test_mark_all_read_success_path(client: AsyncClient, auth_headers, db_session: AsyncSession):
    n = Notification(event_id=1, read_at=None)
    db_session.add(n)
    await db_session.commit()
    
    # Test read-all path (54-55)
    response = await client.post("/api/notifications/read-all", headers=auth_headers)
    assert response.status_code == 200
