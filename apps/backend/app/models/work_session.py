"""
Work Session Model - For freelancers and team time tracking

Tracks verified work time with:
- Clear start/end times
- Active vs idle time
- Screenshot proof
- Activity levels
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, JSON, Text, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class WorkSession(Base):
    """
    A work session represents a tracked period of work.
    Used for freelancer billing and team productivity reports.
    """
    __tablename__ = "work_sessions"
    __table_args__ = (
        Index("ix_work_sessions_user_time", "user_id", "started_at"),
        Index("ix_work_sessions_user_status", "user_id", "status"),
        Index("ix_work_sessions_user_project", "user_id", "project_name"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Project/Task context (for freelancers)
    project_name = Column(String(255), nullable=True)
    task_description = Column(Text, nullable=True)
    client_name = Column(String(255), nullable=True)

    # Time tracking
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)  # Null = session still active

    # Calculated times (in seconds)
    total_duration = Column(Integer, default=0)  # End - Start
    active_duration = Column(Integer, default=0)  # Time with activity
    idle_duration = Column(Integer, default=0)    # Time without activity
    paused_duration = Column(Integer, default=0)  # Time manually paused

    # Activity metrics (0-100%)
    activity_level = Column(Float, default=0)  # Average keyboard/mouse activity
    productivity_score = Column(Float, default=0)  # % time in productive apps

    # Evidence
    screenshot_count = Column(Integer, default=0)
    screenshot_ids = Column(JSON, default=[])  # List of screenshot IDs

    # Status
    status = Column(String(20), default="active")  # active, paused, completed, cancelled

    # Metadata
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="work_sessions")

    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "project_name": self.project_name,
            "task_description": self.task_description,
            "client_name": self.client_name,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "total_duration": self.total_duration,
            "active_duration": self.active_duration,
            "idle_duration": self.idle_duration,
            "paused_duration": self.paused_duration,
            "activity_level": self.activity_level,
            "productivity_score": self.productivity_score,
            "screenshot_count": self.screenshot_count,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @property
    def billable_duration(self) -> int:
        """Get billable time (active time only, excludes idle/paused)"""
        return self.active_duration

    @property
    def is_active(self) -> bool:
        """Check if session is currently active"""
        return self.status == "active" and self.ended_at is None
