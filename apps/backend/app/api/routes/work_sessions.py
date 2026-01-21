"""
Work Sessions API Routes

For freelancers and teams to track billable work time.
Provides verified time tracking with screenshots as proof.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.work_session import WorkSession
from app.models.screenshot import Screenshot
from app.models.user import User
from app.api.routes.auth import get_current_user_optional

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════

class StartSessionRequest(BaseModel):
    project_name: Optional[str] = None
    task_description: Optional[str] = None
    client_name: Optional[str] = None


class EndSessionRequest(BaseModel):
    notes: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    user_id: int
    project_name: Optional[str]
    task_description: Optional[str]
    client_name: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    total_duration: int
    active_duration: int
    idle_duration: int
    paused_duration: int
    activity_level: float
    productivity_score: float
    screenshot_count: int
    status: str
    notes: Optional[str]

    class Config:
        from_attributes = True


class SessionSummary(BaseModel):
    """Summary for client reports"""
    total_sessions: int
    total_time: int  # seconds
    billable_time: int  # active time only
    idle_time: int
    paused_time: int
    average_activity_level: float
    average_productivity: float
    screenshot_count: int


class ClientReport(BaseModel):
    """Detailed report for clients"""
    period_start: datetime
    period_end: datetime
    client_name: Optional[str]
    project_name: Optional[str]
    summary: SessionSummary
    sessions: List[SessionResponse]


# ═══════════════════════════════════════════════════════════════════
# API Routes
# ═══════════════════════════════════════════════════════════════════

@router.post("/start", response_model=SessionResponse)
async def start_work_session(
    request: StartSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Start a new work session"""
    user_id = current_user.id if current_user else 1

    # Check for existing active session
    result = await db.execute(
        select(WorkSession).where(
            and_(
                WorkSession.user_id == user_id,
                WorkSession.status == "active"
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have an active work session. End it first."
        )

    # Create new session
    session = WorkSession(
        user_id=user_id,
        project_name=request.project_name,
        task_description=request.task_description,
        client_name=request.client_name,
        started_at=datetime.utcnow(),
        status="active"
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return SessionResponse(**session.to_dict())


@router.post("/end", response_model=SessionResponse)
async def end_work_session(
    request: EndSessionRequest = EndSessionRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """End the current active work session"""
    user_id = current_user.id if current_user else 1

    # Find active session
    result = await db.execute(
        select(WorkSession).where(
            and_(
                WorkSession.user_id == user_id,
                WorkSession.status == "active"
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="No active work session found")

    # Calculate durations
    now = datetime.utcnow()
    session.ended_at = now
    session.total_duration = int((now - session.started_at).total_seconds())
    session.notes = request.notes
    session.status = "completed"

    # Get screenshots taken during this session
    screenshot_result = await db.execute(
        select(Screenshot).where(
            and_(
                Screenshot.user_id == user_id,
                Screenshot.timestamp >= session.started_at,
                Screenshot.timestamp <= now,
                Screenshot.is_deleted == False
            )
        )
    )
    screenshots = screenshot_result.scalars().all()
    session.screenshot_count = len(screenshots)
    session.screenshot_ids = [s.id for s in screenshots]

    # Calculate activity metrics based on screenshots and activity
    if session.total_duration > 0:
        # Estimate active time based on screenshot frequency and app usage
        # Professional tools track keyboard/mouse activity - we use screenshots as proxy
        expected_screenshots = session.total_duration // 600  # One per ~10 min
        if expected_screenshots > 0:
            screenshot_rate = len(screenshots) / max(expected_screenshots, 1)
            session.activity_level = min(100, screenshot_rate * 100)
        else:
            session.activity_level = 100 if screenshots else 0

        # Active vs idle: If screenshots show activity, count as active
        session.active_duration = int(session.total_duration * (session.activity_level / 100))
        session.idle_duration = session.total_duration - session.active_duration - session.paused_duration

        # Calculate productivity from screenshots' app categories
        productive_screenshots = sum(
            1 for s in screenshots
            if s.category in ['development', 'productivity', 'design', 'writing']
        )
        session.productivity_score = (productive_screenshots / len(screenshots) * 100) if screenshots else 0

    await db.commit()
    await db.refresh(session)

    return SessionResponse(**session.to_dict())


@router.post("/pause")
async def pause_work_session(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Pause the current work session"""
    user_id = current_user.id if current_user else 1

    result = await db.execute(
        select(WorkSession).where(
            and_(
                WorkSession.user_id == user_id,
                WorkSession.status == "active"
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="No active work session found")

    session.status = "paused"
    await db.commit()

    return {"status": "paused", "session_id": session.id}


@router.post("/resume")
async def resume_work_session(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Resume a paused work session"""
    user_id = current_user.id if current_user else 1

    result = await db.execute(
        select(WorkSession).where(
            and_(
                WorkSession.user_id == user_id,
                WorkSession.status == "paused"
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="No paused work session found")

    session.status = "active"
    await db.commit()

    return {"status": "resumed", "session_id": session.id}


@router.get("/current", response_model=Optional[SessionResponse])
async def get_current_session(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get the current active/paused work session"""
    user_id = current_user.id if current_user else 1

    result = await db.execute(
        select(WorkSession).where(
            and_(
                WorkSession.user_id == user_id,
                WorkSession.status.in_(["active", "paused"])
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        return None

    # Update live duration
    if session.status == "active":
        session.total_duration = int((datetime.utcnow() - session.started_at).total_seconds())

    return SessionResponse(**session.to_dict())


@router.get("/", response_model=List[SessionResponse])
async def get_work_sessions(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    client_name: Optional[str] = Query(None),
    project_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get work sessions with filters"""
    user_id = current_user.id if current_user else 1

    query = select(WorkSession).where(
        WorkSession.user_id == user_id
    ).order_by(WorkSession.started_at.desc())

    if date_from:
        try:
            start = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.where(WorkSession.started_at >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format")

    if date_to:
        try:
            end = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.where(WorkSession.started_at < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format")

    if client_name:
        query = query.where(WorkSession.client_name.ilike(f"%{client_name}%"))

    if project_name:
        query = query.where(WorkSession.project_name.ilike(f"%{project_name}%"))

    if status:
        query = query.where(WorkSession.status == status)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    sessions = result.scalars().all()

    return [SessionResponse(**s.to_dict()) for s in sessions]


@router.get("/report/client", response_model=ClientReport)
async def get_client_report(
    client_name: Optional[str] = Query(None),
    project_name: Optional[str] = Query(None),
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Generate a client-facing report showing verified work time.
    This is what clients see to verify billable hours.
    """
    user_id = current_user.id if current_user else 1

    try:
        start = datetime.strptime(date_from, "%Y-%m-%d")
        end = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    query = select(WorkSession).where(
        and_(
            WorkSession.user_id == user_id,
            WorkSession.started_at >= start,
            WorkSession.started_at < end,
            WorkSession.status == "completed"
        )
    ).order_by(WorkSession.started_at.asc())

    if client_name:
        query = query.where(WorkSession.client_name.ilike(f"%{client_name}%"))

    if project_name:
        query = query.where(WorkSession.project_name.ilike(f"%{project_name}%"))

    result = await db.execute(query)
    sessions = result.scalars().all()

    # Calculate summary
    total_time = sum(s.total_duration for s in sessions)
    billable_time = sum(s.active_duration for s in sessions)
    idle_time = sum(s.idle_duration for s in sessions)
    paused_time = sum(s.paused_duration for s in sessions)
    screenshot_count = sum(s.screenshot_count for s in sessions)

    avg_activity = (
        sum(s.activity_level for s in sessions) / len(sessions)
        if sessions else 0
    )
    avg_productivity = (
        sum(s.productivity_score for s in sessions) / len(sessions)
        if sessions else 0
    )

    summary = SessionSummary(
        total_sessions=len(sessions),
        total_time=total_time,
        billable_time=billable_time,
        idle_time=idle_time,
        paused_time=paused_time,
        average_activity_level=round(avg_activity, 1),
        average_productivity=round(avg_productivity, 1),
        screenshot_count=screenshot_count,
    )

    return ClientReport(
        period_start=start,
        period_end=end - timedelta(days=1),
        client_name=client_name,
        project_name=project_name,
        summary=summary,
        sessions=[SessionResponse(**s.to_dict()) for s in sessions],
    )


@router.get("/report/summary")
async def get_sessions_summary(
    period: str = Query("week", description="today, week, month"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get work sessions summary for the specified period"""
    user_id = current_user.id if current_user else 1
    now = datetime.utcnow()

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - timedelta(days=7)

    result = await db.execute(
        select(WorkSession).where(
            and_(
                WorkSession.user_id == user_id,
                WorkSession.started_at >= start,
                WorkSession.status.in_(["completed", "active", "paused"])
            )
        )
    )
    sessions = result.scalars().all()

    # Calculate summary
    total_sessions = len(sessions)
    total_time = sum(s.total_duration for s in sessions)
    billable_time = sum(s.active_duration for s in sessions)
    total_screenshots = sum(s.screenshot_count for s in sessions)

    # Group by day
    days = {}
    for s in sessions:
        day = s.started_at.strftime("%Y-%m-%d")
        if day not in days:
            days[day] = {"sessions": 0, "total_time": 0, "billable_time": 0}
        days[day]["sessions"] += 1
        days[day]["total_time"] += s.total_duration
        days[day]["billable_time"] += s.active_duration

    # Group by client
    clients = {}
    for s in sessions:
        client = s.client_name or "No Client"
        if client not in clients:
            clients[client] = {"sessions": 0, "total_time": 0}
        clients[client]["sessions"] += 1
        clients[client]["total_time"] += s.total_duration

    return {
        "period": period,
        "period_start": start.isoformat(),
        "total_sessions": total_sessions,
        "total_time": total_time,
        "total_time_formatted": f"{total_time // 3600}h {(total_time % 3600) // 60}m",
        "billable_time": billable_time,
        "billable_time_formatted": f"{billable_time // 3600}h {(billable_time % 3600) // 60}m",
        "total_screenshots": total_screenshots,
        "by_day": days,
        "by_client": clients,
    }


@router.delete("/{session_id}")
async def delete_work_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Delete a work session"""
    user_id = current_user.id if current_user else 1

    result = await db.execute(
        select(WorkSession).where(
            and_(
                WorkSession.id == session_id,
                WorkSession.user_id == user_id
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Work session not found")

    await db.delete(session)
    await db.commit()

    return {"status": "deleted", "id": session_id}
