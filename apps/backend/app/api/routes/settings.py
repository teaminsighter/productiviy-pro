"""
Settings API Routes

Provides endpoints for managing user settings with database persistence.
All settings are tied to authenticated users.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import httpx

from app.core.database import get_db
from app.core.rate_limiter import limiter, api_rate_limit, sensitive_rate_limit, export_rate_limit
from app.core.security import set_openai_api_key, get_openai_api_key, delete_api_key
from app.core.validators import (
    validate_time_string, validate_list_items, sanitize_string,
    check_xss, MAX_SHORT_TEXT, validate_openai_api_key
)
from app.models.settings import UserSettings, CustomList
from app.models.user import User
from app.api.routes.auth import get_current_user

router = APIRouter()


# ============================================================================
# Settings Pydantic Models (for API request/response)
# ============================================================================

class GeneralSettings(BaseModel):
    theme: str = "dark"
    language: str = "en"
    startOnBoot: bool = True
    startMinimized: bool = False
    showInTray: bool = True
    closeToTray: bool = True
    minimizeToTray: bool = True
    autoUpdate: bool = True


class TrackingSettings(BaseModel):
    trackingEnabled: bool = True
    workStartTime: str = Field(default="09:00", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    workEndTime: str = Field(default="17:00", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    workDays: List[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5])
    idleTimeout: int = Field(default=300, ge=60, le=3600)
    afkDetection: bool = True

    @field_validator('workDays')
    @classmethod
    def validate_work_days(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("At least one work day must be selected")
        for day in v:
            if day < 0 or day > 6:
                raise ValueError("Work days must be between 0 (Sunday) and 6 (Saturday)")
        return list(set(v))  # Remove duplicates


class ScreenshotSettings(BaseModel):
    screenshotsEnabled: bool = True
    screenshotInterval: int = Field(default=300, ge=60, le=3600)
    screenshotQuality: str = Field(default="medium", pattern=r"^(low|medium|high)$")
    screenshotResolution: str = Field(default="medium", pattern=r"^(full|high|medium|low)$")
    screenshotFormat: str = Field(default="webp", pattern=r"^(webp|jpeg|png)$")
    blurScreenshots: bool = False
    autoDeleteAfter: int = Field(default=30, ge=1, le=365)
    excludedApps: List[str] = Field(default_factory=list, max_length=100)

    @field_validator('excludedApps')
    @classmethod
    def validate_excluded_apps(cls, v: List[str]) -> List[str]:
        if len(v) > 100:
            raise ValueError("Maximum 100 excluded apps allowed")
        validated = []
        for app in v:
            app = sanitize_string(app, MAX_SHORT_TEXT)
            if len(app) > 100:
                raise ValueError(f"App name too long: {app[:20]}...")
            validated.append(app)
        return validated


class AISettings(BaseModel):
    apiKeySet: bool = False
    apiKeyMasked: Optional[str] = None
    aiModel: str = "gpt-4o-mini"
    autoAnalysis: bool = True
    analysisFrequency: str = "daily"


class PrivacySettings(BaseModel):
    incognitoMode: bool = False
    dataRetentionDays: int = Field(default=90, ge=1, le=365)
    appLockEnabled: bool = False


class NotificationSettings(BaseModel):
    notificationsEnabled: bool = True
    productivityAlerts: bool = True
    breakReminders: bool = True
    breakInterval: int = Field(default=60, ge=15, le=240)
    soundEnabled: bool = True
    quietHoursEnabled: bool = False
    quietHoursStart: str = Field(default="22:00", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    quietHoursEnd: str = Field(default="08:00", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")


class AllSettingsResponse(BaseModel):
    general: GeneralSettings
    tracking: TrackingSettings
    screenshots: ScreenshotSettings
    ai: AISettings
    privacy: PrivacySettings
    notifications: NotificationSettings


class AllSettingsUpdate(BaseModel):
    general: Optional[GeneralSettings] = None
    tracking: Optional[TrackingSettings] = None
    screenshots: Optional[ScreenshotSettings] = None
    privacy: Optional[PrivacySettings] = None
    notifications: Optional[NotificationSettings] = None


# ============================================================================
# Helper Functions
# ============================================================================

async def get_or_create_settings(db: AsyncSession, user_id: int) -> UserSettings:
    """Get user settings from DB, create with defaults if not exists"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


def settings_to_response(settings: UserSettings, api_key: Optional[str] = None) -> AllSettingsResponse:
    """Convert UserSettings model to API response format"""
    settings_dict = settings.to_dict()

    return AllSettingsResponse(
        general=GeneralSettings(**settings_dict["general"]),
        tracking=TrackingSettings(**settings_dict["tracking"]),
        screenshots=ScreenshotSettings(**settings_dict["screenshots"]),
        ai=AISettings(
            apiKeySet=bool(api_key),
            apiKeyMasked=f"sk-...{api_key[-4:]}" if api_key else None,
            aiModel=settings_dict["ai"]["aiModel"],
            autoAnalysis=settings_dict["ai"]["autoAnalysis"],
            analysisFrequency=settings_dict["ai"]["analysisFrequency"],
        ),
        privacy=PrivacySettings(**settings_dict["privacy"]),
        notifications=NotificationSettings(**settings_dict["notifications"]),
    )


# ============================================================================
# Settings Endpoints
# ============================================================================

@router.get("/", response_model=AllSettingsResponse)
@limiter.limit(api_rate_limit())
async def get_all_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all user settings"""
    settings = await get_or_create_settings(db, current_user.id)
    api_key = get_openai_api_key()
    return settings_to_response(settings, api_key)


@router.put("/")
@limiter.limit(sensitive_rate_limit())
async def update_settings(
    request: Request,
    settings_update: AllSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update all settings"""
    settings = await get_or_create_settings(db, current_user.id)

    # Convert Pydantic models to dict format expected by update_from_dict
    update_data = {}
    if settings_update.general:
        update_data["general"] = settings_update.general.model_dump()
    if settings_update.tracking:
        update_data["tracking"] = settings_update.tracking.model_dump()
    if settings_update.screenshots:
        update_data["screenshots"] = settings_update.screenshots.model_dump()
    if settings_update.privacy:
        update_data["privacy"] = settings_update.privacy.model_dump()
    if settings_update.notifications:
        update_data["notifications"] = settings_update.notifications.model_dump()

    settings.update_from_dict(update_data)
    await db.commit()
    await db.refresh(settings)

    return {"status": "updated", "settings": settings.to_dict()}


@router.patch("/general")
async def update_general_settings(
    settings_update: GeneralSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update general settings"""
    settings = await get_or_create_settings(db, current_user.id)
    settings.update_from_dict({"general": settings_update.model_dump()})
    await db.commit()
    await db.refresh(settings)
    return {"status": "updated", "general": settings.to_dict()["general"]}


@router.patch("/tracking")
async def update_tracking_settings(
    settings_update: TrackingSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update tracking settings"""
    settings = await get_or_create_settings(db, current_user.id)
    settings.update_from_dict({"tracking": settings_update.model_dump()})
    await db.commit()
    await db.refresh(settings)
    return {"status": "updated", "tracking": settings.to_dict()["tracking"]}


@router.patch("/screenshots")
async def update_screenshot_settings(
    settings_update: ScreenshotSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update screenshot settings"""
    settings = await get_or_create_settings(db, current_user.id)
    settings.update_from_dict({"screenshots": settings_update.model_dump()})
    await db.commit()
    await db.refresh(settings)

    # Update screenshot service with new settings
    from app.services.screenshot_service import screenshot_service
    screenshot_service.update_settings(
        enabled=settings_update.screenshotsEnabled,
        retention_days=settings_update.autoDeleteAfter,
        resolution=settings_update.screenshotResolution,
        format=settings_update.screenshotFormat,
    )

    return {"status": "updated", "screenshots": settings.to_dict()["screenshots"]}


@router.patch("/privacy")
async def update_privacy_settings(
    settings_update: PrivacySettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update privacy settings"""
    settings = await get_or_create_settings(db, current_user.id)
    settings.update_from_dict({"privacy": settings_update.model_dump()})
    await db.commit()
    await db.refresh(settings)
    return {"status": "updated", "privacy": settings.to_dict()["privacy"]}


@router.patch("/notifications")
async def update_notification_settings(
    settings_update: NotificationSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notification settings"""
    settings = await get_or_create_settings(db, current_user.id)
    settings.update_from_dict({"notifications": settings_update.model_dump()})
    await db.commit()
    await db.refresh(settings)
    return {"status": "updated", "notifications": settings.to_dict()["notifications"]}


# ============================================================================
# AI / API Key Endpoints
# ============================================================================

# Note: validate_openai_api_key is now imported from app.core.validators


class APIKeyUpdate(BaseModel):
    api_key: str


class APIKeyTestRequest(BaseModel):
    api_key: str


class AIModelUpdate(BaseModel):
    aiModel: str
    autoAnalysis: bool = True
    analysisFrequency: str = "daily"


@router.post("/api-key")
@limiter.limit(sensitive_rate_limit())
async def set_api_key(
    request: Request,
    data: APIKeyUpdate,
    current_user: User = Depends(get_current_user)
):
    """Set the OpenAI API key securely"""
    # Validate API key format
    is_valid, error_msg = validate_openai_api_key(data.api_key)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    success = set_openai_api_key(data.api_key)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to store API key securely"
        )

    return {
        "status": "success",
        "message": "API key stored securely",
        "masked": f"sk-...{data.api_key[-4:]}"
    }


@router.delete("/api-key")
@limiter.limit(sensitive_rate_limit())
async def remove_api_key(request: Request, current_user: User = Depends(get_current_user)):
    """Remove the stored OpenAI API key"""
    success = delete_api_key("openai_api_key")
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to remove API key"
        )
    return {"status": "success", "message": "API key removed"}


@router.get("/api-key/status")
async def get_api_key_status(current_user: User = Depends(get_current_user)):
    """Check if API key is configured"""
    api_key = get_openai_api_key()
    return {
        "configured": bool(api_key),
        "masked": f"sk-...{api_key[-4:]}" if api_key else None,
    }


@router.get("/api-key/test")
async def test_stored_api_key(current_user: User = Depends(get_current_user)):
    """Test the stored OpenAI API key"""
    api_key = get_openai_api_key()
    if not api_key:
        return {"valid": False, "error": "No API key configured"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            if response.status_code == 200:
                return {"valid": True, "message": "API key is working"}
            elif response.status_code == 401:
                return {"valid": False, "error": "Invalid API key"}
            else:
                return {"valid": False, "error": f"Unexpected response: {response.status_code}"}
    except Exception as e:
        return {"valid": False, "error": str(e)}


@router.post("/api-key/test")
async def test_api_key(data: APIKeyTestRequest):
    """Test an OpenAI API key by making a simple API call"""
    # Validate API key format
    is_valid, error_msg = validate_openai_api_key(data.api_key)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={
                    "Authorization": f"Bearer {data.api_key}",
                },
                timeout=10.0
            )

            if response.status_code == 200:
                return {
                    "status": "success",
                    "message": "API key is valid",
                    "valid": True
                }
            elif response.status_code == 401:
                return {
                    "status": "error",
                    "message": "Invalid API key",
                    "valid": False
                }
            elif response.status_code == 429:
                return {
                    "status": "warning",
                    "message": "Rate limited, but key appears valid",
                    "valid": True
                }
            else:
                return {
                    "status": "error",
                    "message": f"Unexpected response: {response.status_code}",
                    "valid": False
                }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to OpenAI timed out"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to OpenAI: {str(e)}"
        )


@router.patch("/ai")
async def update_ai_settings(
    settings_update: AIModelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update AI model settings (not the API key)"""
    settings = await get_or_create_settings(db, current_user.id)
    settings.update_from_dict({"ai": settings_update.model_dump()})
    await db.commit()
    await db.refresh(settings)
    return {"status": "updated", "ai": settings.to_dict()["ai"]}


# ============================================================================
# Custom Lists Endpoints
# ============================================================================

class CustomListItem(BaseModel):
    pattern: str = Field(..., min_length=1, max_length=200)
    note: Optional[str] = Field(None, max_length=500)

    @field_validator('pattern')
    @classmethod
    def validate_pattern(cls, v: str) -> str:
        v = sanitize_string(v, 200)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v

    @field_validator('note')
    @classmethod
    def sanitize_note(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = sanitize_string(v, 500)
        is_safe, error = check_xss(v)
        if not is_safe:
            raise ValueError(error)
        return v


class CustomListsResponse(BaseModel):
    productive: List[CustomListItem] = Field(default_factory=list, max_length=200)
    distracting: List[CustomListItem] = Field(default_factory=list, max_length=200)
    neutral: List[CustomListItem] = Field(default_factory=list, max_length=200)
    excluded: List[CustomListItem] = Field(default_factory=list, max_length=200)


@router.get("/lists", response_model=CustomListsResponse)
async def get_custom_lists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get custom classification lists"""
    result = await db.execute(
        select(CustomList).where(
            (CustomList.user_id == current_user.id) | (CustomList.user_id == None)
        )
    )
    lists = result.scalars().all()

    # Group by list type
    grouped = {
        "productive": [],
        "distracting": [],
        "neutral": [],
        "excluded": []
    }

    for item in lists:
        if item.list_type in grouped:
            grouped[item.list_type].append(
                CustomListItem(pattern=item.pattern, note=item.note)
            )

    return CustomListsResponse(**grouped)


@router.put("/lists")
async def update_custom_lists(
    lists: CustomListsResponse,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update custom classification lists"""
    # Delete existing user lists
    await db.execute(
        select(CustomList).where(CustomList.user_id == current_user.id)
    )
    result = await db.execute(
        select(CustomList).where(CustomList.user_id == current_user.id)
    )
    existing = result.scalars().all()
    for item in existing:
        await db.delete(item)

    # Add new lists
    for list_type, items in [
        ("productive", lists.productive),
        ("distracting", lists.distracting),
        ("neutral", lists.neutral),
        ("excluded", lists.excluded)
    ]:
        for item in items:
            new_item = CustomList(
                user_id=current_user.id,
                list_type=list_type,
                pattern=item.pattern,
                note=item.note
            )
            db.add(new_item)

    await db.commit()
    return {"status": "updated"}


@router.post("/lists/{list_type}")
async def add_to_list(
    list_type: str,
    item: CustomListItem,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an item to a specific list"""
    valid_types = ["productive", "distracting", "neutral", "excluded"]
    if list_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid list type: {list_type}")

    new_item = CustomList(
        user_id=current_user.id,
        list_type=list_type,
        pattern=item.pattern,
        note=item.note
    )
    db.add(new_item)
    await db.commit()

    return {"status": "added", "list": list_type, "item": item}


@router.delete("/lists/{list_type}/{pattern}")
async def remove_from_list(
    list_type: str,
    pattern: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove an item from a specific list"""
    valid_types = ["productive", "distracting", "neutral", "excluded"]
    if list_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid list type: {list_type}")

    result = await db.execute(
        select(CustomList).where(
            CustomList.user_id == current_user.id,
            CustomList.list_type == list_type,
            CustomList.pattern == pattern
        )
    )
    item = result.scalar_one_or_none()

    if item:
        await db.delete(item)
        await db.commit()

    return {"status": "removed", "list": list_type, "pattern": pattern}


# ============================================================================
# Data Management Endpoints
# ============================================================================

from app.models.activity import Activity, URLActivity, YouTubeActivity
from app.models.screenshot import Screenshot
from fastapi.responses import JSONResponse
from datetime import datetime as dt
import json
import os


@router.get("/export")
@limiter.limit(export_rate_limit())
async def export_all_data(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all user data as JSON"""
    export_data = {
        "exported_at": dt.utcnow().isoformat(),
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
        },
        "settings": {},
        "activities": [],
        "url_activities": [],
        "youtube_activities": [],
    }

    # Get settings
    settings = await get_or_create_settings(db, current_user.id)
    export_data["settings"] = settings.to_dict()

    # Get activities
    result = await db.execute(
        select(Activity).where(Activity.user_id == current_user.id).order_by(Activity.start_time.desc())
    )
    activities = result.scalars().all()
    export_data["activities"] = [
        {
            "id": a.id,
            "app_name": a.app_name,
            "window_title": a.window_title,
            "url": a.url,
            "domain": a.domain,
            "platform": a.platform,
            "start_time": a.start_time.isoformat() if a.start_time else None,
            "end_time": a.end_time.isoformat() if a.end_time else None,
            "duration": a.duration,
            "category": a.category,
            "productivity_score": a.productivity_score,
            "is_productive": a.is_productive,
        }
        for a in activities
    ]

    # Get URL activities
    result = await db.execute(
        select(URLActivity).where(URLActivity.user_id == current_user.id).order_by(URLActivity.timestamp.desc())
    )
    url_activities = result.scalars().all()
    export_data["url_activities"] = [
        {
            "id": u.id,
            "full_url": u.full_url,
            "domain": u.domain,
            "platform": u.platform,
            "page_title": u.page_title,
            "duration": u.duration,
            "timestamp": u.timestamp.isoformat() if u.timestamp else None,
            "category": u.category,
            "is_productive": u.is_productive,
        }
        for u in url_activities
    ]

    # Get YouTube activities
    result = await db.execute(
        select(YouTubeActivity).where(YouTubeActivity.user_id == current_user.id).order_by(YouTubeActivity.timestamp.desc())
    )
    yt_activities = result.scalars().all()
    export_data["youtube_activities"] = [
        {
            "id": y.id,
            "video_id": y.video_id,
            "video_title": y.video_title,
            "channel_name": y.channel_name,
            "watch_duration": y.watch_duration,
            "watch_percentage": y.watch_percentage,
            "timestamp": y.timestamp.isoformat() if y.timestamp else None,
            "video_category": y.video_category,
            "is_productive": y.is_productive,
        }
        for y in yt_activities
    ]

    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=productify_export_{dt.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )


@router.delete("/data")
@limiter.limit("3/hour")  # Very restrictive - data deletion
async def delete_all_data(
    request: Request,
    confirm: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all user activity data"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must confirm deletion with confirm=true"
        )

    deleted_counts = {
        "activities": 0,
        "url_activities": 0,
        "youtube_activities": 0,
    }

    # Delete activities
    result = await db.execute(
        select(Activity).where(Activity.user_id == current_user.id)
    )
    activities = result.scalars().all()
    for a in activities:
        await db.delete(a)
    deleted_counts["activities"] = len(activities)

    # Delete URL activities
    result = await db.execute(
        select(URLActivity).where(URLActivity.user_id == current_user.id)
    )
    url_activities = result.scalars().all()
    for u in url_activities:
        await db.delete(u)
    deleted_counts["url_activities"] = len(url_activities)

    # Delete YouTube activities
    result = await db.execute(
        select(YouTubeActivity).where(YouTubeActivity.user_id == current_user.id)
    )
    yt_activities = result.scalars().all()
    for y in yt_activities:
        await db.delete(y)
    deleted_counts["youtube_activities"] = len(yt_activities)

    await db.commit()

    return {
        "status": "deleted",
        "message": "All activity data has been deleted",
        "deleted": deleted_counts,
    }


@router.delete("/screenshots")
async def delete_all_screenshots(
    confirm: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all screenshots for the current user"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must confirm deletion with confirm=true"
        )

    # Get all screenshots for user
    result = await db.execute(
        select(Screenshot).where(Screenshot.user_id == current_user.id)
    )
    screenshots = result.scalars().all()

    deleted_count = 0
    freed_bytes = 0

    for screenshot in screenshots:
        try:
            # Delete image file
            if screenshot.image_path and os.path.exists(screenshot.image_path):
                freed_bytes += os.path.getsize(screenshot.image_path)
                os.remove(screenshot.image_path)
            # Delete thumbnail file
            if screenshot.thumbnail_path and os.path.exists(screenshot.thumbnail_path):
                freed_bytes += os.path.getsize(screenshot.thumbnail_path)
                os.remove(screenshot.thumbnail_path)

            # Delete from database
            await db.delete(screenshot)
            deleted_count += 1
        except OSError as e:
            print(f"Error deleting screenshot files: {e}")

    await db.commit()

    return {
        "status": "deleted",
        "message": f"Deleted {deleted_count} screenshots",
        "deleted_count": deleted_count,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2),
    }


@router.post("/reset")
async def reset_all_settings(
    confirm: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset all settings to defaults"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must confirm reset with confirm=true"
        )

    # Delete existing settings
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    if settings:
        await db.delete(settings)
        await db.commit()

    # Create new settings with defaults
    new_settings = await get_or_create_settings(db, current_user.id)

    return {"status": "reset", "message": "All settings have been reset to defaults", "settings": new_settings.to_dict()}


# ============================================================================
# Storage Info Endpoint
# ============================================================================

from pathlib import Path
from app.core.config import settings as app_settings


@router.get("/storage")
async def get_storage_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get storage usage information"""

    # Calculate activity data size (estimate based on record count)
    result = await db.execute(
        select(Activity).where(Activity.user_id == current_user.id)
    )
    activities = result.scalars().all()
    activity_count = len(activities)
    # Estimate ~500 bytes per activity record
    activity_data_bytes = activity_count * 500

    result = await db.execute(
        select(URLActivity).where(URLActivity.user_id == current_user.id)
    )
    url_activities = result.scalars().all()
    activity_data_bytes += len(url_activities) * 400

    result = await db.execute(
        select(YouTubeActivity).where(YouTubeActivity.user_id == current_user.id)
    )
    yt_activities = result.scalars().all()
    activity_data_bytes += len(yt_activities) * 600

    # Calculate screenshots storage
    result = await db.execute(
        select(Screenshot).where(Screenshot.user_id == current_user.id)
    )
    screenshots = result.scalars().all()

    screenshots_bytes = 0
    for s in screenshots:
        try:
            if s.image_path and os.path.exists(s.image_path):
                screenshots_bytes += os.path.getsize(s.image_path)
            if s.thumbnail_path and os.path.exists(s.thumbnail_path):
                screenshots_bytes += os.path.getsize(s.thumbnail_path)
        except OSError:
            pass

    # Also check screenshots directory for any orphaned files
    screenshots_path = Path(app_settings.screenshots_path).expanduser()
    if screenshots_path.exists():
        for f in screenshots_path.glob("*.jpg"):
            try:
                screenshots_bytes += f.stat().st_size
            except OSError:
                pass

    activity_data_mb = round(activity_data_bytes / (1024 * 1024), 2)
    screenshots_mb = round(screenshots_bytes / (1024 * 1024), 2)
    total_mb = activity_data_mb + screenshots_mb
    limit_mb = 10240  # 10 GB limit

    return {
        "activity_data_mb": activity_data_mb,
        "screenshots_mb": screenshots_mb,
        "total_mb": total_mb,
        "limit_mb": limit_mb,
        "usage_percent": round((total_mb / limit_mb) * 100, 1) if limit_mb > 0 else 0,
        "activity_count": activity_count,
        "screenshot_count": len(screenshots),
    }


# ============================================================================
# Data Retention Endpoints (GDPR Compliance)
# ============================================================================

from app.services.data_retention_service import data_retention_service


@router.get("/data-stats")
async def get_data_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about stored user data.

    Returns counts and date ranges for all user data types,
    along with current retention settings.
    """
    stats = await data_retention_service.get_user_data_stats(db, current_user.id)
    return stats


@router.post("/cleanup-old-data")
@limiter.limit("1/hour")  # Limited - data deletion operation
async def cleanup_old_data(
    request: Request,
    confirm: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger cleanup of data older than retention period.

    This deletes data that exceeds the user's configured data_retention_days setting.
    Use the /data-stats endpoint first to see what will be affected.
    """
    if not confirm:
        # Return preview of what would be deleted
        stats = await data_retention_service.get_user_data_stats(db, current_user.id)
        return {
            "status": "preview",
            "message": "Add confirm=true to proceed with cleanup",
            "data_stats": stats,
            "warning": "This action is irreversible. Data older than your retention period will be permanently deleted."
        }

    # Perform cleanup
    result = await data_retention_service.cleanup_user_data(db, current_user.id)

    return {
        "status": "completed",
        "message": "Old data cleanup completed",
        "deleted": result,
    }


class DataRetentionUpdate(BaseModel):
    retention_days: int = Field(..., ge=7, le=365, description="Data retention period in days (7-365)")


@router.put("/data-retention")
async def update_data_retention(
    update: DataRetentionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update data retention period.

    Changes how long data is kept before automatic cleanup.
    Minimum is 7 days, maximum is 365 days (1 year).
    """
    settings = await get_or_create_settings(db, current_user.id)
    settings.data_retention_days = update.retention_days
    await db.commit()
    await db.refresh(settings)

    return {
        "status": "updated",
        "retention_days": settings.data_retention_days,
        "message": f"Data retention period set to {settings.data_retention_days} days"
    }


@router.get("/data-retention")
async def get_data_retention(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current data retention settings.
    """
    settings = await get_or_create_settings(db, current_user.id)

    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=settings.data_retention_days)

    return {
        "retention_days": settings.data_retention_days,
        "cutoff_date": cutoff.isoformat(),
        "description": f"Data older than {settings.data_retention_days} days will be eligible for cleanup"
    }
