"""
Settings Models

UserSettings: Comprehensive user settings with database persistence
CustomList: User-defined app/site classification lists
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class UserSettings(Base):
    """Comprehensive user settings stored in database for persistence and sync"""
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # ═══════════════════════════════════════════════════════════
    # GENERAL SETTINGS
    # ═══════════════════════════════════════════════════════════

    # Appearance
    theme = Column(String, default="dark")  # dark, light, system
    language = Column(String, default="en")

    # Startup
    start_on_boot = Column(Boolean, default=True)
    start_minimized = Column(Boolean, default=False)
    show_in_tray = Column(Boolean, default=True)

    # Window Behavior
    close_to_tray = Column(Boolean, default=True)
    minimize_to_tray = Column(Boolean, default=True)

    # Updates
    auto_update = Column(Boolean, default=True)

    # ═══════════════════════════════════════════════════════════
    # TRACKING SETTINGS
    # ═══════════════════════════════════════════════════════════

    tracking_enabled = Column(Boolean, default=True)
    work_start_time = Column(String, default="09:00")
    work_end_time = Column(String, default="17:00")
    work_days = Column(JSON, default=[1, 2, 3, 4, 5])  # Mon-Fri
    idle_timeout = Column(Integer, default=300)  # seconds
    afk_detection = Column(Boolean, default=True)

    # ═══════════════════════════════════════════════════════════
    # SCREENSHOT SETTINGS
    # ═══════════════════════════════════════════════════════════

    screenshots_enabled = Column(Boolean, default=True)
    screenshot_interval = Column(Integer, default=300)  # seconds
    screenshot_quality = Column(String, default="medium")  # low, medium, high
    blur_screenshots = Column(Boolean, default=False)
    auto_delete_after = Column(Integer, default=30)  # days
    excluded_apps = Column(JSON, default=[])

    # ═══════════════════════════════════════════════════════════
    # AI SETTINGS
    # ═══════════════════════════════════════════════════════════

    ai_model = Column(String, default="gpt-4o-mini")
    auto_analysis = Column(Boolean, default=True)
    analysis_frequency = Column(String, default="daily")  # hourly, daily, weekly

    # ═══════════════════════════════════════════════════════════
    # PRIVACY SETTINGS
    # ═══════════════════════════════════════════════════════════

    incognito_mode = Column(Boolean, default=False)
    data_retention_days = Column(Integer, default=90)
    app_lock_enabled = Column(Boolean, default=False)
    app_lock_pin = Column(String, nullable=True)

    # ═══════════════════════════════════════════════════════════
    # NOTIFICATION SETTINGS
    # ═══════════════════════════════════════════════════════════

    notifications_enabled = Column(Boolean, default=True)
    productivity_alerts = Column(Boolean, default=True)
    break_reminders = Column(Boolean, default=True)
    break_interval = Column(Integer, default=60)  # minutes
    sound_enabled = Column(Boolean, default=True)
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String, default="22:00")
    quiet_hours_end = Column(String, default="08:00")

    # ═══════════════════════════════════════════════════════════
    # TIMESTAMPS
    # ═══════════════════════════════════════════════════════════

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="settings")

    def to_dict(self):
        """Convert settings to dictionary for API response (camelCase for frontend)"""
        return {
            "general": {
                "theme": self.theme,
                "language": self.language,
                "startOnBoot": self.start_on_boot,
                "startMinimized": self.start_minimized,
                "showInTray": self.show_in_tray,
                "closeToTray": self.close_to_tray,
                "minimizeToTray": self.minimize_to_tray,
                "autoUpdate": self.auto_update,
            },
            "tracking": {
                "trackingEnabled": self.tracking_enabled,
                "workStartTime": self.work_start_time,
                "workEndTime": self.work_end_time,
                "workDays": self.work_days or [1, 2, 3, 4, 5],
                "idleTimeout": self.idle_timeout,
                "afkDetection": self.afk_detection,
            },
            "screenshots": {
                "screenshotsEnabled": self.screenshots_enabled,
                "screenshotInterval": self.screenshot_interval,
                "screenshotQuality": self.screenshot_quality,
                "blurScreenshots": self.blur_screenshots,
                "autoDeleteAfter": self.auto_delete_after,
                "excludedApps": self.excluded_apps or [],
            },
            "ai": {
                "aiModel": self.ai_model,
                "autoAnalysis": self.auto_analysis,
                "analysisFrequency": self.analysis_frequency,
            },
            "privacy": {
                "incognitoMode": self.incognito_mode,
                "dataRetentionDays": self.data_retention_days,
                "appLockEnabled": self.app_lock_enabled,
            },
            "notifications": {
                "notificationsEnabled": self.notifications_enabled,
                "productivityAlerts": self.productivity_alerts,
                "breakReminders": self.break_reminders,
                "breakInterval": self.break_interval,
                "soundEnabled": self.sound_enabled,
                "quietHoursEnabled": self.quiet_hours_enabled,
                "quietHoursStart": self.quiet_hours_start,
                "quietHoursEnd": self.quiet_hours_end,
            },
        }

    def update_from_dict(self, data: dict):
        """Update settings from dictionary (handles camelCase from frontend)"""
        if "general" in data:
            g = data["general"]
            if "theme" in g:
                self.theme = g["theme"]
            if "language" in g:
                self.language = g["language"]
            if "startOnBoot" in g:
                self.start_on_boot = g["startOnBoot"]
            if "startMinimized" in g:
                self.start_minimized = g["startMinimized"]
            if "showInTray" in g:
                self.show_in_tray = g["showInTray"]
            if "closeToTray" in g:
                self.close_to_tray = g["closeToTray"]
            if "minimizeToTray" in g:
                self.minimize_to_tray = g["minimizeToTray"]
            if "autoUpdate" in g:
                self.auto_update = g["autoUpdate"]

        if "tracking" in data:
            t = data["tracking"]
            if "trackingEnabled" in t:
                self.tracking_enabled = t["trackingEnabled"]
            if "workStartTime" in t:
                self.work_start_time = t["workStartTime"]
            if "workEndTime" in t:
                self.work_end_time = t["workEndTime"]
            if "workDays" in t:
                self.work_days = t["workDays"]
            if "idleTimeout" in t:
                self.idle_timeout = t["idleTimeout"]
            if "afkDetection" in t:
                self.afk_detection = t["afkDetection"]

        if "screenshots" in data:
            s = data["screenshots"]
            if "screenshotsEnabled" in s:
                self.screenshots_enabled = s["screenshotsEnabled"]
            if "screenshotInterval" in s:
                self.screenshot_interval = s["screenshotInterval"]
            if "screenshotQuality" in s:
                self.screenshot_quality = s["screenshotQuality"]
            if "blurScreenshots" in s:
                self.blur_screenshots = s["blurScreenshots"]
            if "autoDeleteAfter" in s:
                self.auto_delete_after = s["autoDeleteAfter"]
            if "excludedApps" in s:
                self.excluded_apps = s["excludedApps"]

        if "ai" in data:
            a = data["ai"]
            if "aiModel" in a:
                self.ai_model = a["aiModel"]
            if "autoAnalysis" in a:
                self.auto_analysis = a["autoAnalysis"]
            if "analysisFrequency" in a:
                self.analysis_frequency = a["analysisFrequency"]

        if "privacy" in data:
            p = data["privacy"]
            if "incognitoMode" in p:
                self.incognito_mode = p["incognitoMode"]
            if "dataRetentionDays" in p:
                self.data_retention_days = p["dataRetentionDays"]
            if "appLockEnabled" in p:
                self.app_lock_enabled = p["appLockEnabled"]
            if "appLockPin" in p:
                self.app_lock_pin = p["appLockPin"]

        if "notifications" in data:
            n = data["notifications"]
            if "notificationsEnabled" in n:
                self.notifications_enabled = n["notificationsEnabled"]
            if "productivityAlerts" in n:
                self.productivity_alerts = n["productivityAlerts"]
            if "breakReminders" in n:
                self.break_reminders = n["breakReminders"]
            if "breakInterval" in n:
                self.break_interval = n["breakInterval"]
            if "soundEnabled" in n:
                self.sound_enabled = n["soundEnabled"]
            if "quietHoursEnabled" in n:
                self.quiet_hours_enabled = n["quietHoursEnabled"]
            if "quietHoursStart" in n:
                self.quiet_hours_start = n["quietHoursStart"]
            if "quietHoursEnd" in n:
                self.quiet_hours_end = n["quietHoursEnd"]

    @classmethod
    def get_defaults(cls):
        """Return default settings dictionary"""
        return {
            "general": {
                "theme": "dark",
                "language": "en",
                "startOnBoot": True,
                "startMinimized": False,
                "showInTray": True,
                "closeToTray": True,
                "minimizeToTray": True,
                "autoUpdate": True,
            },
            "tracking": {
                "trackingEnabled": True,
                "workStartTime": "09:00",
                "workEndTime": "17:00",
                "workDays": [1, 2, 3, 4, 5],
                "idleTimeout": 300,
                "afkDetection": True,
            },
            "screenshots": {
                "screenshotsEnabled": True,
                "screenshotInterval": 300,
                "screenshotQuality": "medium",
                "blurScreenshots": False,
                "autoDeleteAfter": 30,
                "excludedApps": [],
            },
            "ai": {
                "aiModel": "gpt-4o-mini",
                "autoAnalysis": True,
                "analysisFrequency": "daily",
            },
            "privacy": {
                "incognitoMode": False,
                "dataRetentionDays": 90,
                "appLockEnabled": False,
            },
            "notifications": {
                "notificationsEnabled": True,
                "productivityAlerts": True,
                "breakReminders": True,
                "breakInterval": 60,
                "soundEnabled": True,
                "quietHoursEnabled": False,
                "quietHoursStart": "22:00",
                "quietHoursEnd": "08:00",
            },
        }


class CustomList(Base):
    """User-defined app/site classification lists"""
    __tablename__ = "custom_lists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # null = global
    list_type = Column(String, nullable=False)  # productive, distracting, neutral, excluded
    pattern = Column(String, nullable=False)  # domain or app name
    note = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
