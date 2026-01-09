"""
Team models for team/organization management
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


class TeamRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    description = Column(String(500), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Subscription
    subscription_id = Column(String(255), nullable=True)
    subscription_status = Column(String(50), default="trialing")
    max_members = Column(Integer, default=10)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))

    # Relations
    members = relationship("TeamMember", back_populates="team")
    invites = relationship("TeamInvite", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(Enum(TeamRole), default=TeamRole.MEMBER)
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Privacy settings
    share_activity = Column(Boolean, default=True)
    share_screenshots = Column(Boolean, default=False)
    share_urls = Column(Boolean, default=True)

    # Relations
    team = relationship("Team", back_populates="members")
    # user = relationship("User", back_populates="team_memberships")


class TeamInvite(Base):
    __tablename__ = "team_invites"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    email = Column(String(255), nullable=False)
    role = Column(Enum(TeamRole), default=TeamRole.MEMBER)
    token = Column(String(255), unique=True, index=True)
    expires_at = Column(DateTime)
    accepted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    team = relationship("Team", back_populates="invites")
