"""
Smart Notification Service

Handles intelligent notification triggers based on user activity patterns.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.notifications import (
    Notification,
    NotificationSettings,
    UserProfile,
    NotificationType,
    NotificationPriority,
)
from app.models.goals import Goal, Streak, FocusSession


class NotificationService:
    """Service for creating smart notifications"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._settings: Optional[NotificationSettings] = None
        self._profile: Optional[UserProfile] = None

    async def _get_settings(self) -> NotificationSettings:
        """Get notification settings"""
        if not self._settings:
            query = select(NotificationSettings)
            result = await self.db.execute(query)
            self._settings = result.scalar_one_or_none()
            if not self._settings:
                self._settings = NotificationSettings()
        return self._settings

    async def _get_profile(self) -> Optional[UserProfile]:
        """Get user profile"""
        if not self._profile:
            query = select(UserProfile)
            result = await self.db.execute(query)
            self._profile = result.scalar_one_or_none()
        return self._profile

    async def _is_quiet_hours(self) -> bool:
        """Check if currently in quiet hours"""
        settings = await self._get_settings()
        if not settings.quiet_hours_enabled:
            return False

        now = datetime.now()
        current_time = now.strftime("%H:%M")

        start = settings.quiet_hours_start
        end = settings.quiet_hours_end

        # Handle overnight quiet hours (e.g., 22:00 - 08:00)
        if start > end:
            return current_time >= start or current_time < end
        else:
            return start <= current_time < end

    async def _can_send_notification(self, notification_type: str) -> bool:
        """Check if we can send this type of notification"""
        settings = await self._get_settings()

        if not settings.notifications_enabled:
            return False

        if await self._is_quiet_hours():
            return False

        # Check type-specific settings
        type_settings = {
            NotificationType.DISTRACTION_ALERT.value: settings.distraction_alerts,
            NotificationType.GOAL_PROGRESS.value: settings.goal_notifications,
            NotificationType.GOAL_ACHIEVED.value: settings.goal_notifications,
            NotificationType.FOCUS_REMINDER.value: settings.focus_reminders,
            NotificationType.BREAK_SUGGESTION.value: settings.break_reminders,
            NotificationType.DAILY_SUMMARY.value: settings.daily_summary,
            NotificationType.STREAK_ALERT.value: settings.streak_notifications,
            NotificationType.WEEKLY_REPORT.value: settings.weekly_report,
            NotificationType.AI_INSIGHT.value: settings.ai_insights,
        }

        return type_settings.get(notification_type, True)

    async def _create_notification(
        self,
        type: str,
        title: str,
        message: str,
        icon: Optional[str] = None,
        actions: Optional[List[Dict]] = None,
        priority: str = NotificationPriority.NORMAL.value,
        source: Optional[str] = None,
        data: Optional[Dict] = None,
        show_native: bool = False,
    ) -> Optional[Notification]:
        """Create a notification if allowed"""
        if not await self._can_send_notification(type):
            return None

        settings = await self._get_settings()

        notification = Notification(
            type=type,
            title=title,
            message=message,
            icon=icon,
            actions=actions,
            priority=priority,
            source=source,
            data=data,
            show_native=show_native and settings.native_notifications,
        )

        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        return notification

    # =========================================================================
    # Smart Notification Triggers
    # =========================================================================

    async def check_distraction_alert(
        self,
        app_name: str,
        duration_minutes: int,
    ) -> Optional[Notification]:
        """
        Trigger: User on distracting site/app for too long
        """
        settings = await self._get_settings()
        threshold = settings.distraction_threshold_minutes

        if duration_minutes < threshold:
            return None

        return await self._create_notification(
            type=NotificationType.DISTRACTION_ALERT.value,
            title="Distraction Alert",
            message=f"You've been on {app_name} for {duration_minutes} minutes.",
            icon="alert-triangle",
            actions=[
                {"label": "Back to work", "action": "dismiss", "primary": True},
                {"label": "5 more minutes", "action": "snooze_5", "primary": False},
            ],
            priority=NotificationPriority.HIGH.value,
            source="distraction_monitor",
            data={"app_name": app_name, "duration": duration_minutes},
            show_native=True,
        )

    async def check_goal_progress(
        self,
        goal: Goal,
        current_value: float,
    ) -> Optional[Notification]:
        """
        Trigger: Goal is 80% complete
        """
        progress = (current_value / goal.target_value) * 100

        if progress < 80 or progress >= 100:
            return None

        remaining = goal.target_value - current_value
        unit = "hour" if remaining == 1 else "hours"

        return await self._create_notification(
            type=NotificationType.GOAL_PROGRESS.value,
            title="Almost There!",
            message=f"Just {remaining:.1f} more {unit} to hit your {goal.name} goal!",
            icon="target",
            actions=[
                {"label": "Keep going", "action": "dismiss", "primary": True},
                {"label": "View goals", "action": "open_goals", "primary": False},
            ],
            priority=NotificationPriority.NORMAL.value,
            source="goal_tracker",
            data={"goal_id": goal.id, "progress": progress},
            show_native=True,
        )

    async def check_goal_achieved(self, goal: Goal) -> Optional[Notification]:
        """
        Trigger: Goal completed
        """
        return await self._create_notification(
            type=NotificationType.GOAL_ACHIEVED.value,
            title="Goal Achieved!",
            message=f"You hit your {goal.name} goal! Great work!",
            icon="trophy",
            actions=[
                {"label": "Celebrate", "action": "dismiss", "primary": True},
                {"label": "Set new goal", "action": "open_goals", "primary": False},
            ],
            priority=NotificationPriority.HIGH.value,
            source="goal_tracker",
            data={"goal_id": goal.id},
            show_native=True,
        )

    async def check_focus_reminder(
        self,
        is_peak_hour: bool,
        hour: int,
    ) -> Optional[Notification]:
        """
        Trigger: It's the user's peak productivity hour
        """
        if not is_peak_hour:
            return None

        hour_str = f"{hour}:00"
        if hour > 12:
            hour_str = f"{hour - 12}:00 PM"
        elif hour == 12:
            hour_str = "12:00 PM"
        else:
            hour_str = f"{hour}:00 AM"

        return await self._create_notification(
            type=NotificationType.FOCUS_REMINDER.value,
            title="Peak Productivity Hour",
            message=f"It's {hour_str} - your most productive hour! Time to focus.",
            icon="zap",
            actions=[
                {"label": "Start Focus Session", "action": "start_focus", "primary": True},
                {"label": "Not now", "action": "dismiss", "primary": False},
            ],
            priority=NotificationPriority.NORMAL.value,
            source="productivity_analyzer",
            data={"hour": hour},
            show_native=True,
        )

    async def check_break_suggestion(
        self,
        continuous_work_minutes: int,
    ) -> Optional[Notification]:
        """
        Trigger: User has been working continuously for too long
        """
        settings = await self._get_settings()
        threshold = settings.break_threshold_minutes

        if continuous_work_minutes < threshold:
            return None

        hours = continuous_work_minutes // 60
        hours_str = f"{hours} hour" if hours == 1 else f"{hours} hours"

        return await self._create_notification(
            type=NotificationType.BREAK_SUGGESTION.value,
            title="Time for a Break?",
            message=f"You've been working for {hours_str}. A short break can boost productivity!",
            icon="coffee",
            actions=[
                {"label": "Take 5 min break", "action": "start_break_5", "primary": True},
                {"label": "Keep working", "action": "dismiss", "primary": False},
            ],
            priority=NotificationPriority.NORMAL.value,
            source="break_monitor",
            data={"work_duration": continuous_work_minutes},
            show_native=True,
        )

    async def send_daily_summary(
        self,
        productivity_score: float,
        productive_hours: float,
        focus_sessions: int,
    ) -> Optional[Notification]:
        """
        Trigger: End of work day
        """
        # Determine message based on productivity
        if productivity_score >= 80:
            emoji = "star"
            adjective = "Amazing"
        elif productivity_score >= 60:
            emoji = "thumbs-up"
            adjective = "Great"
        elif productivity_score >= 40:
            emoji = "check"
            adjective = "Good"
        else:
            emoji = "target"
            adjective = "Okay"

        message = f"{adjective} day! You were {productivity_score:.0f}% productive with {productive_hours:.1f} hours of focused work."
        if focus_sessions > 0:
            message += f" Completed {focus_sessions} focus session{'s' if focus_sessions > 1 else ''}."

        return await self._create_notification(
            type=NotificationType.DAILY_SUMMARY.value,
            title="Daily Summary",
            message=message,
            icon=emoji,
            actions=[
                {"label": "View Summary", "action": "open_analytics", "primary": True},
                {"label": "Dismiss", "action": "dismiss", "primary": False},
            ],
            priority=NotificationPriority.NORMAL.value,
            source="daily_summary",
            data={
                "productivity_score": productivity_score,
                "productive_hours": productive_hours,
                "focus_sessions": focus_sessions,
            },
            show_native=True,
        )

    async def check_streak_alert(
        self,
        streak: Streak,
        minutes_remaining: int,
    ) -> Optional[Notification]:
        """
        Trigger: Streak is about to expire
        """
        if minutes_remaining > 60:  # Only alert within last hour
            return None

        return await self._create_notification(
            type=NotificationType.STREAK_ALERT.value,
            title="Don't Break Your Streak!",
            message=f"Your {streak.current_count}-day {streak.streak_type.replace('_', ' ')} streak expires in {minutes_remaining} minutes!",
            icon="flame",
            actions=[
                {"label": "Keep streak", "action": "open_goals", "primary": True},
                {"label": "Remind later", "action": "snooze_15", "primary": False},
            ],
            priority=NotificationPriority.HIGH.value,
            source="streak_tracker",
            data={"streak_id": streak.id, "streak_count": streak.current_count},
            show_native=True,
        )

    async def send_weekly_report_ready(self) -> Optional[Notification]:
        """
        Trigger: Weekly report is generated (typically Monday)
        """
        return await self._create_notification(
            type=NotificationType.WEEKLY_REPORT.value,
            title="Weekly Report Ready",
            message="Your weekly productivity report is ready. See how you did last week!",
            icon="bar-chart",
            actions=[
                {"label": "View Report", "action": "open_weekly_report", "primary": True},
                {"label": "Later", "action": "dismiss", "primary": False},
            ],
            priority=NotificationPriority.NORMAL.value,
            source="weekly_report",
            show_native=True,
        )

    async def send_ai_insight(
        self,
        insight: str,
        category: str,
    ) -> Optional[Notification]:
        """
        Trigger: AI generates a new insight
        """
        return await self._create_notification(
            type=NotificationType.AI_INSIGHT.value,
            title="AI Insight",
            message=insight,
            icon="brain",
            actions=[
                {"label": "View Details", "action": "open_ai_insights", "primary": True},
                {"label": "Dismiss", "action": "dismiss", "primary": False},
            ],
            priority=NotificationPriority.LOW.value,
            source="ai_insights",
            data={"category": category},
            show_native=False,  # AI insights less intrusive
        )


# Helper function to get notification service
async def get_notification_service(db: AsyncSession) -> NotificationService:
    """Factory function to create notification service"""
    return NotificationService(db)
