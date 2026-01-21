from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Screenshot(Base):
    __tablename__ = "screenshots"
    __table_args__ = (
        # Composite index for user screenshot queries by date
        Index("ix_screenshots_user_time", "user_id", "timestamp"),
        # Index for filtering deleted screenshots
        Index("ix_screenshots_user_deleted", "user_id", "is_deleted"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    timestamp = Column(DateTime, server_default=func.now(), index=True)

    # Local storage (legacy - will be deprecated)
    image_path = Column(String, nullable=True)  # Changed to nullable for cloud migration
    thumbnail_path = Column(String, nullable=True)

    # Cloud storage (Firebase)
    storage_url = Column(String, nullable=True)  # Firebase public URL
    thumbnail_url = Column(String, nullable=True)  # Firebase thumbnail URL
    storage_path = Column(String, nullable=True)  # Firebase path: users/{uid}/screenshots/{id}.jpg

    # Metadata
    app_name = Column(String, nullable=True)
    window_title = Column(String, nullable=True)
    url = Column(String, nullable=True)
    category = Column(String, default="other")
    is_blurred = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    # Relationship
    user = relationship("User", back_populates="screenshots")
