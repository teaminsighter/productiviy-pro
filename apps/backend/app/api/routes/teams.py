from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import secrets

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.team import Team, TeamMember, TeamInvite, TeamRole
from app.models.activity import Activity
from app.models.screenshot import Screenshot

router = APIRouter()


# Pydantic Models
class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TeamInviteCreate(BaseModel):
    email: EmailStr
    role: str = "member"


class TeamMemberUpdate(BaseModel):
    role: Optional[str] = None
    share_activity: Optional[bool] = None
    share_screenshots: Optional[bool] = None
    share_urls: Optional[bool] = None


class TeamResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    member_count: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TeamMemberResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    avatar_url: Optional[str]
    role: str
    joined_at: datetime
    share_activity: bool
    share_screenshots: bool
    share_urls: bool
    today_time: Optional[float] = None
    today_productivity: Optional[float] = None


# Helper Functions
def generate_slug(name: str) -> str:
    slug = name.lower().replace(" ", "-")
    return f"{slug}-{secrets.token_hex(4)}"


def generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


# Team CRUD
@router.post("", response_model=TeamResponse)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new team"""
    # Check if user already owns a team
    existing = await db.execute(
        select(Team).where(Team.owner_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "You already own a team")

    team = Team(
        name=team_data.name,
        slug=generate_slug(team_data.name),
        description=team_data.description,
        owner_id=current_user.id
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)

    # Add owner as member
    owner_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=TeamRole.OWNER
    )
    db.add(owner_member)
    await db.commit()

    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        description=team.description,
        member_count=1,
        owner_id=team.owner_id,
        created_at=team.created_at
    )


@router.get("", response_model=List[TeamResponse])
async def get_my_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all teams user is a member of"""
    result = await db.execute(
        select(Team, func.count(TeamMember.id).label('member_count'))
        .join(TeamMember, Team.id == TeamMember.team_id)
        .where(TeamMember.user_id == current_user.id)
        .group_by(Team.id)
    )

    teams = []
    for row in result.all():
        team = row[0]
        count = row[1]
        teams.append(TeamResponse(
            id=team.id,
            name=team.name,
            slug=team.slug,
            description=team.description,
            member_count=count,
            owner_id=team.owner_id,
            created_at=team.created_at
        ))

    return teams


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get team details"""
    # Verify membership
    member = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(403, "Not a team member")

    result = await db.execute(
        select(Team, func.count(TeamMember.id))
        .join(TeamMember)
        .where(Team.id == team_id)
        .group_by(Team.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(404, "Team not found")

    team, count = row
    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        description=team.description,
        member_count=count,
        owner_id=team.owner_id,
        created_at=team.created_at
    )


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update team (admin only)"""
    # Verify admin role
    member = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.role.in_([TeamRole.OWNER, TeamRole.ADMIN])
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(403, "Admin access required")

    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")

    if team_data.name:
        team.name = team_data.name
    if team_data.description is not None:
        team.description = team_data.description

    await db.commit()
    await db.refresh(team)

    return await get_team(team_id, current_user, db)


@router.delete("/{team_id}")
async def delete_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete team (owner only)"""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(404, "Team not found")
    if team.owner_id != current_user.id:
        raise HTTPException(403, "Only owner can delete team")

    # Delete members and invites
    await db.execute(delete(TeamMember).where(TeamMember.team_id == team_id))
    await db.execute(delete(TeamInvite).where(TeamInvite.team_id == team_id))
    await db.delete(team)
    await db.commit()

    return {"message": "Team deleted"}


# Member Management
@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get team members"""
    # Verify membership
    member_check = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(403, "Not a team member")

    result = await db.execute(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team_id)
    )

    members = []
    for row in result.all():
        tm = row[0]
        user = row[1]
        members.append(TeamMemberResponse(
            id=tm.id,
            user_id=user.id,
            name=user.name or user.email.split('@')[0],
            email=user.email,
            avatar_url=user.avatar_url,
            role=tm.role.value,
            joined_at=tm.joined_at,
            share_activity=tm.share_activity,
            share_screenshots=tm.share_screenshots,
            share_urls=tm.share_urls
        ))

    return members


@router.put("/{team_id}/members/{user_id}")
async def update_team_member(
    team_id: int,
    user_id: int,
    member_data: TeamMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update member settings (admin or self)"""
    # Get current user's membership
    current_member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id
        )
    )
    current_member = current_member_result.scalar_one_or_none()
    if not current_member:
        raise HTTPException(403, "Not a team member")

    # Get target member
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id
        )
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(404, "Member not found")

    # Check permissions
    is_admin = current_member.role in [TeamRole.OWNER, TeamRole.ADMIN]
    is_self = user_id == current_user.id

    if member_data.role and not is_admin:
        raise HTTPException(403, "Admin access required to change roles")

    if not is_admin and not is_self:
        raise HTTPException(403, "Can only update your own settings")

    # Update fields
    if member_data.role and is_admin:
        target_member.role = TeamRole(member_data.role)
    if member_data.share_activity is not None:
        target_member.share_activity = member_data.share_activity
    if member_data.share_screenshots is not None:
        target_member.share_screenshots = member_data.share_screenshots
    if member_data.share_urls is not None:
        target_member.share_urls = member_data.share_urls

    await db.commit()
    return {"message": "Member updated"}


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove member from team"""
    # Get current user's membership
    current_member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id
        )
    )
    current_member = current_member_result.scalar_one_or_none()
    if not current_member:
        raise HTTPException(403, "Not a team member")

    is_admin = current_member.role in [TeamRole.OWNER, TeamRole.ADMIN]
    is_self = user_id == current_user.id

    if not is_admin and not is_self:
        raise HTTPException(403, "Admin access required")

    # Can't remove owner
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team.owner_id == user_id:
        raise HTTPException(400, "Cannot remove team owner")

    # Remove member
    await db.execute(
        delete(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id
        )
    )
    await db.commit()

    return {"message": "Member removed"}


# Invitations
@router.post("/{team_id}/invites")
async def invite_member(
    team_id: int,
    invite_data: TeamInviteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Invite a new member"""
    # Verify admin role
    member = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.role.in_([TeamRole.OWNER, TeamRole.ADMIN])
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(403, "Admin access required")

    # Check if already invited or member
    existing_user = await db.execute(
        select(User).where(User.email == invite_data.email)
    )
    existing_user = existing_user.scalar_one_or_none()

    if existing_user:
        existing_member = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == existing_user.id
            )
        )
        if existing_member.scalar_one_or_none():
            raise HTTPException(400, "User is already a team member")

    # Create invite
    invite = TeamInvite(
        team_id=team_id,
        email=invite_data.email,
        role=TeamRole(invite_data.role),
        token=generate_invite_token(),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invite)
    await db.commit()

    invite_url = f"http://localhost:1420/invite/{invite.token}"

    return {
        "message": f"Invitation sent to {invite_data.email}",
        "invite_url": invite_url
    }


@router.get("/{team_id}/invites")
async def get_pending_invites(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get pending invitations"""
    # Verify admin role
    member = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.role.in_([TeamRole.OWNER, TeamRole.ADMIN])
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(403, "Admin access required")

    result = await db.execute(
        select(TeamInvite).where(
            TeamInvite.team_id == team_id,
            TeamInvite.accepted == False,
            TeamInvite.expires_at > datetime.utcnow()
        )
    )

    invites = []
    for invite in result.scalars().all():
        invites.append({
            "id": invite.id,
            "email": invite.email,
            "role": invite.role.value,
            "created_at": invite.created_at,
            "expires_at": invite.expires_at
        })

    return invites


@router.delete("/{team_id}/invites/{invite_id}")
async def cancel_invite(
    team_id: int,
    invite_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an invitation"""
    # Verify admin role
    member = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.role.in_([TeamRole.OWNER, TeamRole.ADMIN])
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(403, "Admin access required")

    await db.execute(delete(TeamInvite).where(TeamInvite.id == invite_id))
    await db.commit()

    return {"message": "Invite canceled"}


# Accept Invitation (public endpoint)
@router.post("/join/{token}")
async def accept_invite(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept team invitation"""
    result = await db.execute(
        select(TeamInvite).where(
            TeamInvite.token == token,
            TeamInvite.accepted == False,
            TeamInvite.expires_at > datetime.utcnow()
        )
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(400, "Invalid or expired invitation")

    if invite.email != current_user.email:
        raise HTTPException(400, "Invitation is for a different email")

    # Check if already a member
    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == invite.team_id,
            TeamMember.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Already a team member")

    # Add as member
    member = TeamMember(
        team_id=invite.team_id,
        user_id=current_user.id,
        role=invite.role
    )
    db.add(member)

    # Mark invite as accepted
    invite.accepted = True
    await db.commit()

    return {"message": "You have joined the team"}


# Team Analytics (Admin)
@router.get("/{team_id}/analytics")
async def get_team_analytics(
    team_id: int,
    date: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get team analytics (admin only)"""
    # Verify admin role
    member = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.role.in_([TeamRole.OWNER, TeamRole.ADMIN])
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(403, "Admin access required")

    # Get all members who share activity
    members_result = await db.execute(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(
            TeamMember.team_id == team_id,
            TeamMember.share_activity == True
        )
    )

    team_stats = {
        "total_members": 0,
        "active_today": 0,
        "total_productive_time": 0,
        "avg_productivity": 0,
        "members": []
    }

    for row in members_result.all():
        tm = row[0]
        user = row[1]
        team_stats["total_members"] += 1
        team_stats["members"].append({
            "user_id": user.id,
            "name": user.name or user.email.split('@')[0],
            "avatar_url": user.avatar_url,
            "today_time": 0,
            "productivity": 0,
            "status": "active"
        })

    return team_stats


# Team Member Data Access Endpoints
async def _verify_admin_and_get_member(
    team_id: int,
    target_user_id: int,
    current_user: User,
    db: AsyncSession,
    require_share_activity: bool = False,
    require_share_screenshots: bool = False
) -> tuple[TeamMember, TeamMember]:
    """
    Verify requester is admin/owner and target is team member.
    Returns (current_member, target_member) tuple.
    """
    # Verify requester is admin
    current_member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.role.in_([TeamRole.OWNER, TeamRole.ADMIN])
        )
    )
    current_member = current_member_result.scalar_one_or_none()
    if not current_member:
        raise HTTPException(403, "Admin access required")

    # Get target member
    target_member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == target_user_id
        )
    )
    target_member = target_member_result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(404, "Member not found in this team")

    # Check privacy settings
    if require_share_activity and not target_member.share_activity:
        raise HTTPException(403, "Member has not enabled activity sharing")
    if require_share_screenshots and not target_member.share_screenshots:
        raise HTTPException(403, "Member has not enabled screenshot sharing")

    return current_member, target_member


@router.get("/{team_id}/members/{user_id}/activities")
async def get_member_activities(
    team_id: int,
    user_id: int,
    date: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get team member's activity data (admin only, respects privacy settings)
    """
    await _verify_admin_and_get_member(
        team_id, user_id, current_user, db,
        require_share_activity=True
    )

    # Parse date filter
    if date:
        try:
            filter_date = datetime.fromisoformat(date)
            start_time = filter_date.replace(hour=0, minute=0, second=0)
            end_time = filter_date.replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    else:
        # Default to today
        start_time = datetime.now().replace(hour=0, minute=0, second=0)
        end_time = datetime.now()

    # Query activities for this user
    result = await db.execute(
        select(Activity)
        .where(
            Activity.user_id == user_id,
            Activity.start_time >= start_time,
            Activity.start_time <= end_time
        )
        .order_by(Activity.start_time.desc())
        .limit(limit)
    )

    activities = []
    total_duration = 0
    productive_duration = 0

    for activity in result.scalars().all():
        activities.append({
            "id": activity.id,
            "app_name": activity.app_name,
            "window_title": activity.window_title,
            "category": activity.category,
            "duration": activity.duration,
            "productivity_score": activity.productivity_score,
            "is_productive": activity.is_productive,
            "start_time": activity.start_time.isoformat() if activity.start_time else None,
            "end_time": activity.end_time.isoformat() if activity.end_time else None,
        })
        total_duration += activity.duration or 0
        if activity.is_productive:
            productive_duration += activity.duration or 0

    return {
        "user_id": user_id,
        "date": date or datetime.now().date().isoformat(),
        "activities": activities,
        "summary": {
            "total_duration": total_duration,
            "productive_duration": productive_duration,
            "productivity_percentage": round((productive_duration / total_duration * 100) if total_duration > 0 else 0, 1)
        }
    }


@router.get("/{team_id}/members/{user_id}/screenshots")
async def get_member_screenshots(
    team_id: int,
    user_id: int,
    date: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get team member's screenshots (admin only, respects privacy settings)
    """
    await _verify_admin_and_get_member(
        team_id, user_id, current_user, db,
        require_share_screenshots=True
    )

    # Parse date filter
    if date:
        try:
            filter_date = datetime.fromisoformat(date)
            start_time = filter_date.replace(hour=0, minute=0, second=0)
            end_time = filter_date.replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    else:
        # Default to today
        start_time = datetime.now().replace(hour=0, minute=0, second=0)
        end_time = datetime.now()

    # Query screenshots for this user
    result = await db.execute(
        select(Screenshot)
        .where(
            Screenshot.user_id == user_id,
            Screenshot.timestamp >= start_time,
            Screenshot.timestamp <= end_time,
            Screenshot.is_deleted == False
        )
        .order_by(Screenshot.timestamp.desc())
        .limit(limit)
    )

    screenshots = []
    for screenshot in result.scalars().all():
        # Prefer cloud URLs, fall back to local paths
        image_url = screenshot.storage_url or screenshot.image_path
        thumbnail_url = screenshot.thumbnail_url or screenshot.thumbnail_path

        screenshots.append({
            "id": screenshot.id,
            "timestamp": screenshot.timestamp.isoformat() if screenshot.timestamp else None,
            "image_url": image_url,
            "thumbnail_url": thumbnail_url,
            "app_name": screenshot.app_name,
            "window_title": screenshot.window_title,
            "category": screenshot.category,
            "is_blurred": screenshot.is_blurred,
        })

    return {
        "user_id": user_id,
        "date": date or datetime.now().date().isoformat(),
        "screenshots": screenshots,
        "count": len(screenshots)
    }


@router.get("/{team_id}/members/{user_id}/summary")
async def get_member_summary(
    team_id: int,
    user_id: int,
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get team member's productivity summary for recent days (admin only)
    """
    await _verify_admin_and_get_member(
        team_id, user_id, current_user, db,
        require_share_activity=True
    )

    start_date = datetime.now() - timedelta(days=days)

    # Get activity summary
    result = await db.execute(
        select(
            func.sum(Activity.duration).label('total_duration'),
            func.sum(
                func.case(
                    (Activity.is_productive == True, Activity.duration),
                    else_=0
                )
            ).label('productive_duration'),
            func.count(Activity.id).label('activity_count')
        )
        .where(
            Activity.user_id == user_id,
            Activity.start_time >= start_date
        )
    )
    row = result.first()

    total_duration = row.total_duration or 0
    productive_duration = row.productive_duration or 0

    # Get daily breakdown
    daily_result = await db.execute(
        select(
            func.date(Activity.start_time).label('date'),
            func.sum(Activity.duration).label('duration'),
            func.sum(
                func.case(
                    (Activity.is_productive == True, Activity.duration),
                    else_=0
                )
            ).label('productive')
        )
        .where(
            Activity.user_id == user_id,
            Activity.start_time >= start_date
        )
        .group_by(func.date(Activity.start_time))
        .order_by(func.date(Activity.start_time))
    )

    daily_data = []
    for day_row in daily_result.all():
        day_total = day_row.duration or 0
        day_productive = day_row.productive or 0
        daily_data.append({
            "date": str(day_row.date),
            "total_hours": round(day_total / 3600, 2),
            "productive_hours": round(day_productive / 3600, 2),
            "productivity_percentage": round((day_productive / day_total * 100) if day_total > 0 else 0, 1)
        })

    return {
        "user_id": user_id,
        "period_days": days,
        "summary": {
            "total_hours": round(total_duration / 3600, 2),
            "productive_hours": round(productive_duration / 3600, 2),
            "avg_daily_hours": round(total_duration / 3600 / days, 2),
            "productivity_percentage": round((productive_duration / total_duration * 100) if total_duration > 0 else 0, 1)
        },
        "daily_breakdown": daily_data
    }
