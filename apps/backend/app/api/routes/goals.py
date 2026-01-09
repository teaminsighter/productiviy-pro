"""
Goals, Streaks, Achievements, and Focus API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.models.goals import (
    Goal,
    Streak,
    Achievement,
    FocusSession,
    DailyGoalProgress,
    ACHIEVEMENT_DEFINITIONS,
)

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class GoalCreate(BaseModel):
    """Create a new goal"""
    name: str
    description: Optional[str] = None
    goal_type: str  # productive_hours, category_limit, focus_sessions, app_specific
    target_value: float
    frequency: str = "daily"  # daily, weekly
    target_app: Optional[str] = None
    target_category: Optional[str] = None
    notifications_enabled: bool = True


class GoalUpdate(BaseModel):
    """Update an existing goal"""
    name: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    is_active: Optional[bool] = None
    notifications_enabled: Optional[bool] = None


class GoalResponse(BaseModel):
    """Goal response model"""
    id: int
    name: str
    description: Optional[str]
    goal_type: str
    target_value: float
    current_value: float
    frequency: str
    target_app: Optional[str]
    target_category: Optional[str]
    is_active: bool
    notifications_enabled: bool
    status: str
    progress_percentage: float
    last_reset: Optional[str]
    created_at: Optional[str]


class GoalProgressResponse(BaseModel):
    """Goal progress summary"""
    total_goals: int
    completed_today: int
    on_track: int
    at_risk: int
    goals: List[GoalResponse]


class StreakResponse(BaseModel):
    """Streak response model"""
    id: int
    streak_type: str
    current_count: int
    best_count: int
    last_updated: Optional[str]
    last_achieved_date: Optional[str]


class AchievementResponse(BaseModel):
    """Achievement response model"""
    id: int
    achievement_type: str
    name: str
    description: Optional[str]
    icon: Optional[str]
    earned_at: Optional[str]
    progress: float
    target: Optional[float]
    is_unlocked: bool
    progress_percentage: float


class FocusSessionCreate(BaseModel):
    """Start a new focus session"""
    name: Optional[str] = None
    duration_planned: int  # In seconds
    block_distractions: bool = True
    break_reminder: bool = True


class FocusSessionEnd(BaseModel):
    """End a focus session"""
    notes: Optional[str] = None
    was_completed: bool = True


class FocusSessionResponse(BaseModel):
    """Focus session response model"""
    id: int
    name: Optional[str]
    duration_planned: int
    duration_actual: Optional[int]
    started_at: str
    ended_at: Optional[str]
    was_completed: bool
    was_interrupted: bool
    interruption_count: int
    notes: Optional[str]
    block_distractions: bool
    break_reminder: bool
    primary_app: Optional[str]
    primary_category: Optional[str]
    productive_time: int
    completion_percentage: float


class FocusStatsResponse(BaseModel):
    """Focus statistics"""
    total_sessions: int
    completed_sessions: int
    total_focus_time: int  # In seconds
    average_session_length: int  # In seconds
    completion_rate: float
    best_day: Optional[str]
    best_day_time: int  # In seconds
    today_sessions: int
    today_focus_time: int
    week_sessions: int
    week_focus_time: int
    current_streak: int


class StreakCalendarDay(BaseModel):
    """Single day in streak calendar"""
    date: str
    value: int  # 0-4 intensity
    achieved: bool


class StreakCalendarResponse(BaseModel):
    """Streak calendar data (GitHub-style)"""
    days: List[StreakCalendarDay]
    streak_type: str


# ============================================================================
# Goals Endpoints
# ============================================================================

@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    active_only: bool = Query(True, description="Only return active goals"),
    db: AsyncSession = Depends(get_db),
):
    """Get all goals"""
    query = select(Goal)
    if active_only:
        query = query.where(Goal.is_active == True)
    query = query.order_by(Goal.created_at.desc())

    result = await db.execute(query)
    goals = result.scalars().all()

    return [goal.to_dict() for goal in goals]


@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new goal"""
    goal = Goal(
        name=goal_data.name,
        description=goal_data.description,
        goal_type=goal_data.goal_type,
        target_value=goal_data.target_value,
        frequency=goal_data.frequency,
        target_app=goal_data.target_app,
        target_category=goal_data.target_category,
        notifications_enabled=goal_data.notifications_enabled,
        current_value=0.0,
        status="on_track",
    )

    db.add(goal)
    await db.commit()
    await db.refresh(goal)

    # Check for first goal achievement
    await check_and_unlock_achievement(db, "first_goal", 1)

    return goal.to_dict()


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific goal"""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal.to_dict()


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a goal"""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if goal_data.name is not None:
        goal.name = goal_data.name
    if goal_data.description is not None:
        goal.description = goal_data.description
    if goal_data.target_value is not None:
        goal.target_value = goal_data.target_value
    if goal_data.is_active is not None:
        goal.is_active = goal_data.is_active
    if goal_data.notifications_enabled is not None:
        goal.notifications_enabled = goal_data.notifications_enabled

    goal.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(goal)

    return goal.to_dict()


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a goal"""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    await db.delete(goal)
    await db.commit()

    return {"status": "deleted", "id": goal_id}


@router.get("/progress/summary", response_model=GoalProgressResponse)
async def get_goal_progress(
    db: AsyncSession = Depends(get_db),
):
    """Get progress summary for all active goals"""
    result = await db.execute(
        select(Goal).where(Goal.is_active == True).order_by(Goal.created_at.desc())
    )
    goals = result.scalars().all()

    completed = sum(1 for g in goals if g.status == "completed")
    on_track = sum(1 for g in goals if g.status == "on_track")
    at_risk = sum(1 for g in goals if g.status == "at_risk")

    return {
        "total_goals": len(goals),
        "completed_today": completed,
        "on_track": on_track,
        "at_risk": at_risk,
        "goals": [goal.to_dict() for goal in goals],
    }


@router.post("/{goal_id}/progress")
async def update_goal_progress(
    goal_id: int,
    value: float = Query(..., description="New progress value"),
    db: AsyncSession = Depends(get_db),
):
    """Update goal progress (usually called automatically by the system)"""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.current_value = value

    # Update status based on progress
    progress_pct = (value / goal.target_value * 100) if goal.target_value > 0 else 0

    if progress_pct >= 100:
        goal.status = "completed"
    elif progress_pct >= 50:
        goal.status = "on_track"
    else:
        # Check time of day to determine if at risk
        now = datetime.now()
        if goal.frequency == "daily":
            hours_left = 24 - now.hour
            expected_progress = (now.hour / 24) * 100
            if progress_pct < expected_progress * 0.7:
                goal.status = "at_risk"
            else:
                goal.status = "on_track"
        else:
            goal.status = "on_track"

    await db.commit()
    await db.refresh(goal)

    return goal.to_dict()


# ============================================================================
# Streaks Endpoints
# ============================================================================

@router.get("/streaks/", response_model=List[StreakResponse])
async def get_streaks(
    db: AsyncSession = Depends(get_db),
):
    """Get all streaks"""
    result = await db.execute(select(Streak).order_by(Streak.streak_type))
    streaks = result.scalars().all()

    # Initialize default streaks if none exist
    if not streaks:
        default_streaks = [
            Streak(streak_type="productivity_goal"),
            Streak(streak_type="distraction_limit"),
            Streak(streak_type="focus_sessions"),
            Streak(streak_type="consistency"),
        ]
        for streak in default_streaks:
            db.add(streak)
        await db.commit()

        result = await db.execute(select(Streak))
        streaks = result.scalars().all()

    return [streak.to_dict() for streak in streaks]


@router.get("/streaks/{streak_type}", response_model=StreakResponse)
async def get_streak(
    streak_type: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific streak"""
    result = await db.execute(
        select(Streak).where(Streak.streak_type == streak_type)
    )
    streak = result.scalar_one_or_none()

    if not streak:
        # Create if doesn't exist
        streak = Streak(streak_type=streak_type)
        db.add(streak)
        await db.commit()
        await db.refresh(streak)

    return streak.to_dict()


@router.get("/streaks/{streak_type}/calendar", response_model=StreakCalendarResponse)
async def get_streak_calendar(
    streak_type: str,
    days: int = Query(365, description="Number of days to show"),
    db: AsyncSession = Depends(get_db),
):
    """Get streak calendar data (GitHub-style contribution graph)"""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Get daily goal progress for the streak type
    # For now, generate sample data based on actual goal progress
    result = await db.execute(
        select(DailyGoalProgress)
        .where(DailyGoalProgress.date >= start_date)
        .order_by(DailyGoalProgress.date)
    )
    progress_data = result.scalars().all()

    # Create calendar data
    calendar_days = []
    progress_by_date = {p.date.date(): p for p in progress_data}

    current_date = start_date
    while current_date <= end_date:
        progress = progress_by_date.get(current_date)
        if progress:
            value = min(4, int(progress.value / progress.target * 4)) if progress.target > 0 else 0
            achieved = progress.was_achieved
        else:
            value = 0
            achieved = False

        calendar_days.append({
            "date": current_date.isoformat(),
            "value": value,
            "achieved": achieved,
        })
        current_date += timedelta(days=1)

    return {
        "days": calendar_days,
        "streak_type": streak_type,
    }


# ============================================================================
# Achievements Endpoints
# ============================================================================

@router.get("/achievements/", response_model=List[AchievementResponse])
async def get_achievements(
    db: AsyncSession = Depends(get_db),
):
    """Get all achievements"""
    result = await db.execute(select(Achievement).order_by(Achievement.achievement_type))
    achievements = result.scalars().all()

    # Initialize achievements if none exist
    if not achievements:
        for defn in ACHIEVEMENT_DEFINITIONS:
            achievement = Achievement(
                achievement_type=defn["achievement_type"],
                name=defn["name"],
                description=defn["description"],
                icon=defn["icon"],
                target=defn["target"],
                progress=0,
                is_unlocked=False,
            )
            db.add(achievement)
        await db.commit()

        result = await db.execute(select(Achievement))
        achievements = result.scalars().all()

    return [a.to_dict() for a in achievements]


@router.get("/achievements/{achievement_type}", response_model=AchievementResponse)
async def get_achievement(
    achievement_type: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific achievement"""
    result = await db.execute(
        select(Achievement).where(Achievement.achievement_type == achievement_type)
    )
    achievement = result.scalar_one_or_none()

    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")

    return achievement.to_dict()


async def check_and_unlock_achievement(
    db: AsyncSession,
    achievement_type: str,
    progress_increment: float = 1,
):
    """Check and potentially unlock an achievement"""
    result = await db.execute(
        select(Achievement).where(Achievement.achievement_type == achievement_type)
    )
    achievement = result.scalar_one_or_none()

    if not achievement:
        # Find definition and create
        defn = next((d for d in ACHIEVEMENT_DEFINITIONS if d["achievement_type"] == achievement_type), None)
        if defn:
            achievement = Achievement(
                achievement_type=defn["achievement_type"],
                name=defn["name"],
                description=defn["description"],
                icon=defn["icon"],
                target=defn["target"],
                progress=0,
                is_unlocked=False,
            )
            db.add(achievement)
            await db.commit()
            await db.refresh(achievement)

    if achievement and not achievement.is_unlocked:
        achievement.progress += progress_increment

        if achievement.target and achievement.progress >= achievement.target:
            achievement.unlock()

        await db.commit()

    return achievement


# ============================================================================
# Focus Session Endpoints
# ============================================================================

# Store for active focus session (in production, use Redis or similar)
_active_focus_session: Optional[int] = None


@router.post("/focus/start", response_model=FocusSessionResponse)
async def start_focus_session(
    session_data: FocusSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Start a new focus session"""
    global _active_focus_session

    # Check if there's already an active session
    if _active_focus_session:
        result = await db.execute(
            select(FocusSession).where(
                and_(
                    FocusSession.id == _active_focus_session,
                    FocusSession.ended_at == None
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A focus session is already active"
            )

    session = FocusSession(
        name=session_data.name,
        duration_planned=session_data.duration_planned,
        block_distractions=session_data.block_distractions,
        break_reminder=session_data.break_reminder,
        started_at=datetime.utcnow(),
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    _active_focus_session = session.id

    return session.to_dict()


@router.get("/focus/active", response_model=Optional[FocusSessionResponse])
async def get_active_focus_session(
    db: AsyncSession = Depends(get_db),
):
    """Get the currently active focus session"""
    global _active_focus_session

    if not _active_focus_session:
        return None

    result = await db.execute(
        select(FocusSession).where(
            and_(
                FocusSession.id == _active_focus_session,
                FocusSession.ended_at == None
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        _active_focus_session = None
        return None

    return session.to_dict()


@router.post("/focus/end", response_model=FocusSessionResponse)
async def end_focus_session(
    end_data: FocusSessionEnd,
    db: AsyncSession = Depends(get_db),
):
    """End the active focus session"""
    global _active_focus_session

    if not _active_focus_session:
        raise HTTPException(status_code=400, detail="No active focus session")

    result = await db.execute(
        select(FocusSession).where(FocusSession.id == _active_focus_session)
    )
    session = result.scalar_one_or_none()

    if not session:
        _active_focus_session = None
        raise HTTPException(status_code=404, detail="Focus session not found")

    session.end_session(completed=end_data.was_completed)
    session.notes = end_data.notes

    await db.commit()
    await db.refresh(session)

    _active_focus_session = None

    # Update achievements
    if end_data.was_completed:
        await check_and_unlock_achievement(db, "focus_master", 1)
        await check_and_unlock_achievement(db, "focus_warrior", 1)

    return session.to_dict()


@router.post("/focus/{session_id}/interrupt")
async def record_interruption(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Record an interruption in the focus session"""
    result = await db.execute(
        select(FocusSession).where(FocusSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")

    session.interruption_count += 1
    session.was_interrupted = True

    await db.commit()

    return {"status": "recorded", "interruption_count": session.interruption_count}


@router.get("/focus/history", response_model=List[FocusSessionResponse])
async def get_focus_history(
    limit: int = Query(50, description="Maximum sessions to return"),
    days: int = Query(30, description="Days to look back"),
    db: AsyncSession = Depends(get_db),
):
    """Get focus session history"""
    start_date = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(FocusSession)
        .where(FocusSession.started_at >= start_date)
        .order_by(desc(FocusSession.started_at))
        .limit(limit)
    )
    sessions = result.scalars().all()

    return [s.to_dict() for s in sessions]


@router.get("/focus/stats", response_model=FocusStatsResponse)
async def get_focus_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get focus session statistics"""
    # All-time stats
    result = await db.execute(select(FocusSession))
    all_sessions = result.scalars().all()

    total_sessions = len(all_sessions)
    completed_sessions = sum(1 for s in all_sessions if s.was_completed)
    total_focus_time = sum(s.duration_actual or 0 for s in all_sessions)
    avg_session_length = total_focus_time // total_sessions if total_sessions > 0 else 0
    completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0

    # Today's stats
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = [s for s in all_sessions if s.started_at and s.started_at >= today_start]
    today_count = len(today_sessions)
    today_focus_time = sum(s.duration_actual or 0 for s in today_sessions)

    # This week's stats
    week_start = today_start - timedelta(days=today_start.weekday())
    week_sessions = [s for s in all_sessions if s.started_at and s.started_at >= week_start]
    week_count = len(week_sessions)
    week_focus_time = sum(s.duration_actual or 0 for s in week_sessions)

    # Best day
    daily_totals = {}
    for s in all_sessions:
        if s.started_at and s.duration_actual:
            day = s.started_at.date()
            daily_totals[day] = daily_totals.get(day, 0) + s.duration_actual

    best_day = None
    best_day_time = 0
    if daily_totals:
        best_day, best_day_time = max(daily_totals.items(), key=lambda x: x[1])
        best_day = best_day.isoformat()

    # Current streak (consecutive days with completed sessions)
    current_streak = 0
    check_date = date.today()
    while True:
        day_sessions = [
            s for s in all_sessions
            if s.started_at and s.started_at.date() == check_date and s.was_completed
        ]
        if day_sessions:
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_focus_time": total_focus_time,
        "average_session_length": avg_session_length,
        "completion_rate": completion_rate,
        "best_day": best_day,
        "best_day_time": best_day_time,
        "today_sessions": today_count,
        "today_focus_time": today_focus_time,
        "week_sessions": week_count,
        "week_focus_time": week_focus_time,
        "current_streak": current_streak,
    }
