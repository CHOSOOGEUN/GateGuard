import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_cameras_unauthorized(client: AsyncClient):
    """[GateGuard] 비로그인 카메라 목록 조회 차단 테스트"""
    response = await client.get("/api/cameras/")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_camera_lifecycle(client: AsyncClient):
    """[GateGuard] 카메라 등록 및 목록 조회 통합 테스트"""
    # 1. 로그인
    register_payload = {
        "employee_id": "2029111",
        "email": "camera_test@gateguard.com",
        "password": "testpassword"
    }
    await client.post("/api/auth/register", json=register_payload)
    login_response = await client.post("/api/auth/login", json={
        "employee_id": "2029111",
        "password": "testpassword"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 카메라 등록
    camera_payload = {
        "location": "강남역 2번 출구",
        "station_name": "강남역"
    }
    create_response = await client.post("/api/cameras/", json=camera_payload, headers=headers)
    assert create_response.status_code == 201
    camera_id = create_response.json()["id"]

    # 3. 목록 조회 확인
    list_response = await client.get("/api/cameras/", headers=headers)
    assert list_response.status_code == 200
    cameras = list_response.json()
    assert any(c["id"] == camera_id for c in cameras)

@pytest.mark.asyncio
async def test_toggle_camera_status(client: AsyncClient):
    """[GateGuard] 카메라 활성화/비활성화 토글 테스트"""
    # 1. 로그인
    login_response = await client.post("/api/auth/login", json={
        "employee_id": "2029111",
        "password": "testpassword"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 카메라 하나 등록 (토글 타겟)
    cam_payload = {"location": "테스트 구역", "station_name": "테스트역"}
    create_res = await client.post("/api/cameras/", json=cam_payload, headers=headers)
    camera_id = create_res.json()["id"]

    # 3. 활성화 상태 토글 (현재 활성 -> 비활성 기대)
    toggle_response = await client.patch(f"/api/cameras/{camera_id}/toggle", headers=headers)
    assert toggle_response.status_code == 200
    assert toggle_response.json()["is_active"] == False # Default was True

    # 4. 다시 토글 (비활성 -> 활성)
    toggle_response = await client.patch(f"/api/cameras/{camera_id}/toggle", headers=headers)
    assert toggle_response.status_code == 200
    assert toggle_response.json()["is_active"] == True
