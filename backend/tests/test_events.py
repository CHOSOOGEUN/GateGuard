import pytest
from httpx import AsyncClient

@pytest.fixture
async def auth_headers(client: AsyncClient):
    """테스트용 관리자 토큰 헤더 생성"""
    register_payload = {
        "employee_id": "2026888",
        "email": "event_tester@gateguard.com",
        "password": "testpassword123"
    }
    await client.post("/api/auth/register", json=register_payload)
    
    login_payload = {"employee_id": "2026888", "password": "testpassword123"}
    response = await client.post("/api/auth/login", json=login_payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_event_by_ai(client: AsyncClient, mocker):
    """[GateGuard] AI 엔진의 이벤트 생성 테스트"""
    # WebSocket 브로드캐스트 모킹 (실제 소켓 연결 없이 테스트)
    mock_broadcast = mocker.patch("app.api.websocket.manager.broadcast")
    
    event_payload = {
        "camera_id": 1,
        "clip_url": "https://s3.save/test.mp4",
        "track_id": 101,
        "confidence": 0.95
    }
    response = await client.post("/api/events/", json=event_payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["confidence"] == 0.95
    
    # WebSocket 전파 여부 확인
    mock_broadcast.assert_called_once()
    assert mock_broadcast.call_args[0][0]["type"] == "NEW_EVENT"


@pytest.mark.asyncio
async def test_list_events_with_auth(client: AsyncClient, auth_headers):
    """[GateGuard] 이벤트 목록 조회 테스트 (인증 필요)"""
    response = await client.get("/api/events/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_update_event_status_dispatch(client: AsyncClient, auth_headers, mocker):
    """[GateGuard] 이벤트 지휘권 행사(상태 변경) 테스트"""
    mock_broadcast = mocker.patch("app.api.websocket.manager.broadcast")
    
    # 1. 테스트용 이벤트 먼저 생성
    create_resp = await client.post("/api/events/", json={"camera_id": 1})
    event_id = create_resp.json()["id"]

    # 2. 상태 업데이트 (조치 완료)
    update_payload = {"status": "confirmed"}
    response = await client.patch(f"/api/events/{event_id}/status", json=update_payload, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "confirmed"
    assert data["handled_by"] is not None # 조치한 사원 ID 각인 확인
    assert data["handled_at"] is not None # 조치 시각 확인

    # 실시간 상태 변경 전파 확인
    assert mock_broadcast.called
    assert mock_broadcast.call_args[0][0]["type"] == "EVENT_STATUS_UPDATED"


@pytest.mark.asyncio
async def test_update_event_not_found(client: AsyncClient, auth_headers):
    """[GateGuard] 존재하지 않는 사건 처리 시도 시 404 차단 테스트"""
    response = await client.patch("/api/events/9999/status", json={"status": "confirmed"}, headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_events_filtered(client: AsyncClient, auth_headers):
    """[GateGuard] 이벤트 필터링 조회 테스트"""
    # 1. 특정 카메라 이벤트 생성
    await client.post("/api/events/", json={"camera_id": 99, "status": "pending"})
    
    # 2. 필터링 조회
    response = await client.get("/api/events/?camera_id=99", headers=auth_headers)
    assert response.status_code == 200
    events = response.json()
    assert len(events) >= 1
    assert all(e["camera_id"] == 99 for e in events)


@pytest.mark.asyncio
async def test_create_event_with_celery_delay(client: AsyncClient, mocker):
    """[GateGuard] AI 감지 시 S3 업로드 비동기 작업 위임 확인 테스트"""
    mock_task = mocker.patch("app.api.events.upload_clip_task.delay")
    mocker.patch("app.api.websocket.manager.broadcast")

    event_payload = {
        "camera_id": 1,
        "clip_url": "s3://test-clip.mp4"
    }
    await client.post("/api/events/", json=event_payload)
    
    # Celery 태스크가 딜레이와 함께 호출되었는지 확인
    assert mock_task.called
