import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_update_event_status_unauthorized(client: AsyncClient):
    """[GateGuard] 비로그인 사건 조치 차단 테스트"""
    response = await client.patch("/api/events/1/status", json={"status": "confirmed"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_update_nonexistent_event(client: AsyncClient):
    """[GateGuard] 존재하지 않는 사건 조치 시도(404) 테스트"""
    # 1. 로그인
    register_payload = {
        "employee_id": "2027999",
        "email": "dispatch_test@gateguard.com",
        "password": "testpassword"
    }
    await client.post("/api/auth/register", json=register_payload)
    login_response = await client.post("/api/auth/login", json={
        "employee_id": "2027999",
        "password": "testpassword"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 존재하지 않는 ID로 조치 시도
    response = await client.patch("/api/events/9999/status", 
                                  json={"status": "confirmed"},
                                  headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_update_event_invalid_status(client: AsyncClient):
    """[GateGuard] 올바르지 않은 상태 값(Validation) 테스트"""
    # 1. 로그인
    login_response = await client.post("/api/auth/login", json={
        "employee_id": "2027999",
        "password": "testpassword"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 잘못된 상태 전송
    response = await client.patch("/api/events/9999/status", 
                                  json={"status": "INVALID"},
                                  headers=headers)
    assert response.status_code == 422 # Pydantic Validation Error
