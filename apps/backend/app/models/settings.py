from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, nullable=False)
    value = Column(JSON, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CustomList(Base):
    __tablename__ = "custom_lists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    list_type = Column(String, nullable=False)  # productive, distracting, neutral, excluded
    pattern = Column(String, nullable=False)  # domain or app name
    note = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
