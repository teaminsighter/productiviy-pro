from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    app_name = Column(String, nullable=False)
    window_title = Column(String, nullable=False)
    url = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    platform = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    duration = Column(Integer, default=0)  # seconds
    category = Column(String, default="other")
    productivity_score = Column(Float, default=0.5)
    is_productive = Column(Boolean, default=False)
    extra_data = Column(JSON, nullable=True)  # renamed from 'metadata' - reserved by SQLAlchemy
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="activities")


class URLActivity(Base):
    __tablename__ = "url_activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    activity_id = Column(String, nullable=False)
    full_url = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    platform = Column(String, nullable=True)
    page_title = Column(String, nullable=True)
    favicon_url = Column(String, nullable=True)
    duration = Column(Integer, default=0)
    timestamp = Column(DateTime, server_default=func.now())
    category = Column(String, default="other")
    is_productive = Column(Boolean, default=False)
    productivity_score = Column(Float, default=0.5)

    # Relationship
    user = relationship("User", back_populates="url_activities")


class YouTubeActivity(Base):
    __tablename__ = "youtube_activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    activity_id = Column(String, nullable=False)
    video_id = Column(String, nullable=False)
    video_title = Column(String, nullable=False)
    channel_name = Column(String, nullable=True)
    watch_duration = Column(Integer, default=0)
    watch_percentage = Column(Float, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())
    video_category = Column(String, default="other")
    is_productive = Column(Boolean, default=False)
    ai_classification = Column(JSON, nullable=True)

    # Relationship
    user = relationship("User", back_populates="youtube_activities")
