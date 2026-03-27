from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.models import Camera, Admin
from app.schemas.schemas import CameraCreate, CameraResponse

# 라우터 기초 설정 (최종 통합본 v1)
router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("/", response_model=list[CameraResponse])
async def list_cameras(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    [통합 v1] 등록된 모든 카메라의 상태를 조회합니다. (보안 인증 필수)
    """
    result = await db.execute(select(Camera))
    return result.scalars().all()


@router.post("/", response_model=CameraResponse, status_code=201)
async def create_camera(
    body: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    [통합 v1] 새로운 카메라 감지 포인트를 생성합니다. (보안 인증 필수)
    """
    camera = Camera(**body.model_dump())
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    return camera


@router.patch("/{camera_id}/toggle", response_model=CameraResponse)
async def toggle_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    [통합 v1] 개찰구 카메라의 활성/비활성 상태를 원스톱으로 토글합니다. (보안 인증 필수)
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    
    if not camera:
        raise HTTPException(status_code=404, detail="지정된 카메라를 시스템에서 찾을 수 없습니다.")
    
    camera.is_active = not camera.is_active
    await db.commit()
    await db.refresh(camera)
    return camera
