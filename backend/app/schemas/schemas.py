from datetime import datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class AdminRegister(BaseModel):
    employee_id: str
    email: EmailStr
    password: str


class AdminLogin(BaseModel):
    employee_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Camera ────────────────────────────────────────────────────────────────────

class CameraCreate(BaseModel):
    location: str
    station_name: str


class CameraResponse(BaseModel):
    id: int
    location: str
    station_name: str
    is_active: bool

    model_config = {"from_attributes": True}


# ── Event ─────────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    camera_id: int
    clip_url: Optional[str] = None
    track_id: Optional[int] = None
    confidence: Optional[float] = None
    event_type: Optional[str] = None


class EventResponse(BaseModel):
    id: int
    camera_id: int
    timestamp: datetime
    clip_url: Optional[str]
    track_id: Optional[int]
    confidence: Optional[float]
    status: str
    event_type: str
    handled_by: Optional[int]
    handled_at: Optional[datetime]

    model_config = {"from_attributes": True}


class EventStatusUpdate(BaseModel):
    status: Literal["confirmed", "dismissed"]


# ── Notification ──────────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    event_id: int
    sent_at: datetime
    read_at: Optional[datetime]

    model_config = {"from_attributes": True}
