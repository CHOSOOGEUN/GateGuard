import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class EventStatus(str, enum.Enum):
    detected = "detected"
    confirmed = "confirmed"
    false_alarm = "false_alarm"


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    notifications: Mapped[list["Notification"]] = relationship(back_populates="admin")


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    station_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    events: Mapped[list["Event"]] = relationship(back_populates="camera")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cameras.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    clip_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    track_id: Mapped[int | None] = mapped_column(nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus), default=EventStatus.detected
    )

    camera: Mapped["Camera"] = relationship(back_populates="events")
    notification: Mapped["Notification | None"] = relationship(back_populates="event")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), unique=True, nullable=False)
    admin_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("admins.id"), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    event: Mapped["Event"] = relationship(back_populates="notification")
    admin: Mapped["Admin | None"] = relationship(back_populates="notifications")
