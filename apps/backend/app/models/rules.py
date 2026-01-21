"""
Rules Models - Database models for productivity rules
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class PlatformRule(Base):
    """User-defined rules for platforms/domains"""
    __tablename__ = "platform_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1, index=True)
    domain = Column(String, nullable=False, index=True)
    productivity = Column(String, default="neutral")  # productive, neutral, distracting
    category = Column(String, nullable=True)
    is_custom = Column(Boolean, default=True)  # True if user override, False if from default
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'domain', name='uq_user_domain'),
    )


class URLRule(Base):
    """User-defined rules for specific URL patterns"""
    __tablename__ = "url_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1, index=True)
    url_pattern = Column(String, nullable=False, index=True)
    productivity = Column(String, default="neutral")
    category = Column(String, nullable=True)
    override_platform = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'url_pattern', name='uq_user_url_pattern'),
    )


class CustomCategory(Base):
    """User-defined custom categories"""
    __tablename__ = "custom_categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1, index=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#6366F1")
    icon = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_category_name'),
    )


class WorkSchedule(Base):
    """User work schedule settings"""
    __tablename__ = "work_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1, unique=True, index=True)
    work_days = Column(JSON, default=["mon", "tue", "wed", "thu", "fri"])
    start_time = Column(String, default="09:00")  # HH:MM format
    end_time = Column(String, default="17:00")
    day_start_hour = Column(Integer, default=0)  # 0-23, when the "day" starts
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Default platform rules (used when user has no custom rule)
DEFAULT_PLATFORM_RULES = {
    # Productive
    "github.com": {"productivity": "productive", "category": "Development"},
    "gitlab.com": {"productivity": "productive", "category": "Development"},
    "bitbucket.org": {"productivity": "productive", "category": "Development"},
    "stackoverflow.com": {"productivity": "productive", "category": "Development"},
    "stackexchange.com": {"productivity": "productive", "category": "Development"},
    "notion.so": {"productivity": "productive", "category": "Productivity"},
    "linear.app": {"productivity": "productive", "category": "Productivity"},
    "figma.com": {"productivity": "productive", "category": "Design"},
    "docs.google.com": {"productivity": "productive", "category": "Productivity"},
    "sheets.google.com": {"productivity": "productive", "category": "Productivity"},
    "drive.google.com": {"productivity": "productive", "category": "Productivity"},
    "vercel.com": {"productivity": "productive", "category": "Development"},
    "netlify.com": {"productivity": "productive", "category": "Development"},
    "aws.amazon.com": {"productivity": "productive", "category": "Development"},
    "cloud.google.com": {"productivity": "productive", "category": "Development"},
    "azure.microsoft.com": {"productivity": "productive", "category": "Development"},
    "npmjs.com": {"productivity": "productive", "category": "Development"},
    "pypi.org": {"productivity": "productive", "category": "Development"},
    "developer.mozilla.org": {"productivity": "productive", "category": "Documentation"},
    "react.dev": {"productivity": "productive", "category": "Documentation"},
    "udemy.com": {"productivity": "productive", "category": "Learning"},
    "coursera.org": {"productivity": "productive", "category": "Learning"},
    "pluralsight.com": {"productivity": "productive", "category": "Learning"},

    # Neutral
    "slack.com": {"productivity": "neutral", "category": "Communication"},
    "discord.com": {"productivity": "neutral", "category": "Communication"},
    "teams.microsoft.com": {"productivity": "neutral", "category": "Communication"},
    "zoom.us": {"productivity": "neutral", "category": "Communication"},
    "meet.google.com": {"productivity": "neutral", "category": "Communication"},
    "mail.google.com": {"productivity": "neutral", "category": "Email"},
    "outlook.com": {"productivity": "neutral", "category": "Email"},
    "calendar.google.com": {"productivity": "neutral", "category": "Productivity"},

    # Distracting
    "youtube.com": {"productivity": "distracting", "category": "Entertainment"},
    "twitter.com": {"productivity": "distracting", "category": "Social"},
    "x.com": {"productivity": "distracting", "category": "Social"},
    "facebook.com": {"productivity": "distracting", "category": "Social"},
    "instagram.com": {"productivity": "distracting", "category": "Social"},
    "reddit.com": {"productivity": "distracting", "category": "Social"},
    "tiktok.com": {"productivity": "distracting", "category": "Social"},
    "netflix.com": {"productivity": "distracting", "category": "Entertainment"},
    "twitch.tv": {"productivity": "distracting", "category": "Entertainment"},
    "hulu.com": {"productivity": "distracting", "category": "Entertainment"},
    "disneyplus.com": {"productivity": "distracting", "category": "Entertainment"},
}

# Default categories
DEFAULT_CATEGORIES = [
    {"name": "Development", "color": "#3B82F6", "icon": "code"},
    {"name": "Design", "color": "#8B5CF6", "icon": "palette"},
    {"name": "Communication", "color": "#10B981", "icon": "message-circle"},
    {"name": "Productivity", "color": "#6366F1", "icon": "briefcase"},
    {"name": "Entertainment", "color": "#EF4444", "icon": "play"},
    {"name": "Social", "color": "#F59E0B", "icon": "users"},
    {"name": "Learning", "color": "#14B8A6", "icon": "book-open"},
    {"name": "Email", "color": "#EC4899", "icon": "mail"},
    {"name": "Documentation", "color": "#06B6D4", "icon": "file-text"},
    {"name": "Other", "color": "#6B7280", "icon": "folder"},
]
