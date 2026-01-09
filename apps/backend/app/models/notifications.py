"""
Notification and Onboarding Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class NotificationType(str, Enum):
    """Types of notifications"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    AI_INSIGHT = "ai_insight"
    DISTRACTION_ALERT = "distraction_alert"
    GOAL_PROGRESS = "goal_progress"
    GOAL_ACHIEVED = "goal_achieved"
    FOCUS_REMINDER = "focus_reminder"
    BREAK_SUGGESTION = "break_suggestion"
    DAILY_SUMMARY = "daily_summary"
    STREAK_ALERT = "streak_alert"
    WEEKLY_REPORT = "weekly_report"


class NotificationPriority(str, Enum):
    """Priority levels for notifications"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class UserProfileType(str, Enum):
    """User profile types for personalization"""
    DEVELOPER = "developer"
    DESIGNER = "designer"
    WRITER = "writer"
    MANAGER = "manager"
    STUDENT = "student"
    FREELANCER = "freelancer"
    OTHER = "other"


class Notification(Base):
    """Notification model"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), default=NotificationType.INFO.value)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    icon = Column(String(50), nullable=True)  # Icon name or emoji
    actions = Column(JSON, nullable=True)  # List of action buttons
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    priority = Column(String(20), default=NotificationPriority.NORMAL.value)

    # Metadata
    source = Column(String(100), nullable=True)  # What triggered this notification
    data = Column(JSON, nullable=True)  # Additional data for actions

    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Optional link to show native OS notification
    show_native = Column(Boolean, default=False)
    native_shown = Column(Boolean, default=False)


class NotificationSettings(Base):
    """User notification preferences"""
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)

    # Master toggle
    notifications_enabled = Column(Boolean, default=True)

    # Notification types toggles
    distraction_alerts = Column(Boolean, default=True)
    distraction_threshold_minutes = Column(Integer, default=15)

    goal_notifications = Column(Boolean, default=True)
    streak_notifications = Column(Boolean, default=True)

    focus_reminders = Column(Boolean, default=True)
    break_reminders = Column(Boolean, default=True)
    break_threshold_minutes = Column(Integer, default=120)  # 2 hours

    daily_summary = Column(Boolean, default=True)
    daily_summary_time = Column(String(5), default="18:00")  # HH:MM format

    weekly_report = Column(Boolean, default=True)
    weekly_report_day = Column(Integer, default=1)  # 1 = Monday

    ai_insights = Column(Boolean, default=True)

    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), default="22:00")
    quiet_hours_end = Column(String(5), default="08:00")

    # Native notifications
    native_notifications = Column(Boolean, default=True)
    sound_enabled = Column(Boolean, default=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserProfile(Base):
    """User profile and onboarding data"""
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)

    # Onboarding status
    onboarding_completed = Column(Boolean, default=False)
    onboarding_completed_at = Column(DateTime, nullable=True)
    onboarding_step = Column(Integer, default=0)  # Last completed step

    # Profile info (from onboarding step 2)
    profile_type = Column(String(50), default=UserProfileType.OTHER.value)

    # Work apps (from onboarding step 3)
    work_apps = Column(JSON, default=list)  # List of app names marked as productive

    # Daily goals (from onboarding step 4)
    daily_productive_hours = Column(Float, default=6.0)
    max_distraction_hours = Column(Float, default=1.0)

    # AI setup (from onboarding step 5)
    ai_enabled = Column(Boolean, default=False)
    openai_api_key = Column(String(255), nullable=True)  # Encrypted in production

    # Permissions (from onboarding step 6)
    accessibility_granted = Column(Boolean, default=False)
    screen_recording_granted = Column(Boolean, default=False)
    launch_on_startup = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Common work apps for onboarding
COMMON_WORK_APPS = [
    {"name": "VS Code", "icon": "code", "category": "development"},
    {"name": "Cursor", "icon": "code", "category": "development"},
    {"name": "WebStorm", "icon": "code", "category": "development"},
    {"name": "PyCharm", "icon": "code", "category": "development"},
    {"name": "Xcode", "icon": "code", "category": "development"},
    {"name": "Terminal", "icon": "terminal", "category": "development"},
    {"name": "iTerm", "icon": "terminal", "category": "development"},
    {"name": "Figma", "icon": "design", "category": "design"},
    {"name": "Sketch", "icon": "design", "category": "design"},
    {"name": "Adobe Photoshop", "icon": "design", "category": "design"},
    {"name": "Adobe Illustrator", "icon": "design", "category": "design"},
    {"name": "Slack", "icon": "message", "category": "communication"},
    {"name": "Discord", "icon": "message", "category": "communication"},
    {"name": "Microsoft Teams", "icon": "message", "category": "communication"},
    {"name": "Zoom", "icon": "video", "category": "communication"},
    {"name": "Google Chrome", "icon": "browser", "category": "browser"},
    {"name": "Firefox", "icon": "browser", "category": "browser"},
    {"name": "Safari", "icon": "browser", "category": "browser"},
    {"name": "Arc", "icon": "browser", "category": "browser"},
    {"name": "Notion", "icon": "document", "category": "productivity"},
    {"name": "Obsidian", "icon": "document", "category": "productivity"},
    {"name": "Microsoft Word", "icon": "document", "category": "productivity"},
    {"name": "Google Docs", "icon": "document", "category": "productivity"},
    {"name": "Microsoft Excel", "icon": "spreadsheet", "category": "productivity"},
    {"name": "Google Sheets", "icon": "spreadsheet", "category": "productivity"},
    {"name": "Linear", "icon": "task", "category": "productivity"},
    {"name": "Jira", "icon": "task", "category": "productivity"},
    {"name": "Asana", "icon": "task", "category": "productivity"},
    {"name": "Trello", "icon": "task", "category": "productivity"},
]

# Profile type descriptions for AI personalization
PROFILE_DESCRIPTIONS = {
    UserProfileType.DEVELOPER: {
        "productive_apps": ["VS Code", "Cursor", "Terminal", "GitHub", "Stack Overflow"],
        "productive_sites": ["github.com", "stackoverflow.com", "docs.python.org"],
        "focus_patterns": "Deep work sessions, code reviews, debugging"
    },
    UserProfileType.DESIGNER: {
        "productive_apps": ["Figma", "Sketch", "Photoshop", "Illustrator"],
        "productive_sites": ["dribbble.com", "behance.net", "figma.com"],
        "focus_patterns": "Creative work, design iterations, prototyping"
    },
    UserProfileType.WRITER: {
        "productive_apps": ["Word", "Google Docs", "Notion", "Obsidian"],
        "productive_sites": ["docs.google.com", "medium.com", "substack.com"],
        "focus_patterns": "Writing sessions, research, editing"
    },
    UserProfileType.MANAGER: {
        "productive_apps": ["Slack", "Zoom", "Calendar", "Linear", "Jira"],
        "productive_sites": ["calendar.google.com", "notion.so"],
        "focus_patterns": "Meetings, planning, team coordination"
    },
    UserProfileType.STUDENT: {
        "productive_apps": ["Notes", "Word", "Browser", "Anki"],
        "productive_sites": ["coursera.org", "khan-academy.org", "scholar.google.com"],
        "focus_patterns": "Study sessions, note-taking, research"
    },
    UserProfileType.FREELANCER: {
        "productive_apps": ["Mixed based on work type"],
        "productive_sites": ["upwork.com", "fiverr.com", "linkedin.com"],
        "focus_patterns": "Client work, communication, project management"
    },
    UserProfileType.OTHER: {
        "productive_apps": ["General productivity apps"],
        "productive_sites": [],
        "focus_patterns": "Custom patterns"
    },
}
