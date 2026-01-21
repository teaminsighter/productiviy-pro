"""
Team Deep Work API Routes

Endpoints for team-level deep work analytics, alerts, and scheduling.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.team import Team, TeamMember, TeamRole
from app.services.team_deepwork_service import TeamDeepWorkService

router = APIRouter(tags=["Team Deep Work"])


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class MeetingFreeZoneCreate(BaseModel):
    name: str = "Focus Time"
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    days_of_week: List[int] = [1, 2, 3, 4, 5]
    is_enforced: bool = False


class MeetingFreeZoneResponse(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    days_of_week: List[int]
    is_enforced: bool
    notification_enabled: bool
    is_active: bool


class AlertResponse(BaseModel):
    id: str
    type: str
    priority: str
    title: str
    message: str
    target_user_id: Optional[int]
    suggestion: Optional[str]
    is_read: bool
    created_at: str


class TeamDashboardResponse(BaseModel):
    summary: dict
    period_stats: dict
    daily_scores: List[dict]
    distributions: dict
    members: List[dict]
    alerts: List[dict]
    meeting_free_zones: List[dict]


class SchedulingSuggestionResponse(BaseModel):
    id: str
    suggestion_type: str
    suggested_start: str
    suggested_end: str
    day_of_week: Optional[int]
    reason: str
    impact_score: float
    availability_score: float


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

async def get_user_team(
    db: AsyncSession,
    user: User
) -> Optional[Team]:
    """Get the team the user belongs to (if any)"""
    result = await db.execute(
        select(Team).join(TeamMember).where(
            TeamMember.user_id == user.id
        )
    )
    return result.scalar_one_or_none()


async def require_team_admin(
    db: AsyncSession,
    user: User,
    team_id: int
) -> TeamMember:
    """Require user to be admin or owner of the team"""
    result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user.id
            )
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this team")

    if member.role not in [TeamRole.OWNER, TeamRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    return member


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/teams/{team_id}/deepwork/dashboard")
async def get_team_dashboard(
    team_id: int,
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive team deep work dashboard data"""
    # Verify access
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    return await service.get_team_dashboard_data(team_id, days)


@router.post("/teams/{team_id}/deepwork/calculate")
async def calculate_team_score(
    team_id: int,
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate/recalculate team deep work score for a date"""
    await require_team_admin(db, current_user, team_id)

    if date:
        target_date = datetime.fromisoformat(date)
    else:
        target_date = datetime.utcnow()

    service = TeamDeepWorkService(db)
    score = await service.calculate_team_score(team_id, target_date)

    return {
        "status": "calculated",
        "date": score.date.isoformat(),
        "avg_score": round(score.avg_deep_work_score, 1),
        "member_count": score.member_count,
    }


# ═══════════════════════════════════════════════════════════════════════════
# MEMBER INSIGHTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/teams/{team_id}/deepwork/members")
async def get_member_insights(
    team_id: int,
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get deep work metrics per team member"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    dashboard = await service.get_team_dashboard_data(team_id, days)

    return {
        "members": dashboard["members"],
        "period_days": days,
    }


@router.get("/teams/{team_id}/deepwork/members/{user_id}")
async def get_member_detail(
    team_id: int,
    user_id: int,
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed deep work metrics for a specific member"""
    await require_team_admin(db, current_user, team_id)

    # Verify the user is a member of the team
    member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id
            )
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Check if member shares activity
    if not member.share_activity:
        return {
            "user_id": user_id,
            "sharing_disabled": True,
            "message": "This member has disabled activity sharing"
        }

    # Get user info
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()

    # Get scores for the period
    from app.models import DeepWorkScore
    end_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = end_date - timedelta(days=days)

    from datetime import timedelta
    scores_result = await db.execute(
        select(DeepWorkScore).where(
            and_(
                DeepWorkScore.user_id == user_id,
                DeepWorkScore.date >= start_date
            )
        ).order_by(DeepWorkScore.date.desc())
    )
    scores = scores_result.scalars().all()

    if not scores:
        return {
            "user_id": user_id,
            "name": user.name if user else "Unknown",
            "no_data": True,
            "message": "No activity data for this period"
        }

    # Calculate averages
    avg_score = sum(s.deep_work_score for s in scores) / len(scores)
    avg_deep_work = sum(s.deep_work_minutes for s in scores) / len(scores)
    avg_meetings = sum(s.meeting_load_percent for s in scores) / len(scores)
    avg_fragmentation = sum(s.fragmentation_score for s in scores) / len(scores)

    return {
        "user_id": user_id,
        "name": user.name if user else "Unknown",
        "avatar_url": user.avatar_url if user else None,
        "role": member.role.value,
        "period_days": days,
        "summary": {
            "avg_score": round(avg_score, 1),
            "avg_deep_work_minutes": round(avg_deep_work),
            "avg_meeting_load": round(avg_meetings, 1),
            "avg_fragmentation": round(avg_fragmentation, 1),
        },
        "daily_scores": [
            {
                "date": s.date.isoformat(),
                "score": s.deep_work_score,
                "deep_work_minutes": s.deep_work_minutes,
                "meeting_minutes": s.total_meeting_minutes,
                "meeting_load": round(s.meeting_load_percent, 1),
                "fragmentation": s.fragmentation_score,
            }
            for s in reversed(scores)
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/teams/{team_id}/deepwork/alerts", response_model=List[AlertResponse])
async def get_alerts(
    team_id: int,
    include_read: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active alerts for the team"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    alerts = await service.get_active_alerts(team_id)

    return [
        AlertResponse(
            id=a.id,
            type=a.alert_type.value,
            priority=a.priority.value,
            title=a.title,
            message=a.message,
            target_user_id=a.target_user_id,
            suggestion=a.suggestion,
            is_read=a.is_read,
            created_at=a.created_at.isoformat(),
        )
        for a in alerts
    ]


@router.post("/teams/{team_id}/deepwork/alerts/generate")
async def generate_alerts(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate new alerts based on current metrics"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    alerts = await service.generate_alerts(team_id)

    return {
        "generated": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "type": a.alert_type.value,
                "title": a.title,
            }
            for a in alerts
        ]
    }


@router.post("/teams/{team_id}/deepwork/alerts/{alert_id}/dismiss")
async def dismiss_alert(
    team_id: int,
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dismiss an alert"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    success = await service.dismiss_alert(alert_id, team_id)

    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"status": "dismissed"}


@router.post("/teams/{team_id}/deepwork/alerts/{alert_id}/read")
async def mark_alert_read(
    team_id: int,
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an alert as read"""
    await require_team_admin(db, current_user, team_id)

    from app.models import TeamManagerAlert
    result = await db.execute(
        select(TeamManagerAlert).where(
            and_(
                TeamManagerAlert.id == alert_id,
                TeamManagerAlert.team_id == team_id
            )
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    await db.commit()

    return {"status": "read"}


# ═══════════════════════════════════════════════════════════════════════════
# MEETING-FREE ZONES
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/teams/{team_id}/deepwork/zones", response_model=List[MeetingFreeZoneResponse])
async def get_meeting_free_zones(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all meeting-free zones for the team"""
    # Any team member can view zones
    result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user.id
            )
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    service = TeamDeepWorkService(db)
    zones = await service.get_meeting_free_zones(team_id)

    return [
        MeetingFreeZoneResponse(
            id=z.id,
            name=z.name,
            start_time=z.start_time,
            end_time=z.end_time,
            days_of_week=z.days_of_week,
            is_enforced=z.is_enforced,
            notification_enabled=z.notification_enabled,
            is_active=z.is_active,
        )
        for z in zones
    ]


@router.post("/teams/{team_id}/deepwork/zones", response_model=MeetingFreeZoneResponse)
async def create_meeting_free_zone(
    team_id: int,
    request: MeetingFreeZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new meeting-free zone"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    zone = await service.create_meeting_free_zone(
        team_id=team_id,
        created_by=current_user.id,
        name=request.name,
        start_time=request.start_time,
        end_time=request.end_time,
        days_of_week=request.days_of_week,
        is_enforced=request.is_enforced,
    )

    return MeetingFreeZoneResponse(
        id=zone.id,
        name=zone.name,
        start_time=zone.start_time,
        end_time=zone.end_time,
        days_of_week=zone.days_of_week,
        is_enforced=zone.is_enforced,
        notification_enabled=zone.notification_enabled,
        is_active=zone.is_active,
    )


@router.delete("/teams/{team_id}/deepwork/zones/{zone_id}")
async def delete_meeting_free_zone(
    team_id: int,
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meeting-free zone"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    success = await service.delete_meeting_free_zone(zone_id, team_id)

    if not success:
        raise HTTPException(status_code=404, detail="Zone not found")

    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# SCHEDULING SUGGESTIONS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/teams/{team_id}/deepwork/suggestions", response_model=List[SchedulingSuggestionResponse])
async def get_scheduling_suggestions(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated scheduling suggestions"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    suggestions = await service.get_scheduling_suggestions(team_id)

    return [
        SchedulingSuggestionResponse(
            id=s.id,
            suggestion_type=s.suggestion_type,
            suggested_start=s.suggested_start.isoformat(),
            suggested_end=s.suggested_end.isoformat(),
            day_of_week=s.day_of_week,
            reason=s.reason,
            impact_score=s.impact_score,
            availability_score=s.availability_score,
        )
        for s in suggestions
    ]


@router.post("/teams/{team_id}/deepwork/suggestions/generate")
async def generate_suggestions(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate new scheduling suggestions"""
    await require_team_admin(db, current_user, team_id)

    service = TeamDeepWorkService(db)
    suggestions = await service.generate_scheduling_suggestions(team_id)

    return {
        "generated": len(suggestions),
        "suggestions": [
            {
                "id": s.id,
                "type": s.suggestion_type,
                "reason": s.reason,
            }
            for s in suggestions
        ]
    }


@router.post("/teams/{team_id}/deepwork/suggestions/{suggestion_id}/dismiss")
async def dismiss_suggestion(
    team_id: int,
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dismiss a scheduling suggestion"""
    await require_team_admin(db, current_user, team_id)

    from app.models import TeamSchedulingSuggestion
    result = await db.execute(
        select(TeamSchedulingSuggestion).where(
            and_(
                TeamSchedulingSuggestion.id == suggestion_id,
                TeamSchedulingSuggestion.team_id == team_id
            )
        )
    )
    suggestion = result.scalar_one_or_none()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    suggestion.is_dismissed = True
    await db.commit()

    return {"status": "dismissed"}
