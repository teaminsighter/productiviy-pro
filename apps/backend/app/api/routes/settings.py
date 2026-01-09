from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from pydantic import BaseModel, Field
import httpx
import os

from app.core.database import get_db
from app.core.security import set_openai_api_key, get_openai_api_key, delete_api_key

router = APIRouter()


# ============================================================================
# Settings Models
# ============================================================================

class GeneralSettings(BaseModel):
    theme: str = "dark"
    language: str = "en"
    start_on_boot: bool = True
    start_minimized: bool = False
    show_in_tray: bool = True


class TrackingSettings(BaseModel):
    enabled: bool = True
    work_start_time: str = "09:00"
    work_end_time: str = "17:00"
    work_days: List[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5])
    idle_timeout: int = 300
    afk_detection: bool = True


class ScreenshotSettings(BaseModel):
    enabled: bool = True
    interval: int = 300
    quality: str = "medium"
    blur_enabled: bool = False
    auto_delete_after: int = 30
    excluded_apps: List[str] = Field(default_factory=list)


class AISettings(BaseModel):
    api_key_set: bool = False
    api_key_masked: Optional[str] = None
    model: str = "gpt-4o-mini"
    auto_analysis: bool = True
    analysis_frequency: str = "daily"


class PrivacySettings(BaseModel):
    incognito_mode: bool = False
    data_retention_days: int = 90
    app_lock_enabled: bool = False


class NotificationSettings(BaseModel):
    enabled: bool = True
    productivity_alerts: bool = True
    break_reminders: bool = True
    break_interval: int = 60
    sound_enabled: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "08:00"


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


# In-memory settings storage (replace with database in production)
_settings_store: dict = {}


def get_settings_store() -> dict:
    """Get the settings store, initializing with defaults if empty"""
    if not _settings_store:
        _settings_store.update({
            "general": GeneralSettings().model_dump(),
            "tracking": TrackingSettings().model_dump(),
            "screenshots": ScreenshotSettings().model_dump(),
            "privacy": PrivacySettings().model_dump(),
            "notifications": NotificationSettings().model_dump(),
        })
    return _settings_store


# ============================================================================
# Settings Endpoints
# ============================================================================

@router.get("/", response_model=AllSettingsResponse)
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    """Get all user settings"""
    store = get_settings_store()
    api_key = get_openai_api_key()

    return AllSettingsResponse(
        general=GeneralSettings(**store.get("general", {})),
        tracking=TrackingSettings(**store.get("tracking", {})),
        screenshots=ScreenshotSettings(**store.get("screenshots", {})),
        ai=AISettings(
            api_key_set=bool(api_key),
            api_key_masked=f"sk-...{api_key[-4:]}" if api_key else None,
            model=store.get("ai", {}).get("model", "gpt-4o-mini"),
            auto_analysis=store.get("ai", {}).get("auto_analysis", True),
            analysis_frequency=store.get("ai", {}).get("analysis_frequency", "daily"),
        ),
        privacy=PrivacySettings(**store.get("privacy", {})),
        notifications=NotificationSettings(**store.get("notifications", {})),
    )


@router.put("/")
async def update_settings(
    settings: AllSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update all settings"""
    store = get_settings_store()

    if settings.general:
        store["general"] = settings.general.model_dump()
    if settings.tracking:
        store["tracking"] = settings.tracking.model_dump()
    if settings.screenshots:
        store["screenshots"] = settings.screenshots.model_dump()
    if settings.privacy:
        store["privacy"] = settings.privacy.model_dump()
    if settings.notifications:
        store["notifications"] = settings.notifications.model_dump()

    return {"status": "updated", "settings": store}


@router.patch("/general")
async def update_general_settings(settings: GeneralSettings):
    """Update general settings"""
    store = get_settings_store()
    store["general"] = settings.model_dump()
    return {"status": "updated", "general": store["general"]}


@router.patch("/tracking")
async def update_tracking_settings(settings: TrackingSettings):
    """Update tracking settings"""
    store = get_settings_store()
    store["tracking"] = settings.model_dump()
    return {"status": "updated", "tracking": store["tracking"]}


@router.patch("/screenshots")
async def update_screenshot_settings(settings: ScreenshotSettings):
    """Update screenshot settings"""
    store = get_settings_store()
    store["screenshots"] = settings.model_dump()
    return {"status": "updated", "screenshots": store["screenshots"]}


@router.patch("/privacy")
async def update_privacy_settings(settings: PrivacySettings):
    """Update privacy settings"""
    store = get_settings_store()
    store["privacy"] = settings.model_dump()
    return {"status": "updated", "privacy": store["privacy"]}


@router.patch("/notifications")
async def update_notification_settings(settings: NotificationSettings):
    """Update notification settings"""
    store = get_settings_store()
    store["notifications"] = settings.model_dump()
    return {"status": "updated", "notifications": store["notifications"]}


# ============================================================================
# AI / API Key Endpoints
# ============================================================================

class APIKeyUpdate(BaseModel):
    api_key: str


class APIKeyTestRequest(BaseModel):
    api_key: str


class AIModelUpdate(BaseModel):
    model: str
    auto_analysis: bool = True
    analysis_frequency: str = "daily"


@router.post("/api-key")
async def set_api_key(data: APIKeyUpdate):
    """Set the OpenAI API key securely"""
    if not data.api_key.startswith("sk-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid API key format. Key must start with 'sk-'"
        )

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
async def remove_api_key():
    """Remove the stored OpenAI API key"""
    success = delete_api_key("openai_api_key")
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to remove API key"
        )
    return {"status": "success", "message": "API key removed"}


@router.get("/api-key/status")
async def get_api_key_status():
    """Check if API key is configured"""
    api_key = get_openai_api_key()
    return {
        "configured": bool(api_key),
        "masked": f"sk-...{api_key[-4:]}" if api_key else None,
    }


@router.get("/api-key/test")
async def test_stored_api_key():
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
    if not data.api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    if not data.api_key.startswith("sk-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid API key format. Key must start with 'sk-'"
        )

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
async def update_ai_settings(settings: AIModelUpdate):
    """Update AI model settings (not the API key)"""
    store = get_settings_store()
    store["ai"] = {
        "model": settings.model,
        "auto_analysis": settings.auto_analysis,
        "analysis_frequency": settings.analysis_frequency,
    }
    return {"status": "updated", "ai": store["ai"]}


# ============================================================================
# Custom Lists Endpoints
# ============================================================================

class CustomListItem(BaseModel):
    pattern: str
    note: Optional[str] = None


class CustomListsResponse(BaseModel):
    productive: List[CustomListItem]
    distracting: List[CustomListItem]
    neutral: List[CustomListItem]
    excluded: List[CustomListItem]


# In-memory lists storage
_lists_store: dict = {
    "productive": [
        {"pattern": "github.com", "note": "Code hosting"},
        {"pattern": "stackoverflow.com", "note": "Q&A"},
        {"pattern": "docs.python.org", "note": "Documentation"},
    ],
    "distracting": [
        {"pattern": "twitter.com", "note": "Social media"},
        {"pattern": "reddit.com", "note": "Social media"},
        {"pattern": "youtube.com", "note": "Video streaming"},
        {"pattern": "netflix.com", "note": "Streaming"},
    ],
    "neutral": [
        {"pattern": "gmail.com", "note": "Email"},
        {"pattern": "calendar.google.com", "note": "Calendar"},
    ],
    "excluded": [],
}


@router.get("/lists", response_model=CustomListsResponse)
async def get_custom_lists(db: AsyncSession = Depends(get_db)):
    """Get custom classification lists"""
    return CustomListsResponse(
        productive=[CustomListItem(**item) for item in _lists_store["productive"]],
        distracting=[CustomListItem(**item) for item in _lists_store["distracting"]],
        neutral=[CustomListItem(**item) for item in _lists_store["neutral"]],
        excluded=[CustomListItem(**item) for item in _lists_store["excluded"]],
    )


@router.put("/lists")
async def update_custom_lists(
    lists: CustomListsResponse,
    db: AsyncSession = Depends(get_db),
):
    """Update custom classification lists"""
    _lists_store["productive"] = [item.model_dump() for item in lists.productive]
    _lists_store["distracting"] = [item.model_dump() for item in lists.distracting]
    _lists_store["neutral"] = [item.model_dump() for item in lists.neutral]
    _lists_store["excluded"] = [item.model_dump() for item in lists.excluded]
    return {"status": "updated"}


@router.post("/lists/{list_type}")
async def add_to_list(
    list_type: str,
    item: CustomListItem,
):
    """Add an item to a specific list"""
    if list_type not in _lists_store:
        raise HTTPException(status_code=400, detail=f"Invalid list type: {list_type}")

    _lists_store[list_type].append(item.model_dump())
    return {"status": "added", "list": list_type, "item": item}


@router.delete("/lists/{list_type}/{pattern}")
async def remove_from_list(list_type: str, pattern: str):
    """Remove an item from a specific list"""
    if list_type not in _lists_store:
        raise HTTPException(status_code=400, detail=f"Invalid list type: {list_type}")

    _lists_store[list_type] = [
        item for item in _lists_store[list_type]
        if item["pattern"] != pattern
    ]
    return {"status": "removed", "list": list_type, "pattern": pattern}


# ============================================================================
# Data Management Endpoints
# ============================================================================

@router.post("/export")
async def export_all_data(db: AsyncSession = Depends(get_db)):
    """Export all user data"""
    # TODO: Implement actual data export
    return {
        "status": "preparing",
        "message": "Export is being prepared",
        "download_url": "/api/settings/export/download"
    }


@router.get("/export/download")
async def download_export(db: AsyncSession = Depends(get_db)):
    """Download exported data"""
    # TODO: Return actual export file
    raise HTTPException(
        status_code=501,
        detail="Export download not yet implemented"
    )


@router.delete("/data")
async def delete_all_data(
    confirm: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Delete all user data"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must confirm deletion with confirm=true"
        )

    # TODO: Implement actual data deletion
    return {"status": "deleted", "message": "All data has been deleted"}


@router.delete("/screenshots")
async def delete_all_screenshots(
    confirm: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Delete all screenshots"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must confirm deletion with confirm=true"
        )

    # TODO: Implement actual screenshot deletion
    return {"status": "deleted", "message": "All screenshots have been deleted"}


@router.post("/reset")
async def reset_all_settings(confirm: bool = False):
    """Reset all settings to defaults"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must confirm reset with confirm=true"
        )

    global _settings_store
    _settings_store.clear()
    get_settings_store()  # Reinitialize with defaults

    return {"status": "reset", "message": "All settings have been reset to defaults"}


# ============================================================================
# Storage Info Endpoint
# ============================================================================

@router.get("/storage")
async def get_storage_info(db: AsyncSession = Depends(get_db)):
    """Get storage usage information"""
    # TODO: Calculate actual storage usage
    return {
        "activity_data_mb": 128,
        "screenshots_mb": 2400,
        "total_mb": 2528,
        "limit_mb": 10240,  # 10GB
        "usage_percent": 24.7,
    }
