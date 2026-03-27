from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Admin
from app.schemas.schemas import LoginRequest, TokenResponse
from app.core.security import verify_password, create_access_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).where(Admin.email == request.email))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(request.password, admin.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    token = create_access_token(data={"sub": str(admin.id)})
    return TokenResponse(access_token=token)
