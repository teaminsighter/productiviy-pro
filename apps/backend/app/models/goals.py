"""
Goals, Streaks, Achievements, and Focus Session Models
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class GoalType(str, enum.Enum):
    """Types of goals users can set"""
    PRODUCTIVE_HOURS = "productive_hours"
    CATEGORY_LIMIT = "category_limit"
    FOCUS_SESSIONS = "focus_sessions"
    APP_SPECIFIC = "app_specific"
    DISTRACTION_LIMIT = "distraction_limit"


class GoalFrequency(str, enum.Enum):
    """How often the goal resets"""
    DAILY = "daily"
    WEEKLY = "weekly"


class GoalStatus(str, enum.Enum):
    """Current status of a goal"""
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    COMPLETED = "completed"
    FAILED = "failed"


class StreakType(str, enum.Enum):
    """Types of streaks to track"""
    PRODUCTIVITY_GOAL = "productivity_goal"
    DISTRACTION_LIMIT = "distraction_limit"
    FOCUS_SESSIONS = "focus_sessions"
    EARLY_BIRD = "early_bird"
    CONSISTENCY = "consistency"


class AchievementType(str, enum.Enum):
    """Types of achievements/badges"""
    STREAK_7_DAYS = "streak_7_days"
    STREAK_30_DAYS = "streak_30_days"
    STREAK_100_DAYS = "streak_100_days"
    HOURS_100 = "hours_100"
    HOURS_500 = "hours_500"
    HOURS_1000 = "hours_1000"
    FOCUS_MASTER = "focus_master"
    FOCUS_WARRIOR = "focus_warrior"
    EARLY_BIRD = "early_bird"
    NIGHT_OWL = "night_owl"
    DISTRACTION_FIGHTER = "distraction_fighter"
    ZERO_DISTRACTION_DAY = "zero_distraction_day"
    PERFECT_WEEK = "perfect_week"
    CATEGORY_CHAMPION = "category_champion"
    FIRST_GOAL = "first_goal"
    GOAL_CRUSHER = "goal_crusher"


class Goal(Base):
    """User-defined productivity goals"""
    __tablename__ = "goals"
    __table_args__ = (
        Index("ix_goals_user_active", "user_id", "is_active"),
        Index("ix_goals_user_type", "user_id", "goal_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    goal_type = Column(String(50), nullable=False)
    target_value = Column(Float, nullable=False)  # Hours, count, or percentage
    current_value = Column(Float, default=0.0)
    frequency = Column(String(20), default="daily")

    # For app/category specific goals
    target_app = Column(String(255), nullable=True)
    target_category = Column(String(100), nullable=True)

    # Settings
    is_active = Column(Boolean, default=True)
    notifications_enabled = Column(Boolean, default=True)

    # Tracking
    status = Column(String(20), default="on_track")
    last_reset = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="goals")

    def __repr__(self):
        return f"<Goal {self.name}: {self.current_value}/{self.target_value}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "goal_type": self.goal_type,
            "target_value": self.target_value,
            "current_value": self.current_value,
            "frequency": self.frequency,
            "target_app": self.target_app,
            "target_category": self.target_category,
            "is_active": self.is_active,
            "notifications_enabled": self.notifications_enabled,
            "status": self.status,
            "last_reset": self.last_reset.isoformat() if self.last_reset else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "progress_percentage": min(100, (self.current_value / self.target_value * 100)) if self.target_value > 0 else 0,
        }


class Streak(Base):
    """Track user streaks for various achievements"""
    __tablename__ = "streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    streak_type = Column(String(50), nullable=False)
    current_count = Column(Integer, default=0)
    best_count = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)
    last_achieved_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="streaks")

    def __repr__(self):
        return f"<Streak {self.streak_type}: {self.current_count} (best: {self.best_count})>"

    def to_dict(self):
        return {
            "id": self.id,
            "streak_type": self.streak_type,
            "current_count": self.current_count,
            "best_count": self.best_count,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "last_achieved_date": self.last_achieved_date.isoformat() if self.last_achieved_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def increment(self):
        """Increment streak and update best if necessary"""
        self.current_count += 1
        if self.current_count > self.best_count:
            self.best_count = self.current_count
        self.last_updated = datetime.utcnow()
        self.last_achieved_date = datetime.utcnow()

    def reset(self):
        """Reset current streak"""
        self.current_count = 0
        self.last_updated = datetime.utcnow()


class Achievement(Base):
    """User achievements/badges"""
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    achievement_type = Column(String(50), nullable=False)  # Removed unique=True for multi-user
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    earned_at = Column(DateTime, nullable=True)
    progress = Column(Float, default=0.0)  # For achievements that have progress
    target = Column(Float, nullable=True)  # Target for progress-based achievements
    is_unlocked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="achievements")

    def __repr__(self):
        status = "unlocked" if self.is_unlocked else "locked"
        return f"<Achievement {self.name}: {status}>"

    def to_dict(self):
        return {
            "id": self.id,
            "achievement_type": self.achievement_type,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "earned_at": self.earned_at.isoformat() if self.earned_at else None,
            "progress": self.progress,
            "target": self.target,
            "is_unlocked": self.is_unlocked,
            "progress_percentage": min(100, (self.progress / self.target * 100)) if self.target and self.target > 0 else 0,
        }

    def unlock(self):
        """Unlock the achievement"""
        if not self.is_unlocked:
            self.is_unlocked = True
            self.earned_at = datetime.utcnow()
            self.progress = self.target if self.target else 1


class FocusSession(Base):
    """Focus timer sessions"""
    __tablename__ = "focus_sessions"
    __table_args__ = (
        Index("ix_focus_sessions_user_time", "user_id", "started_at"),
        Index("ix_focus_sessions_user_completed", "user_id", "was_completed"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    name = Column(String(255), nullable=True)
    duration_planned = Column(Integer, nullable=False)  # In seconds
    duration_actual = Column(Integer, nullable=True)  # In seconds
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)
    was_completed = Column(Boolean, default=False)
    was_interrupted = Column(Boolean, default=False)
    interruption_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    # Session settings
    block_distractions = Column(Boolean, default=True)
    break_reminder = Column(Boolean, default=True)

    # Tracked activity during session
    primary_app = Column(String(255), nullable=True)
    primary_category = Column(String(100), nullable=True)
    productive_time = Column(Integer, default=0)  # In seconds

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="focus_sessions")

    def __repr__(self):
        status = "completed" if self.was_completed else "incomplete"
        return f"<FocusSession {self.id}: {self.duration_planned}s ({status})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "duration_planned": self.duration_planned,
            "duration_actual": self.duration_actual,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "was_completed": self.was_completed,
            "was_interrupted": self.was_interrupted,
            "interruption_count": self.interruption_count,
            "notes": self.notes,
            "block_distractions": self.block_distractions,
            "break_reminder": self.break_reminder,
            "primary_app": self.primary_app,
            "primary_category": self.primary_category,
            "productive_time": self.productive_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completion_percentage": min(100, (self.duration_actual / self.duration_planned * 100)) if self.duration_actual and self.duration_planned > 0 else 0,
        }

    def end_session(self, completed: bool = True):
        """End the focus session"""
        self.ended_at = datetime.utcnow()
        self.was_completed = completed
        if self.started_at:
            self.duration_actual = int((self.ended_at - self.started_at).total_seconds())


class DailyGoalProgress(Base):
    """Track daily progress for goals (for historical data)"""
    __tablename__ = "daily_goal_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    value = Column(Float, default=0.0)
    target = Column(Float, nullable=False)
    was_achieved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    goal = relationship("Goal", backref="daily_progress")

    def __repr__(self):
        return f"<DailyGoalProgress goal={self.goal_id} date={self.date}: {self.value}/{self.target}>"

    def to_dict(self):
        return {
            "id": self.id,
            "goal_id": self.goal_id,
            "date": self.date.isoformat() if self.date else None,
            "value": self.value,
            "target": self.target,
            "was_achieved": self.was_achieved,
            "progress_percentage": min(100, (self.value / self.target * 100)) if self.target > 0 else 0,
        }


# Achievement definitions for initialization
ACHIEVEMENT_DEFINITIONS = [
    {
        "achievement_type": "streak_7_days",
        "name": "7-Day Streak",
        "description": "Meet your productivity goal for 7 consecutive days",
        "icon": "flame",
        "target": 7,
    },
    {
        "achievement_type": "streak_30_days",
        "name": "30-Day Streak",
        "description": "Meet your productivity goal for 30 consecutive days",
        "icon": "flame",
        "target": 30,
    },
    {
        "achievement_type": "streak_100_days",
        "name": "100-Day Streak",
        "description": "Meet your productivity goal for 100 consecutive days",
        "icon": "flame",
        "target": 100,
    },
    {
        "achievement_type": "hours_100",
        "name": "Century Club",
        "description": "Log 100 hours of productive time",
        "icon": "clock",
        "target": 100,
    },
    {
        "achievement_type": "hours_500",
        "name": "Time Master",
        "description": "Log 500 hours of productive time",
        "icon": "clock",
        "target": 500,
    },
    {
        "achievement_type": "hours_1000",
        "name": "Productivity Legend",
        "description": "Log 1000 hours of productive time",
        "icon": "crown",
        "target": 1000,
    },
    {
        "achievement_type": "focus_master",
        "name": "Focus Master",
        "description": "Complete 10 focus sessions",
        "icon": "target",
        "target": 10,
    },
    {
        "achievement_type": "focus_warrior",
        "name": "Focus Warrior",
        "description": "Complete 100 focus sessions",
        "icon": "zap",
        "target": 100,
    },
    {
        "achievement_type": "early_bird",
        "name": "Early Bird",
        "description": "Be productive before 9am for 7 days",
        "icon": "sunrise",
        "target": 7,
    },
    {
        "achievement_type": "night_owl",
        "name": "Night Owl",
        "description": "Be productive after 9pm for 7 days",
        "icon": "moon",
        "target": 7,
    },
    {
        "achievement_type": "distraction_fighter",
        "name": "Distraction Fighter",
        "description": "Stay under distraction limit for 7 consecutive days",
        "icon": "shield",
        "target": 7,
    },
    {
        "achievement_type": "zero_distraction_day",
        "name": "Zero Distraction Day",
        "description": "Have a day with zero distracting activities",
        "icon": "star",
        "target": 1,
    },
    {
        "achievement_type": "perfect_week",
        "name": "Perfect Week",
        "description": "Meet all your goals for an entire week",
        "icon": "trophy",
        "target": 1,
    },
    {
        "achievement_type": "first_goal",
        "name": "Goal Setter",
        "description": "Create your first goal",
        "icon": "flag",
        "target": 1,
    },
    {
        "achievement_type": "goal_crusher",
        "name": "Goal Crusher",
        "description": "Complete 50 goals",
        "icon": "check-circle",
        "target": 50,
    },
]
