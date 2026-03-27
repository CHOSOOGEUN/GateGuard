from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Camera
from app.schemas.schemas import CameraCreate, CameraResponse

router = APIRouter()


@router.get("/", response_model=list[CameraResponse])
async def get_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.is_active == True))
    return result.scalars().all()


@router.post("/", response_model=CameraResponse, status_code=201)
async def create_camera(data: CameraCreate, db: AsyncSession = Depends(get_db)):
    camera = Camera(**data.model_dump())
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    return camera
