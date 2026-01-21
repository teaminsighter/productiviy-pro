from app.models.activity import Activity, URLActivity, YouTubeActivity
from app.models.screenshot import Screenshot
from app.models.settings import UserSettings, CustomList
from app.models.goals import (
    Goal,
    Streak,
    Achievement,
    FocusSession,
    DailyGoalProgress,
    GoalType,
    GoalFrequency,
    GoalStatus,
    StreakType,
    AchievementType,
    ACHIEVEMENT_DEFINITIONS,
)
from app.models.rules import (
    PlatformRule,
    URLRule,
    CustomCategory,
    WorkSchedule,
    DEFAULT_PLATFORM_RULES,
    DEFAULT_CATEGORIES,
)
from app.models.calendar import (
    CalendarConnection,
    CalendarEvent,
    CalendarProvider,
    DeepWorkScore,
    FocusBlock,
    FocusSettings,
)
from app.models.team import (
    Team,
    TeamMember,
    TeamInvite,
    TeamPermission,
    TeamRole,
    TeamDeepWorkScore,
    TeamMeetingFreeZone,
    TeamManagerAlert,
    TeamSchedulingSuggestion,
    AlertType,
    AlertPriority,
)
from app.models.integrations import (
    IntegrationConnection,
    IntegrationType,
    IntegrationStatus,
    GitHubActivity,
    SlackActivity,
    DeveloperMetrics,
    IntegrationWebhook,
)
from app.models.work_session import WorkSession

__all__ = [
    "Activity",
    "URLActivity",
    "YouTubeActivity",
    "Screenshot",
    "UserSettings",
    "CustomList",
    "Goal",
    "Streak",
    "Achievement",
    "FocusSession",
    "DailyGoalProgress",
    "GoalType",
    "GoalFrequency",
    "GoalStatus",
    "StreakType",
    "AchievementType",
    "ACHIEVEMENT_DEFINITIONS",
    # Rules
    "PlatformRule",
    "URLRule",
    "CustomCategory",
    "WorkSchedule",
    "DEFAULT_PLATFORM_RULES",
    "DEFAULT_CATEGORIES",
    # Calendar & Deep Work
    "CalendarConnection",
    "CalendarEvent",
    "CalendarProvider",
    "DeepWorkScore",
    "FocusBlock",
    "FocusSettings",
    # Teams
    "Team",
    "TeamMember",
    "TeamInvite",
    "TeamPermission",
    "TeamRole",
    "TeamDeepWorkScore",
    "TeamMeetingFreeZone",
    "TeamManagerAlert",
    "TeamSchedulingSuggestion",
    "AlertType",
    "AlertPriority",
    # Integrations
    "IntegrationConnection",
    "IntegrationType",
    "IntegrationStatus",
    "GitHubActivity",
    "SlackActivity",
    "DeveloperMetrics",
    "IntegrationWebhook",
    # Work Sessions (Freelancer time tracking)
    "WorkSession",
]
