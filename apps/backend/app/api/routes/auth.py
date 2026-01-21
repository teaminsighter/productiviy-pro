"""
Authentication API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from datetime import datetime, timedelta
import secrets

from app.core.database import get_db
from app.core.rate_limiter import (
    limiter, auth_rate_limit,
    record_failed_attempt, clear_failed_attempts,
    is_locked_out, get_remaining_attempts
)
from app.core.validators import (
    validate_password, validate_email, sanitize_string,
    check_xss, MAX_SHORT_TEXT, MAX_MEDIUM_TEXT
)
from app.services.auth_service import (
    create_user, authenticate_user, create_access_token,
    get_user_by_email, get_user_by_id, verify_token,
    update_user_last_login, update_user_profile, update_user_password
)
from app.services.email_service import email_service
from app.services.google_oauth import google_oauth_service
from app.models.user import User

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# Pydantic models with validation
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = Field(None, max_length=100)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        is_valid, error = validate_password(v, check_strength=True)
        if not is_valid:
            raise ValueError(error)
        return v

    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = sanitize_string(v, MAX_SHORT_TEXT)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    plan: str
    is_trial_active: bool
    days_left_trial: int
    has_premium_access: bool
    is_verified: bool
    is_admin: bool = False
    is_super_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class GoogleAuthRequest(BaseModel):
    token: str  # Google OAuth token


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        is_valid, error = validate_password(v, check_strength=True)
        if not is_valid:
            raise ValueError(error)
        return v


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)

    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = sanitize_string(v, MAX_SHORT_TEXT)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v

    @field_validator('avatar_url')
    @classmethod
    def validate_avatar_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        # Basic URL validation
        if not v.startswith(('http://', 'https://')):
            raise ValueError("Avatar URL must start with http:// or https://")
        if len(v) > 500:
            raise ValueError("Avatar URL is too long")
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=200)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        is_valid, error = validate_password(v, check_strength=True)
        if not is_valid:
            raise ValueError(error)
        return v


# Dependency to get current user (optional - returns None if not authenticated)
async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None

    payload = verify_token(token)
    if payload is None:
        return None

    user_id_str = payload.get("sub")
    if user_id_str is None:
        return None

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        return None

    user = await get_user_by_id(db, user_id)
    return user


# Dependency to get current user (required - raises exception if not authenticated)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user


def create_user_response(user: User) -> UserResponse:
    """Helper to create UserResponse from User model"""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        plan=user.plan.value,
        is_trial_active=user.is_trial_active,
        days_left_trial=user.days_left_trial,
        has_premium_access=user.has_premium_access,
        is_verified=user.is_verified,
        created_at=user.created_at
    )


# Routes
@router.post("/register", response_model=TokenResponse)
@limiter.limit(auth_rate_limit())
async def register(
    request: Request,
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    # Check if user exists
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate password
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Create user
    user = await create_user(
        db,
        email=user_data.email,
        password=user_data.password,
        name=user_data.name
    )

    # Send welcome email in background
    background_tasks.add_task(
        email_service.send_welcome_email,
        to=user.email,
        name=user.name or ""
    )

    # Create token (sub must be string per JWT spec)
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=create_user_response(user)
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(auth_rate_limit())
async def login(
    request: Request,
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login with email and password"""
    # Check if account is locked out due to too many failed attempts
    locked, remaining_time = is_locked_out(user_data.email)
    if locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {remaining_time} seconds.",
            headers={"Retry-After": str(remaining_time)}
        )

    user = await authenticate_user(db, user_data.email, user_data.password)
    if not user:
        # Record failed attempt for brute force protection
        record_failed_attempt(user_data.email)
        remaining = get_remaining_attempts(user_data.email)

        detail = "Incorrect email or password"
        if remaining > 0 and remaining <= 3:
            detail = f"Incorrect email or password. {remaining} attempts remaining."

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Clear failed attempts on successful login
    clear_failed_attempts(user_data.email)

    # Update last login
    user = await update_user_last_login(db, user)

    # Set user ID for screenshot service (desktop app single-user mode)
    from app.services.screenshot_service import screenshot_service
    screenshot_service.current_user_id = user.id

    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=create_user_response(user)
    )


@router.post("/login/form", response_model=TokenResponse)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login with OAuth2 form (for Swagger UI)"""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Update last login
    user = await update_user_last_login(db, user)

    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=create_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return create_user_response(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    user = await update_user_profile(
        db,
        current_user,
        name=profile_data.name,
        avatar_url=profile_data.avatar_url
    )
    return create_user_response(user)


@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    from app.services.auth_service import verify_password
    if not current_user.hashed_password or not verify_password(
        password_data.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )

    await update_user_password(db, current_user, password_data.new_password)
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout():
    """Logout (client should delete the token)"""
    return {"message": "Logged out successfully"}


@router.post("/verify-token")
async def verify_user_token(current_user: User = Depends(get_current_user)):
    """Verify if token is valid"""
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "plan": current_user.plan.value,
        "has_premium_access": current_user.has_premium_access
    }


@router.get("/status")
async def auth_status(current_user: Optional[User] = Depends(get_current_user_optional)):
    """Check authentication status"""
    if current_user:
        return {
            "authenticated": True,
            "user": create_user_response(current_user)
        }
    return {"authenticated": False}


@router.get("/extension-token")
async def get_extension_token(current_user: User = Depends(get_current_user)):
    """
    Get a token for the browser extension.
    Called by extension to auto-login when desktop app is already authenticated.
    """
    # Generate a new token for the extension
    access_token = create_access_token(
        data={"sub": current_user.email, "user_id": current_user.id},
        expires_delta=timedelta(days=30)  # Longer expiry for extension
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": create_user_response(current_user)
    }


# Temporary storage for extension link codes (in production, use Redis)
_extension_link_codes: dict = {}


@router.post("/extension-link-code")
async def generate_extension_link_code(current_user: User = Depends(get_current_user)):
    """
    Generate a temporary code that the extension can use to link.
    Code expires in 5 minutes.
    """
    import random
    import string

    # Generate a 6-character code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # Store with expiry (5 minutes)
    _extension_link_codes[code] = {
        "user_id": current_user.id,
        "email": current_user.email,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=5)
    }

    # Clean up old codes
    now = datetime.utcnow()
    expired = [k for k, v in _extension_link_codes.items() if v["expires_at"] < now]
    for k in expired:
        del _extension_link_codes[k]

    return {
        "code": code,
        "expires_in": 300  # 5 minutes in seconds
    }


@router.post("/extension-link-verify")
async def verify_extension_link_code(data: dict):
    """
    Verify a link code and return a token for the extension.
    No authentication required - code proves the link.
    """
    code = data.get("code", "").upper().strip()

    if not code or code not in _extension_link_codes:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    link_data = _extension_link_codes[code]

    # Check expiry
    if datetime.utcnow() > link_data["expires_at"]:
        del _extension_link_codes[code]
        raise HTTPException(status_code=400, detail="Code expired")

    # Generate token for extension
    access_token = create_access_token(
        data={"sub": link_data["email"], "user_id": link_data["user_id"]},
        expires_delta=timedelta(days=30)
    )

    # Delete used code
    del _extension_link_codes[code]

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/forgot-password")
@limiter.limit("3/minute")  # Strict rate limit for password reset
async def forgot_password(
    request: Request,
    forgot_request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Request a password reset email"""
    user = await get_user_by_email(db, forgot_request.email)

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, a reset link has been sent."}

    # Don't allow password reset for OAuth users
    if user.auth_provider != "email":
        return {"message": "If an account exists with this email, a reset link has been sent."}

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    await db.commit()

    # Send reset email in background
    background_tasks.add_task(
        email_service.send_password_reset,
        to=user.email,
        reset_token=reset_token
    )

    return {"message": "If an account exists with this email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reset password using token from email"""
    # Validate new password
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Find user with valid reset token
    from sqlalchemy import select
    result = await db.execute(
        select(User).where(
            User.password_reset_token == request.token,
            User.password_reset_expires > datetime.utcnow()
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Update password and clear reset token
    await update_user_password(db, user, request.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.commit()

    return {"message": "Password reset successful. You can now log in with your new password."}


@router.post("/google", response_model=TokenResponse)
@limiter.limit(auth_rate_limit())
async def google_auth(
    request: Request,
    google_request: GoogleAuthRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with Google OAuth token (ID token or access token)"""
    # Try to verify as ID token first
    google_user = await google_oauth_service.verify_id_token(google_request.token)

    # If ID token verification fails, try as access token
    if not google_user:
        google_user = await google_oauth_service.get_user_info(google_request.token)

    if not google_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    if not google_user.verified_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email not verified"
        )

    # Check if user exists by Google ID
    from sqlalchemy import select
    result = await db.execute(
        select(User).where(User.google_id == google_user.id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Check if user exists by email (might have registered with email first)
        existing_user = await get_user_by_email(db, google_user.email)

        if existing_user:
            # Link Google account to existing user
            existing_user.google_id = google_user.id
            existing_user.auth_provider = "google"
            if google_user.picture and not existing_user.avatar_url:
                existing_user.avatar_url = google_user.picture
            if google_user.name and not existing_user.name:
                existing_user.name = google_user.name
            existing_user.is_verified = True
            await db.commit()
            user = existing_user
        else:
            # Create new user
            user = User(
                email=google_user.email,
                name=google_user.name,
                avatar_url=google_user.picture,
                google_id=google_user.id,
                auth_provider="google",
                is_verified=True,
                is_active=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

            # Send welcome email for new users
            background_tasks.add_task(
                email_service.send_welcome_email,
                to=user.email,
                name=user.name or ""
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Update last login
    user = await update_user_last_login(db, user)

    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=create_user_response(user)
    )


# ═══════════════════════════════════════════════════════════════════
# GDPR COMPLIANCE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

class DeleteAccountRequest(BaseModel):
    password: Optional[str] = Field(None, min_length=1, max_length=128)
    confirm: bool = Field(..., description="Must be true to confirm deletion")


@router.get("/me/export")
@limiter.limit("3/hour")  # Rate limit exports to prevent abuse
async def export_user_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all user data (GDPR Article 20 - Right to Data Portability)

    Returns a comprehensive JSON export of all user data including:
    - Profile information
    - Activity history
    - Screenshots metadata
    - Goals and progress
    - Settings
    - Team memberships
    """
    from sqlalchemy import select
    from app.models import (
        Activity, URLActivity, Screenshot, Goal, Streak,
        Achievement, FocusSession, UserSettings
    )
    from app.models.team import TeamMember, Team
    from app.models.calendar import FocusBlock, FocusSettings

    # Get activities (last 90 days to keep export size reasonable)
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    activities_result = await db.execute(
        select(Activity).where(
            Activity.user_id == current_user.id,
            Activity.start_time >= ninety_days_ago
        ).order_by(Activity.start_time.desc())
    )
    activities = activities_result.scalars().all()

    # Get URL activities
    url_activities_result = await db.execute(
        select(URLActivity).where(
            URLActivity.user_id == current_user.id,
            URLActivity.timestamp >= ninety_days_ago
        ).order_by(URLActivity.timestamp.desc())
    )
    url_activities = url_activities_result.scalars().all()

    # Get screenshots metadata (not the actual images)
    screenshots_result = await db.execute(
        select(Screenshot).where(
            Screenshot.user_id == current_user.id,
            Screenshot.is_deleted == False
        ).order_by(Screenshot.timestamp.desc()).limit(1000)
    )
    screenshots = screenshots_result.scalars().all()

    # Get goals
    goals_result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id)
    )
    goals = goals_result.scalars().all()

    # Get streaks
    streaks_result = await db.execute(
        select(Streak).where(Streak.user_id == current_user.id)
    )
    streaks = streaks_result.scalars().all()

    # Get achievements
    achievements_result = await db.execute(
        select(Achievement).where(Achievement.user_id == current_user.id)
    )
    achievements = achievements_result.scalars().all()

    # Get focus sessions
    focus_sessions_result = await db.execute(
        select(FocusSession).where(
            FocusSession.user_id == current_user.id
        ).order_by(FocusSession.started_at.desc()).limit(500)
    )
    focus_sessions = focus_sessions_result.scalars().all()

    # Get user settings
    settings_result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = settings_result.scalar_one_or_none()

    # Get focus settings
    focus_settings_result = await db.execute(
        select(FocusSettings).where(FocusSettings.user_id == current_user.id)
    )
    focus_settings = focus_settings_result.scalar_one_or_none()

    # Get team memberships
    team_memberships_result = await db.execute(
        select(TeamMember, Team)
        .join(Team, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
    )
    team_memberships = team_memberships_result.all()

    # Get focus blocks
    focus_blocks_result = await db.execute(
        select(FocusBlock).where(
            FocusBlock.user_id == current_user.id
        ).order_by(FocusBlock.start_time.desc()).limit(500)
    )
    focus_blocks = focus_blocks_result.scalars().all()

    # Compile export data
    export_data = {
        "export_info": {
            "exported_at": datetime.utcnow().isoformat(),
            "export_format": "GDPR Data Export",
            "user_id": current_user.id,
            "activity_range_days": 90,
        },
        "profile": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "avatar_url": current_user.avatar_url,
            "plan": current_user.plan.value,
            "auth_provider": current_user.auth_provider,
            "is_verified": current_user.is_verified,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "last_login": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        },
        "settings": {
            "theme": getattr(settings, "theme", "dark") if settings else "dark",
            "timezone": getattr(settings, "timezone", "UTC") if settings else "UTC",
            "track_idle": getattr(settings, "track_idle", True) if settings else True,
            "idle_timeout": getattr(settings, "idle_timeout", 5) if settings else 5,
            "work_start_time": getattr(settings, "work_start_time", "09:00") if settings else "09:00",
            "work_end_time": getattr(settings, "work_end_time", "17:00") if settings else "17:00",
            "screenshots_enabled": getattr(settings, "screenshots_enabled", True) if settings else True,
            "screenshot_interval": getattr(settings, "screenshot_interval", 15) if settings else 15,
            "blur_screenshots": getattr(settings, "blur_screenshots", False) if settings else False,
            "ai_enabled": getattr(settings, "ai_enabled", True) if settings else True,
            "notifications_enabled": getattr(settings, "notifications_enabled", True) if settings else True,
        } if settings else None,
        "activities": [
            {
                "app_name": a.app_name,
                "window_title": a.window_title,
                "url": a.url,
                "category": a.category,
                "start_time": a.start_time.isoformat() if a.start_time else None,
                "end_time": a.end_time.isoformat() if a.end_time else None,
                "duration_seconds": a.duration,
                "productivity_score": a.productivity_score,
                "is_productive": a.is_productive,
            }
            for a in activities
        ],
        "url_activities": [
            {
                "full_url": ua.full_url,
                "domain": ua.domain,
                "page_title": ua.page_title,
                "timestamp": ua.timestamp.isoformat() if ua.timestamp else None,
                "duration_seconds": ua.duration,
                "category": ua.category,
                "is_productive": ua.is_productive,
            }
            for ua in url_activities
        ],
        "screenshots": [
            {
                "id": s.id,
                "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                "app_name": s.app_name,
                "window_title": s.window_title,
                "category": s.category,
                "is_blurred": s.is_blurred,
                # Note: Actual image files not included in JSON export
            }
            for s in screenshots
        ],
        "goals": [
            {
                "name": g.name,
                "goal_type": g.goal_type.value if hasattr(g.goal_type, 'value') else str(g.goal_type),
                "target_value": g.target_value,
                "current_value": g.current_value,
                "unit": g.unit,
                "frequency": g.frequency.value if hasattr(g.frequency, 'value') else str(g.frequency),
                "is_active": g.is_active,
                "status": g.status.value if hasattr(g.status, 'value') else str(g.status),
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in goals
        ],
        "streaks": [
            {
                "streak_type": s.streak_type.value if hasattr(s.streak_type, 'value') else str(s.streak_type),
                "current_count": s.current_count,
                "best_count": s.best_count,
                "last_updated": s.last_updated.isoformat() if s.last_updated else None,
            }
            for s in streaks
        ],
        "achievements": [
            {
                "achievement_type": a.achievement_type,
                "name": a.name,
                "description": a.description,
                "is_unlocked": a.is_unlocked,
                "unlocked_at": a.unlocked_at.isoformat() if a.unlocked_at else None,
                "progress": a.progress,
                "target": a.target,
            }
            for a in achievements
        ],
        "focus_sessions": [
            {
                "name": fs.name,
                "duration_planned_minutes": fs.duration_planned,
                "duration_actual_minutes": fs.duration_actual,
                "started_at": fs.started_at.isoformat() if fs.started_at else None,
                "ended_at": fs.ended_at.isoformat() if fs.ended_at else None,
                "was_completed": fs.was_completed,
                "interruptions": fs.interruptions,
            }
            for fs in focus_sessions
        ],
        "focus_blocks": [
            {
                "title": fb.title,
                "start_time": fb.start_time.isoformat() if fb.start_time else None,
                "end_time": fb.end_time.isoformat() if fb.end_time else None,
                "status": fb.status,
                "completed_minutes": fb.completed_minutes,
                "distractions_blocked": fb.distractions_blocked,
            }
            for fb in focus_blocks
        ],
        "team_memberships": [
            {
                "team_name": team.name,
                "role": member.role.value if hasattr(member.role, 'value') else str(member.role),
                "joined_at": member.joined_at.isoformat() if member.joined_at else None,
                "share_activity": member.share_activity,
                "share_screenshots": member.share_screenshots,
            }
            for member, team in team_memberships
        ],
        "focus_settings": {
            "default_blocked_apps": focus_settings.default_blocked_apps if focus_settings else [],
            "default_blocked_websites": focus_settings.default_blocked_websites if focus_settings else [],
            "focus_duration_minutes": focus_settings.focus_duration_minutes if focus_settings else 50,
            "break_duration_minutes": focus_settings.break_duration_minutes if focus_settings else 10,
            "blocking_mode": focus_settings.blocking_mode if focus_settings else "soft",
            "work_start_time": focus_settings.work_start_time if focus_settings else "09:00",
            "work_end_time": focus_settings.work_end_time if focus_settings else "17:00",
        } if focus_settings else None,
    }

    return export_data


@router.delete("/me")
@limiter.limit("3/hour")  # Strict rate limit for account deletion
async def delete_account(
    request: Request,
    delete_request: DeleteAccountRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete user account and all associated data (GDPR Article 17 - Right to Erasure)

    This permanently deletes:
    - User profile and authentication data
    - All activity records
    - All screenshots (including cloud storage)
    - All goals, streaks, and achievements
    - All settings
    - Team memberships (but not teams owned - must transfer or delete first)

    This action is IRREVERSIBLE.
    """
    from sqlalchemy import select, delete as sql_delete
    from app.models import (
        Activity, URLActivity, Screenshot, Goal, Streak,
        Achievement, FocusSession, UserSettings
    )
    from app.models.team import TeamMember, Team
    from app.models.calendar import FocusBlock, FocusSettings

    # Verify confirmation
    if not delete_request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm account deletion by setting confirm=true"
        )

    # For email auth users, verify password
    if current_user.auth_provider == "email" and current_user.hashed_password:
        if not delete_request.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required to delete account"
            )

        from app.services.auth_service import verify_password
        if not verify_password(delete_request.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )

    # Check if user owns any teams
    teams_owned_result = await db.execute(
        select(Team).where(Team.owner_id == current_user.id)
    )
    teams_owned = teams_owned_result.scalars().all()

    if teams_owned:
        team_names = [t.name for t in teams_owned]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You own team(s): {', '.join(team_names)}. Please transfer ownership or delete these teams first."
        )

    user_id = current_user.id
    user_email = current_user.email

    # Delete all user data in order (respecting foreign key constraints)

    # 1. Delete URL activities
    await db.execute(
        sql_delete(URLActivity).where(URLActivity.user_id == user_id)
    )

    # 2. Delete activities
    await db.execute(
        sql_delete(Activity).where(Activity.user_id == user_id)
    )

    # 3. Get screenshots for cloud deletion, then delete records
    screenshots_result = await db.execute(
        select(Screenshot).where(Screenshot.user_id == user_id)
    )
    screenshots = screenshots_result.scalars().all()
    screenshot_paths = [s.storage_path for s in screenshots if s.storage_path]

    await db.execute(
        sql_delete(Screenshot).where(Screenshot.user_id == user_id)
    )

    # 4. Delete goals, streaks, achievements
    await db.execute(
        sql_delete(Goal).where(Goal.user_id == user_id)
    )
    await db.execute(
        sql_delete(Streak).where(Streak.user_id == user_id)
    )
    await db.execute(
        sql_delete(Achievement).where(Achievement.user_id == user_id)
    )

    # 5. Delete focus sessions and blocks
    await db.execute(
        sql_delete(FocusSession).where(FocusSession.user_id == user_id)
    )
    await db.execute(
        sql_delete(FocusBlock).where(FocusBlock.user_id == user_id)
    )
    await db.execute(
        sql_delete(FocusSettings).where(FocusSettings.user_id == user_id)
    )

    # 6. Delete settings
    await db.execute(
        sql_delete(UserSettings).where(UserSettings.user_id == user_id)
    )

    # 7. Remove from teams (but don't delete teams)
    await db.execute(
        sql_delete(TeamMember).where(TeamMember.user_id == user_id)
    )

    # 8. Finally, delete the user
    await db.delete(current_user)
    await db.commit()

    # Delete cloud screenshots in background (don't block the response)
    if screenshot_paths:
        async def delete_cloud_screenshots():
            try:
                from app.services.screenshot_service import firebase_storage
                if firebase_storage and firebase_storage.is_available:
                    for path in screenshot_paths:
                        try:
                            await firebase_storage.delete_file(path)
                        except Exception:
                            pass  # Best effort deletion
            except Exception:
                pass  # Don't fail if cloud deletion fails

        background_tasks.add_task(delete_cloud_screenshots)

    # Send confirmation email
    background_tasks.add_task(
        email_service.send_account_deleted_confirmation,
        to=user_email
    )

    return {
        "message": "Account deleted successfully",
        "deleted_data": {
            "activities": True,
            "screenshots": True,
            "goals": True,
            "settings": True,
            "team_memberships": True,
            "cloud_storage": len(screenshot_paths) > 0,
        }
    }
