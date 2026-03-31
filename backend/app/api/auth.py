from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password, hash_password
from app.database import get_db
from app.models.models import Admin
from app.schemas.schemas import AdminLogin, AdminRegister, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: AdminRegister, db: AsyncSession = Depends(get_db)):
    """[GateGuard] 새로운 관리자를 사원번호 기반으로 등록합니다."""
    # 1. 중복 확인
    result = await db.execute(select(Admin).where(
        (Admin.employee_id == body.employee_id) | (Admin.email == body.email)
    ))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 등록된 사원번호 또는 이메일입니다.")

    # 2. 계정 생성 (비밀번호 해싱 완료)
    new_admin = Admin(
        employee_id=body.employee_id,
        email=body.email,
        password=hash_password(body.password)
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    # 3. 즉시 토큰 발행
    token = create_access_token({"sub": str(new_admin.id), "employee_id": new_admin.employee_id})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: AdminLogin, db: AsyncSession = Depends(get_db)):
    """[GateGuard] 사원번호를 통해 로그인합니다."""
    result = await db.execute(select(Admin).where(Admin.employee_id == body.employee_id))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(body.password, admin.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사원번호 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token({"sub": str(admin.id), "employee_id": admin.employee_id})
    return TokenResponse(access_token=token)


@router.post("/find-pw")
async def find_password(employee_id: str, email: str, db: AsyncSession = Depends(get_db)):
    """[GateGuard] 사원번호와 이메일 대조를 통해 임시 비밀번호를 발급하거나 안내합니다."""
    result = await db.execute(select(Admin).where(
        (Admin.employee_id == employee_id) & (Admin.email == email)
    ))
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(status_code=404, detail="일치하는 사원 정보가 없습니다.")
    
    # 🚩 수근팀장님 TODO: 실제 이메일 발송 로직 또는 임시 PW 저장 로직 추가
    return {"message": "입력하신 이메일로 비밀번호 재설정 안내가 전송되었습니다. (Demo Mode)"}
