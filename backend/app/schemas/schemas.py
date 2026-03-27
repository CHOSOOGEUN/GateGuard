import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ─── Auth ────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Camera ──────────────────────────────────────────────────────────────────
class CameraCreate(BaseModel):
    location: str
    station_name: str

class CameraResponse(BaseModel):
    id: uuid.UUID
    location: str
    station_name: str
    is_active: bool

    class Config:
        from_attributes = True


# ─── Event ───────────────────────────────────────────────────────────────────
class EventCreate(BaseModel):
    camera_id: uuid.UUID
    track_id: Optional[int] = None
    confidence: Optional[float] = None
    clip_url: Optional[str] = None

class EventResponse(BaseModel):
    id: uuid.UUID
    camera_id: uuid.UUID
    timestamp: datetime
    clip_url: Optional[str]
    track_id: Optional[int]
    confidence: Optional[float]
    status: str

    class Config:
        from_attributes = True


# ─── Notification ─────────────────────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    sent_at: datetime
    read_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── WebSocket 메시지 ──────────────────────────────────────────────────────────
class WSEventMessage(BaseModel):
    type: str = "fare_evasion_detected"
    event_id: str
    camera_id: str
    station_name: str
    timestamp: str
    confidence: Optional[float]
    clip_url: Optional[str]
