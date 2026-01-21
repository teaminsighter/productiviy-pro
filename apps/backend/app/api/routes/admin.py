"""
Admin API Routes
Provides admin-only endpoints for user management, analytics, and system monitoring
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.core.rate_limiter import limiter, sensitive_rate_limit, api_rate_limit
from app.api.routes.auth import get_current_user
from app.models.user import User, PlanType
from app.models.team import Team, TeamMember
from app.models.activity import Activity
from app.models.screenshot import Screenshot

router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users_24h: int
    active_users_7d: int
    new_users_today: int
    new_users_week: int
    total_teams: int
    total_activities: int
    revenue_mtd: float
    user_growth_percent: float
    plan_distribution: dict


class UserListItem(BaseModel):
    id: int
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    plan: str
    is_active: bool
    is_verified: bool
    is_admin: bool
    subscription_status: Optional[str]
    created_at: datetime
    last_login_at: Optional[datetime]
    team_count: int


class UserDetailResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    plan: str
    is_active: bool
    is_verified: bool
    is_admin: bool
    auth_provider: str
    subscription_status: Optional[str]
    stripe_customer_id: Optional[str]
    trial_ends_at: Optional[datetime]
    created_at: datetime
    last_login_at: Optional[datetime]
    total_activities: int
    total_screenshots: int
    teams: List[dict]


class TeamListItem(BaseModel):
    id: int
    name: str
    owner_id: int
    owner_email: str
    member_count: int
    plan: str
    is_active: bool
    created_at: datetime


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    plan: Optional[str] = None


class ActivityLogItem(BaseModel):
    id: int
    user_id: int
    user_email: str
    app_name: str
    window_title: str
    duration: int
    timestamp: datetime


# ============================================================================
# Helper Functions
# ============================================================================

async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin access"""
    if not user.is_admin and not user.is_super_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency to require super admin access"""
    if not user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


# ============================================================================
# Dashboard Stats
# ============================================================================

@router.get("/stats", response_model=AdminStatsResponse)
@limiter.limit(api_rate_limit())
async def get_admin_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get admin dashboard statistics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    two_weeks_ago = now - timedelta(days=14)

    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # Active users (24h)
    active_24h_result = await db.execute(
        select(func.count(User.id)).where(
            User.last_login_at >= now - timedelta(hours=24)
        )
    )
    active_users_24h = active_24h_result.scalar() or 0

    # Active users (7d)
    active_7d_result = await db.execute(
        select(func.count(User.id)).where(User.last_login_at >= week_ago)
    )
    active_users_7d = active_7d_result.scalar() or 0

    # New users today
    new_today_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    new_users_today = new_today_result.scalar() or 0

    # New users this week
    new_week_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    new_users_week = new_week_result.scalar() or 0

    # New users last week (for growth calculation)
    new_last_week_result = await db.execute(
        select(func.count(User.id)).where(
            and_(User.created_at >= two_weeks_ago, User.created_at < week_ago)
        )
    )
    new_last_week = new_last_week_result.scalar() or 0

    # User growth percentage
    if new_last_week > 0:
        user_growth_percent = ((new_users_week - new_last_week) / new_last_week) * 100
    else:
        user_growth_percent = 100 if new_users_week > 0 else 0

    # Total teams
    total_teams_result = await db.execute(select(func.count(Team.id)))
    total_teams = total_teams_result.scalar() or 0

    # Total activities
    total_activities_result = await db.execute(select(func.count(Activity.id)))
    total_activities = total_activities_result.scalar() or 0

    # Plan distribution
    plan_dist_result = await db.execute(
        select(User.plan, func.count(User.id)).group_by(User.plan)
    )
    plan_distribution = {}
    for plan, count in plan_dist_result.all():
        plan_distribution[plan.value if hasattr(plan, 'value') else str(plan)] = count

    # Revenue MTD (count of paying users * avg price - simplified)
    paying_users_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.subscription_status == "active",
                User.plan != PlanType.FREE,
            )
        )
    )
    paying_users = paying_users_result.scalar() or 0
    # Estimate $9.99 avg per user
    revenue_mtd = paying_users * 9.99

    return AdminStatsResponse(
        total_users=total_users,
        active_users_24h=active_users_24h,
        active_users_7d=active_users_7d,
        new_users_today=new_users_today,
        new_users_week=new_users_week,
        total_teams=total_teams,
        total_activities=total_activities,
        revenue_mtd=round(revenue_mtd, 2),
        user_growth_percent=round(user_growth_percent, 1),
        plan_distribution=plan_distribution,
    )


@router.get("/stats/chart-data")
@limiter.limit(api_rate_limit())
async def get_chart_data(
    request: Request,
    days: int = Query(default=30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get chart data for admin dashboard"""
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    # User signups per day
    user_signups = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        result = await db.execute(
            select(func.count(User.id)).where(
                and_(User.created_at >= day_start, User.created_at < day_end)
            )
        )
        count = result.scalar() or 0
        user_signups.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count,
        })

    # Active users per day
    active_users = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        result = await db.execute(
            select(func.count(User.id)).where(
                and_(User.last_login_at >= day_start, User.last_login_at < day_end)
            )
        )
        count = result.scalar() or 0
        active_users.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count,
        })

    return {
        "user_signups": user_signups,
        "active_users": active_users,
    }


# ============================================================================
# User Management
# ============================================================================

@router.get("/users")
@limiter.limit(api_rate_limit())
async def list_users(
    request: Request,
    search: Optional[str] = None,
    plan: Optional[str] = None,
    status: Optional[str] = None,  # active, inactive, all
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all users with filtering and pagination"""
    query = select(User)

    # Apply filters
    if search:
        query = query.where(
            (User.email.ilike(f"%{search}%")) | (User.name.ilike(f"%{search}%"))
        )

    if plan:
        try:
            plan_enum = PlanType(plan)
            query = query.where(User.plan == plan_enum)
        except ValueError:
            pass

    if status == "active":
        query = query.where(User.is_active == True)
    elif status == "inactive":
        query = query.where(User.is_active == False)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    # Apply pagination
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    # Format response
    user_list = []
    for user in users:
        # Get team count
        team_count_result = await db.execute(
            select(func.count(TeamMember.id)).where(TeamMember.user_id == user.id)
        )
        team_count = team_count_result.scalar() or 0

        user_list.append({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "plan": user.plan.value if hasattr(user.plan, 'value') else str(user.plan),
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "is_admin": user.is_admin,
            "subscription_status": user.subscription_status,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "team_count": team_count,
        })

    return {
        "users": user_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/users/{user_id}")
@limiter.limit(api_rate_limit())
async def get_user_detail(
    request: Request,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get detailed user information"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get activity count
    activity_count_result = await db.execute(
        select(func.count(Activity.id)).where(Activity.user_id == user_id)
    )
    total_activities = activity_count_result.scalar() or 0

    # Get screenshot count
    screenshot_count_result = await db.execute(
        select(func.count(Screenshot.id)).where(
            and_(
                Screenshot.user_id == user_id,
                Screenshot.is_deleted == False
            )
        )
    )
    total_screenshots = screenshot_count_result.scalar() or 0

    # Get teams
    teams_result = await db.execute(
        select(Team, TeamMember.role)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == user_id)
    )
    teams = [
        {
            "id": team.id,
            "name": team.name,
            "role": role,
        }
        for team, role in teams_result.all()
    ]

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "plan": user.plan.value if hasattr(user.plan, 'value') else str(user.plan),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_admin": user.is_admin,
        "auth_provider": user.auth_provider,
        "subscription_status": user.subscription_status,
        "stripe_customer_id": user.stripe_customer_id,
        "trial_ends_at": user.trial_ends_at.isoformat() if user.trial_ends_at else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "total_activities": total_activities,
        "total_screenshots": total_screenshots,
        "teams": teams,
    }


@router.put("/users/{user_id}")
@limiter.limit(sensitive_rate_limit())
async def update_user(
    request: Request,
    user_id: int,
    update_request: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update user properties (admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent modifying super admins unless you're a super admin
    if user.is_super_admin and not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot modify super admin users")

    if update_request.is_active is not None:
        user.is_active = update_request.is_active

    if update_request.is_admin is not None:
        # Only super admins can grant/revoke admin access
        if not admin.is_super_admin:
            raise HTTPException(status_code=403, detail="Only super admins can modify admin status")
        user.is_admin = update_request.is_admin

    if update_request.plan is not None:
        try:
            user.plan = PlanType(update_request.plan)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {update_request.plan}")

    await db.commit()
    await db.refresh(user)

    return {"message": "User updated successfully", "user_id": user_id}


@router.delete("/users/{user_id}")
@limiter.limit(sensitive_rate_limit())
async def delete_user(
    request: Request,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    """Delete a user (super admin only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot delete super admin users")

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


# ============================================================================
# Team Management
# ============================================================================

@router.get("/teams")
@limiter.limit(api_rate_limit())
async def list_teams(
    request: Request,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all teams with pagination"""
    query = select(Team)

    if search:
        query = query.where(Team.name.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.order_by(desc(Team.created_at)).offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    teams = result.scalars().all()

    team_list = []
    for team in teams:
        # Get owner
        owner_result = await db.execute(select(User).where(User.id == team.owner_id))
        owner = owner_result.scalar_one_or_none()

        # Get member count
        member_count_result = await db.execute(
            select(func.count(TeamMember.id)).where(TeamMember.team_id == team.id)
        )
        member_count = member_count_result.scalar() or 0

        team_list.append({
            "id": team.id,
            "name": team.name,
            "owner_id": team.owner_id,
            "owner_email": owner.email if owner else "Unknown",
            "member_count": member_count,
            "plan": team.plan if hasattr(team, 'plan') else "team",
            "is_active": team.is_active if hasattr(team, 'is_active') else True,
            "created_at": team.created_at.isoformat() if team.created_at else None,
        })

    return {
        "teams": team_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/teams/{team_id}")
@limiter.limit(api_rate_limit())
async def get_team_detail(
    request: Request,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get detailed team information"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get owner
    owner_result = await db.execute(select(User).where(User.id == team.owner_id))
    owner = owner_result.scalar_one_or_none()

    # Get members
    members_result = await db.execute(
        select(User, TeamMember.role, TeamMember.joined_at)
        .join(TeamMember, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team_id)
    )
    members = [
        {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "role": role,
            "joined_at": joined_at.isoformat() if joined_at else None,
        }
        for user, role, joined_at in members_result.all()
    ]

    return {
        "id": team.id,
        "name": team.name,
        "description": team.description if hasattr(team, 'description') else None,
        "owner": {
            "id": owner.id if owner else None,
            "email": owner.email if owner else "Unknown",
            "name": owner.name if owner else None,
        },
        "members": members,
        "member_count": len(members),
        "created_at": team.created_at.isoformat() if team.created_at else None,
    }


# ============================================================================
# Activity Logs
# ============================================================================

@router.get("/activity-logs")
@limiter.limit(api_rate_limit())
async def get_activity_logs(
    request: Request,
    user_id: Optional[int] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get recent activity logs (for monitoring)"""
    query = (
        select(Activity, User.email)
        .join(User, User.id == Activity.user_id)
        .order_by(desc(Activity.timestamp))
        .limit(limit)
    )

    if user_id:
        query = query.where(Activity.user_id == user_id)

    result = await db.execute(query)
    activities = result.all()

    return {
        "activities": [
            {
                "id": activity.id,
                "user_id": activity.user_id,
                "user_email": email,
                "app_name": activity.app_name,
                "window_title": activity.window_title[:100] if activity.window_title else None,
                "duration": activity.duration,
                "timestamp": activity.timestamp.isoformat() if activity.timestamp else None,
            }
            for activity, email in activities
        ]
    }


# ============================================================================
# Online Users
# ============================================================================

@router.get("/online-users")
@limiter.limit(api_rate_limit())
async def get_online_users(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get currently online users (active in last 5 minutes)"""
    threshold = datetime.utcnow() - timedelta(minutes=5)

    result = await db.execute(
        select(User)
        .where(User.last_login_at >= threshold)
        .order_by(desc(User.last_login_at))
    )
    users = result.scalars().all()

    return {
        "online_count": len(users),
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "last_active": user.last_login_at.isoformat() if user.last_login_at else None,
            }
            for user in users
        ],
    }
