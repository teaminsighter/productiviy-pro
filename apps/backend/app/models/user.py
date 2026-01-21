"""
User and UserSettings models for authentication and user management
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timedelta
import enum


class PlanType(str, enum.Enum):
    FREE = "free"
    PERSONAL = "personal"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Null for OAuth users
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Auth
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)  # Admin access
    is_super_admin = Column(Boolean, default=False)  # Super admin access
    auth_provider = Column(String(50), default="email")  # email, google
    google_id = Column(String(255), unique=True, nullable=True)

    # Password Reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)

    # Subscription
    plan = Column(Enum(PlanType, name='plan_type', create_type=False), default=PlanType.FREE)
    trial_started_at = Column(DateTime, default=datetime.utcnow)
    trial_ends_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))
    subscription_id = Column(String(255), nullable=True)  # Stripe subscription ID
    subscription_status = Column(String(50), default="trialing")  # trialing, active, canceled, expired
    stripe_customer_id = Column(String(255), unique=True, nullable=True)  # Stripe customer ID

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    # Device tracking
    device_id = Column(String(255), nullable=True)
    device_name = Column(String(255), nullable=True)

    # Relations
    user_settings = relationship("UserSettingsNew", back_populates="user", uselist=False)
    settings = relationship("UserSettings", back_populates="user", uselist=False)
    # Team memberships - use lazy loading to avoid circular imports
    # team_memberships = relationship("TeamMember", back_populates="user")

    # Activity data relationships
    activities = relationship("Activity", back_populates="user", lazy="dynamic")
    url_activities = relationship("URLActivity", back_populates="user", lazy="dynamic")
    youtube_activities = relationship("YouTubeActivity", back_populates="user", lazy="dynamic")
    screenshots = relationship("Screenshot", back_populates="user", lazy="dynamic")

    # Goals & productivity relationships
    goals = relationship("Goal", back_populates="user", lazy="dynamic")
    streaks = relationship("Streak", back_populates="user", lazy="dynamic")
    achievements = relationship("Achievement", back_populates="user", lazy="dynamic")
    focus_sessions = relationship("FocusSession", back_populates="user", lazy="dynamic")

    # Integrations
    integrations = relationship("IntegrationConnection", back_populates="user", lazy="dynamic")

    # Work sessions (for freelancer time tracking)
    work_sessions = relationship("WorkSession", back_populates="user", lazy="dynamic")

    @property
    def is_trial_active(self) -> bool:
        if self.trial_ends_at is None:
            return False
        return self.trial_ends_at > datetime.utcnow()

    @property
    def days_left_trial(self) -> int:
        if self.trial_ends_at:
            delta = self.trial_ends_at - datetime.utcnow()
            return max(0, delta.days)
        return 0

    @property
    def has_premium_access(self) -> bool:
        return (
            self.plan in [PlanType.PERSONAL, PlanType.PRO, PlanType.TEAM, PlanType.ENTERPRISE]
            and self.subscription_status == "active"
        ) or self.is_trial_active


class UserSettingsNew(Base):
    """New user settings tied to authenticated users"""
    __tablename__ = "user_settings_new"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)

    # General
    theme = Column(String(20), default="dark")
    language = Column(String(10), default="en")
    timezone = Column(String(50), default="UTC")

    # Tracking
    track_idle = Column(Boolean, default=True)
    idle_timeout = Column(Integer, default=5)  # minutes
    work_start_time = Column(String(10), default="09:00")
    work_end_time = Column(String(10), default="17:00")
    work_days = Column(JSON, default=["mon", "tue", "wed", "thu", "fri"])

    # Screenshots
    screenshots_enabled = Column(Boolean, default=True)
    screenshot_interval = Column(Integer, default=15)  # minutes
    screenshot_quality = Column(String(20), default="medium")
    blur_screenshots = Column(Boolean, default=False)

    # AI
    ai_enabled = Column(Boolean, default=True)
    openai_api_key_set = Column(Boolean, default=False)

    # Notifications
    notifications_enabled = Column(Boolean, default=True)
    distraction_alerts = Column(Boolean, default=True)
    goal_reminders = Column(Boolean, default=True)
    daily_summary = Column(Boolean, default=True)

    # Custom lists
    productive_apps = Column(JSON, default=[])
    distracting_apps = Column(JSON, default=[])
    excluded_apps = Column(JSON, default=[])

    # Relations
    user = relationship("User", back_populates="user_settings")
