"""
Team models for team/organization management
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, Time, Float, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import datetime, time
import enum
import uuid


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
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    invites = relationship("TeamInvite", back_populates="team", cascade="all, delete-orphan")
    permissions = relationship("TeamPermission", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(Enum(TeamRole, name='team_role', create_type=False), default=TeamRole.MEMBER)
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Privacy settings - what member shares with team
    share_activity = Column(Boolean, default=True)
    share_screenshots = Column(Boolean, default=False)
    share_urls = Column(Boolean, default=True)

    # Additional privacy options
    blur_screenshots = Column(Boolean, default=False)
    hide_window_titles = Column(Boolean, default=False)
    working_hours_only = Column(Boolean, default=True)
    work_start_time = Column(Time, default=time(9, 0))  # 9 AM
    work_end_time = Column(Time, default=time(18, 0))   # 6 PM

    # Relations
    team = relationship("Team", back_populates="members")


class TeamInvite(Base):
    __tablename__ = "team_invites"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    email = Column(String(255), nullable=False)
    role = Column(Enum(TeamRole, name='team_role', create_type=False), default=TeamRole.MEMBER)
    token = Column(String(255), unique=True, index=True)
    expires_at = Column(DateTime)
    accepted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relations
    team = relationship("Team", back_populates="invites")


class TeamPermission(Base):
    """
    Granular permissions for admins to view member data.
    Only Owner can grant these permissions.
    """
    __tablename__ = "team_permissions"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    granter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))  # Owner who granted
    grantee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))  # Admin who receives
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # NULL = all members

    # Permission types
    can_view_activity = Column(Boolean, default=False)
    can_view_screenshots = Column(Boolean, default=False)
    can_view_urls = Column(Boolean, default=False)
    can_view_analytics = Column(Boolean, default=False)
    can_export_data = Column(Boolean, default=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration

    # Relations
    team = relationship("Team", back_populates="permissions")


# ═══════════════════════════════════════════════════════════════════════════
# TEAM DEEP WORK MODELS
# ═══════════════════════════════════════════════════════════════════════════

class AlertType(str, enum.Enum):
    OVER_MEETING = "over_meeting"
    FOCUS_DEFICIT = "focus_deficit"
    MEETING_SUGGESTION = "meeting_suggestion"
    FOCUS_IMPROVEMENT = "focus_improvement"
    TEAM_TREND = "team_trend"


class AlertPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TeamDeepWorkScore(Base):
    """Aggregated daily deep work metrics for a team"""
    __tablename__ = "team_deep_work_scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)

    # Aggregated Core Metrics
    avg_deep_work_score = Column(Float, default=0)  # Team average 0-100
    total_deep_work_minutes = Column(Integer, default=0)  # Sum across team
    avg_deep_work_minutes = Column(Float, default=0)  # Per member average

    # Meeting Metrics (Aggregated)
    total_meeting_minutes = Column(Integer, default=0)
    avg_meeting_minutes = Column(Float, default=0)
    avg_meeting_load_percent = Column(Float, default=0)  # Avg % of work hours in meetings
    total_meeting_count = Column(Integer, default=0)

    # Fragmentation Metrics
    avg_fragmentation_score = Column(Float, default=0)
    avg_context_switches = Column(Float, default=0)
    avg_longest_focus_block = Column(Float, default=0)

    # Productivity Breakdown
    total_productive_minutes = Column(Integer, default=0)
    total_distracting_minutes = Column(Integer, default=0)
    avg_focus_efficiency = Column(Float, default=0)

    # Member Stats
    member_count = Column(Integer, default=0)  # Members tracked this day
    members_over_meeting_threshold = Column(Integer, default=0)  # Members with > 50% meeting load
    members_with_deep_work = Column(Integer, default=0)  # Members with >= 2hr deep work
    top_performer_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Highest deep work score
    needs_attention_count = Column(Integer, default=0)  # Members with < 30 deep work score

    # Distribution Data (for charts)
    score_distribution = Column(JSON, default={})  # {"0-20": 2, "21-40": 3, ...}
    meeting_load_distribution = Column(JSON, default={})

    # Trends
    vs_yesterday = Column(Float, nullable=True)  # % change
    vs_week_avg = Column(Float, nullable=True)
    trend_direction = Column(String(20), nullable=True)  # "improving", "declining", "stable"

    # Metadata
    calculated_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())


class TeamMeetingFreeZone(Base):
    """Team-wide no-meeting times"""
    __tablename__ = "team_meeting_free_zones"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Time settings
    name = Column(String(255), default="Focus Time")
    start_time = Column(String(10), nullable=False)  # HH:MM format
    end_time = Column(String(10), nullable=False)
    days_of_week = Column(JSON, default=[1, 2, 3, 4, 5])  # Monday=1, Sunday=7
    timezone = Column(String(50), default="UTC")

    # Scope
    is_recurring = Column(Boolean, default=True)
    start_date = Column(DateTime, nullable=True)  # For non-recurring
    end_date = Column(DateTime, nullable=True)

    # Enforcement
    is_enforced = Column(Boolean, default=False)  # If true, blocks meeting creation
    notification_enabled = Column(Boolean, default=True)  # Notify when violated
    auto_decline_enabled = Column(Boolean, default=False)  # Auto-decline meeting invites

    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TeamManagerAlert(Base):
    """Alerts for managers about team productivity issues"""
    __tablename__ = "team_manager_alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL = team-wide alert

    # Alert type and priority
    alert_type = Column(Enum(AlertType, name='alert_type'), nullable=False)
    priority = Column(Enum(AlertPriority, name='alert_priority'), default=AlertPriority.MEDIUM)

    # Alert content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, default={})  # Additional context data

    # Metrics that triggered the alert
    metric_name = Column(String(100), nullable=True)  # e.g., "meeting_load_percent"
    metric_value = Column(Float, nullable=True)  # e.g., 65.0
    threshold_value = Column(Float, nullable=True)  # e.g., 50.0

    # Suggestion (if applicable)
    suggestion = Column(Text, nullable=True)
    suggestion_action = Column(String(50), nullable=True)  # "reschedule", "decline", "block_time"

    # Status
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    is_actioned = Column(Boolean, default=False)  # User took suggested action
    dismissed_at = Column(DateTime, nullable=True)
    actioned_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)  # Alert auto-expires


class TeamSchedulingSuggestion(Base):
    """AI-generated suggestions for optimal meeting times"""
    __tablename__ = "team_scheduling_suggestions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    # Suggestion type
    suggestion_type = Column(String(50), nullable=False)  # "best_meeting_time", "reschedule", "focus_time"

    # Time slot
    suggested_start = Column(DateTime, nullable=False)
    suggested_end = Column(DateTime, nullable=False)
    day_of_week = Column(Integer, nullable=True)  # For recurring suggestions

    # Analysis
    reason = Column(Text, nullable=False)
    impact_score = Column(Float, default=0)  # How much it improves focus
    affected_members = Column(JSON, default=[])  # List of user IDs affected
    availability_score = Column(Float, default=0)  # % of team available

    # For reschedule suggestions
    original_meeting_id = Column(String, ForeignKey("calendar_events.id"), nullable=True)

    # Status
    is_applied = Column(Boolean, default=False)
    applied_at = Column(DateTime, nullable=True)
    applied_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_dismissed = Column(Boolean, default=False)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
