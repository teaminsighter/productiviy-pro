"""
Focus Mode API Routes
Endpoints for managing focus sessions, settings, and distraction blocking
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, field_validator

from app.core.database import get_db
from app.core.rate_limiter import limiter, api_rate_limit, sensitive_rate_limit
from app.core.validators import (
    validate_time_string, validate_list_items, sanitize_string,
    check_xss, MAX_SHORT_TEXT
)
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.services.focus_service import FocusService

router = APIRouter(tags=["Focus"])


# ═══════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════

class FocusSettingsUpdate(BaseModel):
    default_blocked_apps: Optional[List[str]] = Field(None, max_length=100)
    default_blocked_websites: Optional[List[str]] = Field(None, max_length=100)
    allowed_apps: Optional[List[str]] = Field(None, max_length=100)
    allowed_websites: Optional[List[str]] = Field(None, max_length=100)
    auto_start_from_calendar: Optional[bool] = None
    auto_detect_gaps: Optional[bool] = None
    min_gap_minutes: Optional[int] = Field(None, ge=5, le=120)
    focus_duration_minutes: Optional[int] = Field(None, ge=5, le=240)
    break_duration_minutes: Optional[int] = Field(None, ge=1, le=60)
    long_break_duration_minutes: Optional[int] = Field(None, ge=5, le=120)
    sessions_before_long_break: Optional[int] = Field(None, ge=1, le=10)
    break_reminders_enabled: Optional[bool] = None
    blocking_mode: Optional[str] = Field(None, pattern=r"^(soft|hard|strict)$")
    bypass_password: Optional[str] = Field(None, max_length=100)
    work_start_time: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    work_end_time: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    work_days: Optional[List[int]] = None

    @field_validator('default_blocked_apps', 'default_blocked_websites', 'allowed_apps', 'allowed_websites')
    @classmethod
    def validate_app_lists(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        validated = []
        for item in v:
            item = sanitize_string(item, MAX_SHORT_TEXT)
            if len(item) > 200:
                raise ValueError(f"Item too long: {item[:20]}...")
            validated.append(item)
        return validated

    @field_validator('work_days')
    @classmethod
    def validate_work_days(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is None:
            return v
        for day in v:
            if day < 0 or day > 6:
                raise ValueError("Work days must be between 0 (Sunday) and 6 (Saturday)")
        return list(set(v))

    @field_validator('bypass_password')
    @classmethod
    def validate_bypass_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v


class CreateFocusBlockRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    title: str = Field(default="Focus Time", max_length=100)
    blocking_enabled: bool = True
    sync_to_calendar: bool = False

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = sanitize_string(v, MAX_SHORT_TEXT)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v


class StartFocusRequest(BaseModel):
    block_id: Optional[str] = None  # If None, starts ad-hoc session


class DistractionBlockedRequest(BaseModel):
    block_id: str = Field(..., max_length=100)
    app_or_site: str = Field(..., max_length=200)

    @field_validator('app_or_site')
    @classmethod
    def validate_app_or_site(cls, v: str) -> str:
        v = sanitize_string(v, 200)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v


class FocusSettingsResponse(BaseModel):
    id: str
    default_blocked_apps: List[str]
    default_blocked_websites: List[str]
    allowed_apps: List[str]
    allowed_websites: List[str]
    auto_start_from_calendar: bool
    auto_detect_gaps: bool
    min_gap_minutes: int
    focus_duration_minutes: int
    break_duration_minutes: int
    long_break_duration_minutes: int
    sessions_before_long_break: int
    break_reminders_enabled: bool
    blocking_mode: str
    work_start_time: str
    work_end_time: str
    work_days: List[int]
    total_focus_minutes: int
    total_distractions_blocked: int
    current_streak_days: int
    longest_streak_days: int

    class Config:
        from_attributes = True


class FocusBlockResponse(BaseModel):
    id: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    title: str
    status: str
    blocking_enabled: bool
    blocked_apps: List[str]
    blocked_websites: List[str]
    completed_minutes: int
    success_rate: Optional[float]
    distractions_blocked: int

    class Config:
        from_attributes = True


class CalendarGapResponse(BaseModel):
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    quality_score: int


class FocusSuggestionResponse(BaseModel):
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    reason: str
    priority: str


# ═══════════════════════════════════════════════════════════════════
# SETTINGS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/settings", response_model=FocusSettingsResponse)
@limiter.limit(api_rate_limit())
async def get_focus_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's focus mode settings"""
    service = FocusService(db)
    settings = await service.get_or_create_settings(current_user.id)
    return settings


@router.put("/settings", response_model=FocusSettingsResponse)
@limiter.limit(sensitive_rate_limit())
async def update_focus_settings(
    request: Request,
    updates: FocusSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user's focus mode settings"""
    service = FocusService(db)
    settings = await service.update_settings(
        current_user.id,
        updates.model_dump(exclude_unset=True)
    )
    return settings


# ═══════════════════════════════════════════════════════════════════
# FOCUS BLOCK ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/blocks", response_model=List[FocusBlockResponse])
async def get_focus_blocks(
    hours_ahead: int = Query(default=24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming scheduled focus blocks"""
    service = FocusService(db)
    blocks = await service.get_upcoming_focus_blocks(current_user.id, hours_ahead)
    return blocks


@router.post("/blocks", response_model=FocusBlockResponse)
async def create_focus_block(
    request: CreateFocusBlockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new focus block"""
    service = FocusService(db)

    if request.end_time <= request.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    block = await service.create_focus_block(
        user_id=current_user.id,
        start_time=request.start_time,
        end_time=request.end_time,
        title=request.title,
        blocking_enabled=request.blocking_enabled,
        sync_to_calendar=request.sync_to_calendar
    )
    return block


@router.delete("/blocks/{block_id}")
async def delete_focus_block(
    block_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a focus block"""
    from app.models import FocusBlock
    from sqlalchemy import select, and_

    result = await db.execute(
        select(FocusBlock).where(
            and_(
                FocusBlock.id == block_id,
                FocusBlock.user_id == current_user.id
            )
        )
    )
    block = result.scalar_one_or_none()

    if not block:
        raise HTTPException(status_code=404, detail="Focus block not found")

    await db.delete(block)
    await db.commit()

    return {"message": "Focus block deleted", "id": block_id}


# ═══════════════════════════════════════════════════════════════════
# ACTIVE SESSION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/active", response_model=Optional[FocusBlockResponse])
async def get_active_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get currently active focus session"""
    service = FocusService(db)
    block = await service.get_active_focus_session(current_user.id)
    return block


@router.post("/start", response_model=FocusBlockResponse)
@limiter.limit(sensitive_rate_limit())
async def start_focus_session(
    http_request: Request,
    request: StartFocusRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a focus session"""
    service = FocusService(db)

    # Check if already in focus
    active = await service.get_active_focus_session(current_user.id)
    if active:
        raise HTTPException(status_code=400, detail="Already in an active focus session")

    try:
        block = await service.start_focus_session(
            current_user.id,
            block_id=request.block_id if request else None
        )
        return block
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/end/{block_id}", response_model=FocusBlockResponse)
async def end_focus_session(
    block_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """End a focus session"""
    service = FocusService(db)

    try:
        block = await service.end_focus_session(current_user.id, block_id)
        return block
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/pause/{block_id}", response_model=FocusBlockResponse)
async def pause_focus_session(
    block_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pause a focus session"""
    service = FocusService(db)

    try:
        block = await service.pause_focus_session(current_user.id, block_id)
        return block
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# SUGGESTIONS & GAPS
# ═══════════════════════════════════════════════════════════════════

@router.get("/gaps", response_model=List[CalendarGapResponse])
async def get_calendar_gaps(
    days_ahead: int = Query(default=7, ge=1, le=30),
    min_gap_minutes: int = Query(default=30, ge=15, le=240),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find gaps in calendar suitable for focus time"""
    service = FocusService(db)

    now = datetime.now()
    end_date = now + timedelta(days=days_ahead)

    gaps = await service.detect_calendar_gaps(
        current_user.id,
        now,
        end_date,
        min_gap_minutes
    )

    return [
        CalendarGapResponse(
            start_time=gap.start_time,
            end_time=gap.end_time,
            duration_minutes=gap.duration_minutes,
            quality_score=gap.quality_score
        )
        for gap in gaps
    ]


@router.get("/suggestions", response_model=List[FocusSuggestionResponse])
async def get_focus_suggestions(
    days_ahead: int = Query(default=7, ge=1, le=14),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated suggestions for focus blocks"""
    service = FocusService(db)
    suggestions = await service.get_focus_suggestions(current_user.id, days_ahead)

    return [
        FocusSuggestionResponse(
            start_time=s.start_time,
            end_time=s.end_time,
            duration_minutes=s.duration_minutes,
            reason=s.reason,
            priority=s.priority
        )
        for s in suggestions
    ]


# ═══════════════════════════════════════════════════════════════════
# STATS & BLOCKING
# ═══════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_focus_stats(
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get focus statistics"""
    service = FocusService(db)
    stats = await service.get_focus_stats(current_user.id, days)
    return stats


@router.post("/distraction-blocked")
async def record_distraction_blocked(
    request: DistractionBlockedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a blocked distraction attempt"""
    service = FocusService(db)
    await service.record_distraction_blocked(
        current_user.id,
        request.block_id,
        request.app_or_site
    )
    return {"message": "Distraction recorded"}


@router.get("/check-auto-start")
async def check_auto_start(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if there's a focus event that should auto-start"""
    service = FocusService(db)
    result = await service.check_auto_start_focus(current_user.id)
    return {"should_start": result is not None, "event": result}


# ═══════════════════════════════════════════════════════════════════
# QUICK ACTIONS
# ═══════════════════════════════════════════════════════════════════

@router.post("/quick-start")
@limiter.limit(sensitive_rate_limit())
async def quick_start_focus(
    request: Request,
    duration_minutes: int = Query(default=50, ge=5, le=180),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick start a focus session with custom duration"""
    service = FocusService(db)

    # Check if already in focus
    active = await service.get_active_focus_session(current_user.id)
    if active:
        raise HTTPException(status_code=400, detail="Already in an active focus session")

    now = datetime.now()
    end_time = now + timedelta(minutes=duration_minutes)

    block = await service.create_focus_block(
        user_id=current_user.id,
        start_time=now,
        end_time=end_time,
        title="Quick Focus",
        blocking_enabled=True
    )

    # Immediately start it
    block = await service.start_focus_session(current_user.id, block.id)

    return block


@router.post("/schedule-from-suggestion")
async def schedule_from_suggestion(
    start_time: datetime,
    end_time: datetime,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Schedule a focus block from a suggestion"""
    service = FocusService(db)

    block = await service.create_focus_block(
        user_id=current_user.id,
        start_time=start_time,
        end_time=end_time,
        title="Scheduled Focus",
        blocking_enabled=True,
        sync_to_calendar=True
    )

    return block
