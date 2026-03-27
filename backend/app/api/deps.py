from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import get_db
from app.models.models import Admin

# ✨ Swagger UI 및 클라이언트 토큰 연동 스키마
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    """
    [최적화 v2] 토큰 유효성 및 DB 관리자 정보 일치 여부를 원스톱으로 검증하는 핵심 의존성입니다.
    """
    try:
        # 1. security.py의 통합 검증 로직 사용
        payload = decode_access_token(token)
        admin_id: str = payload.get("sub")
        if not admin_id:
            raise ValueError("ID 정보가 없는 위조된 토큰입니다.")
    except ValueError as e:
        # 최적화 포인트: 서비스 에러를 HTTP 401 에러로 깔끔하게 래핑
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. DB 정교한 검증 (실제 존재 여부)
    result = await db.execute(select(Admin).where(Admin.id == int(admin_id)))
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="권한이 삭제된 관리자 계정입니다. 관리자에게 문의하세요."
        )

    return admin
