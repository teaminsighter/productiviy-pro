from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, and_, or_, case
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime, timedelta, time
import secrets

from app.core.validators import (
    sanitize_string, check_xss, validate_time_string,
    MAX_SHORT_TEXT, MAX_MEDIUM_TEXT
)

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.team import Team, TeamMember, TeamInvite, TeamRole, TeamPermission
from app.models.activity import Activity
from app.models.screenshot import Screenshot
from app.services.email_service import email_service

router = APIRouter()


# ============================================================================
# Pydantic Models
# ============================================================================

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = sanitize_string(v, MAX_SHORT_TEXT)
        if len(v) < 2:
            raise ValueError("Team name must be at least 2 characters")
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = sanitize_string(v, MAX_MEDIUM_TEXT)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = sanitize_string(v, MAX_SHORT_TEXT)
        if len(v) < 2:
            raise ValueError("Team name must be at least 2 characters")
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = sanitize_string(v, MAX_MEDIUM_TEXT)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v


class TeamInviteCreate(BaseModel):
    email: EmailStr
    role: str = Field(default="member", pattern=r"^(owner|admin|member)$")

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid_roles = ["owner", "admin", "member"]
        if v.lower() not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v.lower()


class TeamMemberUpdate(BaseModel):
    role: Optional[str] = Field(None, pattern=r"^(owner|admin|member)$")
    share_activity: Optional[bool] = None
    share_screenshots: Optional[bool] = None
    share_urls: Optional[bool] = None
    blur_screenshots: Optional[bool] = None
    hide_window_titles: Optional[bool] = None
    working_hours_only: Optional[bool] = None
    work_start_time: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    work_end_time: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_roles = ["owner", "admin", "member"]
        if v.lower() not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v.lower()

    @field_validator('work_start_time', 'work_end_time')
    @classmethod
    def validate_work_times(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        is_valid, error = validate_time_string(v)
        if not is_valid:
            raise ValueError(error)
        return v


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
    blur_screenshots: bool = False
    hide_window_titles: bool = False
    working_hours_only: bool = True
    today_time: Optional[float] = None
    today_productivity: Optional[float] = None
    status: Optional[str] = None  # active, idle, offline
    current_app: Optional[str] = None


class PermissionCreate(BaseModel):
    grantee_id: int
    target_user_ids: Optional[List[int]] = None  # None = all members
    can_view_activity: bool = False
    can_view_screenshots: bool = False
    can_view_urls: bool = False
    can_view_analytics: bool = False
    can_export_data: bool = False
    expires_at: Optional[datetime] = None


class PermissionUpdate(BaseModel):
    can_view_activity: Optional[bool] = None
    can_view_screenshots: Optional[bool] = None
    can_view_urls: Optional[bool] = None
    can_view_analytics: Optional[bool] = None
    can_export_data: Optional[bool] = None
    expires_at: Optional[datetime] = None


class PermissionResponse(BaseModel):
    id: int
    grantee_id: int
    grantee_name: str
    grantee_email: str
    target_user_id: Optional[int]
    target_user_name: Optional[str]
    can_view_activity: bool
    can_view_screenshots: bool
    can_view_urls: bool
    can_view_analytics: bool
    can_export_data: bool
    created_at: datetime
    expires_at: Optional[datetime]


# ============================================================================
# Helper Functions
# ============================================================================

def generate_slug(name: str) -> str:
    slug = name.lower().replace(" ", "-")
    return f"{slug}-{secrets.token_hex(4)}"


def generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


async def get_user_role_in_team(db: AsyncSession, team_id: int, user_id: int) -> Optional[TeamRole]:
    """Get user's role in a team, or None if not a member."""
    result = await db.execute(
        select(TeamMember.role).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id
        )
    )
    role = result.scalar_one_or_none()
    return role


async def is_team_owner(db: AsyncSession, team_id: int, user_id: int) -> bool:
    """Check if user is the team owner."""
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.owner_id == user_id)
    )
    return result.scalar_one_or_none() is not None


async def check_view_permission(
    db: AsyncSession,
    team_id: int,
    requester_id: int,
    target_user_id: int,
    permission_type: str  # 'activity', 'screenshots', 'urls', 'analytics'
) -> bool:
    """
    Check if requester can view target's data.
    Returns True if:
    - Requester is Owner (always has access)
    - Requester is viewing their own data
    - Requester is Admin with granted permission for this target
    """
    # Self-view is always allowed
    if requester_id == target_user_id:
        return True

    # Check if owner
    if await is_team_owner(db, team_id, requester_id):
        return True

    # Check if admin with permission
    role = await get_user_role_in_team(db, team_id, requester_id)
    if role != TeamRole.ADMIN:
        return False

    # Check for granted permission
    perm_column = {
        'activity': TeamPermission.can_view_activity,
        'screenshots': TeamPermission.can_view_screenshots,
        'urls': TeamPermission.can_view_urls,
        'analytics': TeamPermission.can_view_analytics,
        'export': TeamPermission.can_export_data,
    }.get(permission_type)

    if not perm_column:
        return False

    result = await db.execute(
        select(TeamPermission).where(
            TeamPermission.team_id == team_id,
            TeamPermission.grantee_id == requester_id,
            or_(
                TeamPermission.target_user_id == None,  # All members
                TeamPermission.target_user_id == target_user_id
            ),
            perm_column == True,
            or_(
                TeamPermission.expires_at == None,
                TeamPermission.expires_at > datetime.utcnow()
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def get_member_with_stats(
    db: AsyncSession,
    team_member: TeamMember,
    user: User,
    include_today_stats: bool = True
) -> dict:
    """Get member data with optional today's stats."""
    data = {
        "id": team_member.id,
        "user_id": user.id,
        "name": user.name or user.email.split('@')[0],
        "email": user.email,
        "avatar_url": user.avatar_url,
        "role": team_member.role.value,
        "joined_at": team_member.joined_at,
        "share_activity": team_member.share_activity,
        "share_screenshots": team_member.share_screenshots,
        "share_urls": team_member.share_urls,
        "blur_screenshots": team_member.blur_screenshots,
        "hide_window_titles": team_member.hide_window_titles,
        "working_hours_only": team_member.working_hours_only,
        "today_time": None,
        "today_productivity": None,
        "status": "offline",
        "current_app": None,
    }

    if include_today_stats and team_member.share_activity:
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Get today's activity stats
        result = await db.execute(
            select(
                func.sum(Activity.duration).label('total'),
                func.sum(case((Activity.is_productive == True, Activity.duration), else_=0)).label('productive')
            ).where(
                Activity.user_id == user.id,
                Activity.start_time >= today_start
            )
        )
        row = result.first()
        if row and row.total:
            data["today_time"] = round(row.total / 3600, 2)  # Hours
            data["today_productivity"] = round((row.productive / row.total * 100) if row.total > 0 else 0, 1)

        # Get current/last activity for status
        last_activity = await db.execute(
            select(Activity).where(
                Activity.user_id == user.id
            ).order_by(Activity.start_time.desc()).limit(1)
        )
        last = last_activity.scalar_one_or_none()
        if last:
            time_since = (datetime.utcnow() - last.start_time).total_seconds() if last.start_time else 9999
            if time_since < 300:  # Active in last 5 minutes
                data["status"] = "active"
                data["current_app"] = last.app_name
            elif time_since < 900:  # Active in last 15 minutes
                data["status"] = "idle"
            else:
                data["status"] = "offline"

    return data


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
    # Get team
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")

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
        expires_at=datetime.utcnow() + timedelta(days=7),
        invited_by=current_user.id
    )
    db.add(invite)
    await db.commit()

    invite_url = f"http://localhost:1420/invite/{invite.token}"

    # Send invitation email
    inviter_name = current_user.name or current_user.email.split('@')[0]
    await email_service.send_team_invite(
        to=invite_data.email,
        team_name=team.name,
        inviter_name=inviter_name,
        invite_token=invite.token,
        role=invite_data.role
    )

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


# ============================================================================
# Real-Time Dashboard Endpoint
# ============================================================================

@router.get("/{team_id}/dashboard")
async def get_team_dashboard(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time team dashboard with live stats.
    Owner sees all data, Admin sees based on permissions.
    """
    # Verify membership
    role = await get_user_role_in_team(db, team_id, current_user.id)
    if not role:
        raise HTTPException(403, "Not a team member")

    is_owner = await is_team_owner(db, team_id, current_user.id)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Get all members
    result = await db.execute(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team_id)
    )

    members_data = []
    total_hours = 0
    total_productive = 0
    active_count = 0
    app_usage = {}

    for row in result.all():
        tm, user = row

        # Check if current user can view this member's data
        can_view = is_owner or await check_view_permission(
            db, team_id, current_user.id, user.id, 'activity'
        )

        member_info = await get_member_with_stats(db, tm, user, include_today_stats=can_view and tm.share_activity)

        # Add permission indicator
        member_info["can_view_details"] = can_view and tm.share_activity

        if member_info["status"] in ["active", "idle"]:
            active_count += 1

        if can_view and tm.share_activity and member_info["today_time"]:
            total_hours += member_info["today_time"]
            if member_info["today_productivity"]:
                total_productive += member_info["today_time"] * (member_info["today_productivity"] / 100)

            # Track app usage
            if member_info["current_app"]:
                app_usage[member_info["current_app"]] = app_usage.get(member_info["current_app"], 0) + 1

        members_data.append(member_info)

    # Calculate average productivity
    avg_productivity = round((total_productive / total_hours * 100) if total_hours > 0 else 0, 1)

    # Get top apps for today (from all sharing members)
    sharing_member_ids = [m["user_id"] for m in members_data if m.get("can_view_details")]
    top_apps = []

    if sharing_member_ids:
        app_result = await db.execute(
            select(
                Activity.app_name,
                func.sum(Activity.duration).label('total_time')
            )
            .where(
                Activity.user_id.in_(sharing_member_ids),
                Activity.start_time >= today_start
            )
            .group_by(Activity.app_name)
            .order_by(func.sum(Activity.duration).desc())
            .limit(5)
        )
        for app_row in app_result.all():
            top_apps.append({
                "name": app_row.app_name,
                "hours": round(app_row.total_time / 3600, 2) if app_row.total_time else 0
            })

    return {
        "team_id": team_id,
        "date": datetime.now().date().isoformat(),
        "stats": {
            "total_members": len(members_data),
            "active_today": active_count,
            "total_hours_today": round(total_hours, 2),
            "avg_productivity": avg_productivity,
            "top_apps": top_apps
        },
        "members": sorted(members_data, key=lambda x: x.get("today_time") or 0, reverse=True)
    }


# ============================================================================
# Permission Management Endpoints (Owner Only)
# ============================================================================

@router.get("/{team_id}/permissions")
async def list_permissions(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all granted permissions (Owner only)."""
    if not await is_team_owner(db, team_id, current_user.id):
        raise HTTPException(403, "Owner access required")

    result = await db.execute(
        select(TeamPermission, User)
        .join(User, TeamPermission.grantee_id == User.id)
        .where(TeamPermission.team_id == team_id)
        .order_by(TeamPermission.created_at.desc())
    )

    permissions = []
    for row in result.all():
        perm, grantee = row

        # Get target user name if specific
        target_name = None
        if perm.target_user_id:
            target_result = await db.execute(
                select(User).where(User.id == perm.target_user_id)
            )
            target = target_result.scalar_one_or_none()
            if target:
                target_name = target.name or target.email.split('@')[0]

        permissions.append({
            "id": perm.id,
            "grantee_id": perm.grantee_id,
            "grantee_name": grantee.name or grantee.email.split('@')[0],
            "grantee_email": grantee.email,
            "target_user_id": perm.target_user_id,
            "target_user_name": target_name,
            "can_view_activity": perm.can_view_activity,
            "can_view_screenshots": perm.can_view_screenshots,
            "can_view_urls": perm.can_view_urls,
            "can_view_analytics": perm.can_view_analytics,
            "can_export_data": perm.can_export_data,
            "created_at": perm.created_at,
            "expires_at": perm.expires_at,
        })

    return permissions


@router.post("/{team_id}/permissions")
async def grant_permission(
    team_id: int,
    perm_data: PermissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Grant viewing permission to an admin (Owner only)."""
    if not await is_team_owner(db, team_id, current_user.id):
        raise HTTPException(403, "Owner access required")

    # Verify grantee is an admin of this team
    grantee_role = await get_user_role_in_team(db, team_id, perm_data.grantee_id)
    if grantee_role != TeamRole.ADMIN:
        raise HTTPException(400, "Can only grant permissions to admins")

    # If specific targets, verify they are team members
    if perm_data.target_user_ids:
        for target_id in perm_data.target_user_ids:
            target_role = await get_user_role_in_team(db, team_id, target_id)
            if not target_role:
                raise HTTPException(400, f"User {target_id} is not a team member")

    created_perms = []

    if perm_data.target_user_ids:
        # Create permission for each target
        for target_id in perm_data.target_user_ids:
            perm = TeamPermission(
                team_id=team_id,
                granter_id=current_user.id,
                grantee_id=perm_data.grantee_id,
                target_user_id=target_id,
                can_view_activity=perm_data.can_view_activity,
                can_view_screenshots=perm_data.can_view_screenshots,
                can_view_urls=perm_data.can_view_urls,
                can_view_analytics=perm_data.can_view_analytics,
                can_export_data=perm_data.can_export_data,
                expires_at=perm_data.expires_at,
            )
            db.add(perm)
            created_perms.append(perm)
    else:
        # Create permission for all members (target_user_id = NULL)
        perm = TeamPermission(
            team_id=team_id,
            granter_id=current_user.id,
            grantee_id=perm_data.grantee_id,
            target_user_id=None,
            can_view_activity=perm_data.can_view_activity,
            can_view_screenshots=perm_data.can_view_screenshots,
            can_view_urls=perm_data.can_view_urls,
            can_view_analytics=perm_data.can_view_analytics,
            can_export_data=perm_data.can_export_data,
            expires_at=perm_data.expires_at,
        )
        db.add(perm)
        created_perms.append(perm)

    await db.commit()

    return {
        "message": f"Granted {len(created_perms)} permission(s)",
        "permission_ids": [p.id for p in created_perms]
    }


@router.put("/{team_id}/permissions/{permission_id}")
async def update_permission(
    team_id: int,
    permission_id: int,
    perm_data: PermissionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a permission (Owner only)."""
    if not await is_team_owner(db, team_id, current_user.id):
        raise HTTPException(403, "Owner access required")

    result = await db.execute(
        select(TeamPermission).where(
            TeamPermission.id == permission_id,
            TeamPermission.team_id == team_id
        )
    )
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(404, "Permission not found")

    if perm_data.can_view_activity is not None:
        perm.can_view_activity = perm_data.can_view_activity
    if perm_data.can_view_screenshots is not None:
        perm.can_view_screenshots = perm_data.can_view_screenshots
    if perm_data.can_view_urls is not None:
        perm.can_view_urls = perm_data.can_view_urls
    if perm_data.can_view_analytics is not None:
        perm.can_view_analytics = perm_data.can_view_analytics
    if perm_data.can_export_data is not None:
        perm.can_export_data = perm_data.can_export_data
    if perm_data.expires_at is not None:
        perm.expires_at = perm_data.expires_at

    await db.commit()
    return {"message": "Permission updated"}


@router.delete("/{team_id}/permissions/{permission_id}")
async def revoke_permission(
    team_id: int,
    permission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a permission (Owner only)."""
    if not await is_team_owner(db, team_id, current_user.id):
        raise HTTPException(403, "Owner access required")

    await db.execute(
        delete(TeamPermission).where(
            TeamPermission.id == permission_id,
            TeamPermission.team_id == team_id
        )
    )
    await db.commit()
    return {"message": "Permission revoked"}


@router.get("/{team_id}/my-permissions")
async def get_my_permissions(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's permissions for this team."""
    role = await get_user_role_in_team(db, team_id, current_user.id)
    if not role:
        raise HTTPException(403, "Not a team member")

    is_owner = await is_team_owner(db, team_id, current_user.id)

    if is_owner:
        return {
            "role": "owner",
            "is_owner": True,
            "can_view_activity": True,
            "can_view_screenshots": True,
            "can_view_urls": True,
            "can_view_analytics": True,
            "can_export_data": True,
            "target_user_ids": "all"
        }

    if role == TeamRole.ADMIN:
        # Get granted permissions
        result = await db.execute(
            select(TeamPermission).where(
                TeamPermission.team_id == team_id,
                TeamPermission.grantee_id == current_user.id,
                or_(
                    TeamPermission.expires_at == None,
                    TeamPermission.expires_at > datetime.utcnow()
                )
            )
        )

        permissions = result.scalars().all()
        can_view_all = any(p.target_user_id is None for p in permissions)
        target_ids = [p.target_user_id for p in permissions if p.target_user_id] if not can_view_all else "all"

        return {
            "role": "admin",
            "is_owner": False,
            "can_view_activity": any(p.can_view_activity for p in permissions) if permissions else False,
            "can_view_screenshots": any(p.can_view_screenshots for p in permissions) if permissions else False,
            "can_view_urls": any(p.can_view_urls for p in permissions) if permissions else False,
            "can_view_analytics": any(p.can_view_analytics for p in permissions) if permissions else False,
            "can_export_data": any(p.can_export_data for p in permissions) if permissions else False,
            "target_user_ids": target_ids
        }

    return {
        "role": "member",
        "is_owner": False,
        "can_view_activity": False,
        "can_view_screenshots": False,
        "can_view_urls": False,
        "can_view_analytics": False,
        "can_export_data": False,
        "target_user_ids": []
    }


# ============================================================================
# Invite Info Endpoint (Public - for accept page)
# ============================================================================

@router.get("/invite/{token}/info")
async def get_invite_info(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get invite info for display on accept page (no auth required)."""
    result = await db.execute(
        select(TeamInvite, Team)
        .join(Team, TeamInvite.team_id == Team.id)
        .where(
            TeamInvite.token == token,
            TeamInvite.accepted == False
        )
    )
    row = result.first()

    if not row:
        raise HTTPException(404, "Invite not found or already used")

    invite, team = row

    # Check expiration
    is_expired = invite.expires_at and invite.expires_at < datetime.utcnow()

    # Get inviter name
    inviter_name = None
    if invite.invited_by:
        inviter_result = await db.execute(
            select(User).where(User.id == invite.invited_by)
        )
        inviter = inviter_result.scalar_one_or_none()
        if inviter:
            inviter_name = inviter.name or inviter.email.split('@')[0]

    # Get member count
    member_count_result = await db.execute(
        select(func.count(TeamMember.id)).where(TeamMember.team_id == team.id)
    )
    member_count = member_count_result.scalar() or 0

    return {
        "team_name": team.name,
        "team_avatar": team.avatar_url,
        "team_description": team.description,
        "member_count": member_count,
        "invited_by": inviter_name,
        "invited_email": invite.email,
        "role": invite.role.value,
        "expires_at": invite.expires_at,
        "is_expired": is_expired,
        "is_valid": not is_expired
    }


# ============================================================================
# Member Timeline Endpoint (Enhanced)
# ============================================================================

@router.get("/{team_id}/members/{user_id}/timeline")
async def get_member_timeline(
    team_id: int,
    user_id: int,
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get member's activity timeline for a day.
    Requires activity view permission.
    """
    # Check permission
    if not await check_view_permission(db, team_id, current_user.id, user_id, 'activity'):
        raise HTTPException(403, "No permission to view this member's activity")

    # Get member settings
    member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Member not found")

    if not member.share_activity:
        raise HTTPException(403, "Member has not enabled activity sharing")

    # Parse date
    if date:
        try:
            filter_date = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    else:
        filter_date = datetime.now()

    start_time = filter_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_time = filter_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    # Query activities
    result = await db.execute(
        select(Activity)
        .where(
            Activity.user_id == user_id,
            Activity.start_time >= start_time,
            Activity.start_time <= end_time
        )
        .order_by(Activity.start_time)
    )

    timeline = []
    hourly_breakdown = {h: {"productive": 0, "neutral": 0, "distracting": 0} for h in range(24)}

    for activity in result.scalars().all():
        # Respect hide_window_titles setting
        title = activity.window_title if not member.hide_window_titles else None

        timeline.append({
            "start": activity.start_time.strftime("%H:%M") if activity.start_time else None,
            "end": activity.end_time.strftime("%H:%M") if activity.end_time else None,
            "app": activity.app_name,
            "title": title,
            "category": activity.category,
            "productivity": "productive" if activity.is_productive else (
                "distracting" if activity.productivity_score and activity.productivity_score < 0 else "neutral"
            ),
            "duration": activity.duration,
        })

        # Calculate hourly breakdown
        if activity.start_time and activity.duration:
            hour = activity.start_time.hour
            prod_type = "productive" if activity.is_productive else (
                "distracting" if activity.productivity_score and activity.productivity_score < 0 else "neutral"
            )
            hourly_breakdown[hour][prod_type] += activity.duration // 60  # Minutes

    return {
        "user_id": user_id,
        "date": filter_date.date().isoformat(),
        "timeline": timeline,
        "hourly_breakdown": [
            {
                "hour": h,
                "productive": hourly_breakdown[h]["productive"],
                "neutral": hourly_breakdown[h]["neutral"],
                "distracting": hourly_breakdown[h]["distracting"]
            }
            for h in range(24)
        ]
    }
