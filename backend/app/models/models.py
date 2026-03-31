from __future__ import annotations
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    location: Mapped[str] = mapped_column(String, nullable=False)
    station_name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    events: Mapped[list["Event"]] = relationship("Event", back_populates="camera")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    camera_id: Mapped[int] = mapped_column(Integer, ForeignKey("cameras.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    clip_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    track_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | confirmed | dismissed
    handled_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("admins.id"), nullable=True)
    handled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    camera: Mapped["Camera"] = relationship("Camera", back_populates="events")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", 
        back_populates="event",
        primaryjoin="Event.id == Notification.event_id",
        foreign_keys="Notification.event_id"
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)  # 🛡️ TimescaleDB 호환: FK 제약 제외
    sent_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    event: Mapped["Event"] = relationship(
        "Event", 
        back_populates="notifications",
        primaryjoin="Notification.event_id == Event.id",
        foreign_keys="Notification.event_id",
        overlaps="notifications"
    )
