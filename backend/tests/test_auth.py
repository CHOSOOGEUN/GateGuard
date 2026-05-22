import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_admin(client: AsyncClient):
    """[GateGuard] 신규 관리자 사원번호 등록 테스트"""
    payload = {
        "employee_id": "2026999",
        "email": "tester@gateguard.com",
        "password": "testpassword123"
    }
    response = await client.post("/api/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_employee_id(client: AsyncClient):
    """[GateGuard] 중적 사원번호 등록 차단 테스트"""
    payload = {
        "employee_id": "2026999",
        "email": "tester2@gateguard.com",
        "password": "testpassword123"
    }
    # 첫 번째 등록
    await client.post("/api/auth/register", json=payload)
    
    # 두 번째 등록 시도 (사원번호 중복)
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "이미 등록된 사원번호" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """[GateGuard] 사원번호 로그인 성공 테스트"""
    # 1. 먼저 가입
    register_payload = {
        "employee_id": "2026777",
        "email": "login_test@gateguard.com",
        "password": "correct_password"
    }
    await client.post("/api/auth/register", json=register_payload)

    # 2. 로그인 시도
    login_payload = {
        "employee_id": "2026777",
        "password": "correct_password"
    }
    response = await client.post("/api/auth/login", json=login_payload)
    
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """[GateGuard] 잘못된 비밀번호 로그인 차단 테스트"""
    login_payload = {
        "employee_id": "2026777",
        "password": "wrong_password"
    }
    response = await client.post("/api/auth/login", json=login_payload)
    
    assert response.status_code == 401
    assert "올바르지 않습니다" in response.json()["detail"]
