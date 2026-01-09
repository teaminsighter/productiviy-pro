from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
from pathlib import Path
import os

from app.core.database import get_db
from app.models.screenshot import Screenshot
from app.models.user import User
from app.api.routes.auth import get_current_user_optional
from app.services.screenshot_service import screenshot_service
from app.services.activity_tracker import activity_watch_client
from app.services.classification import classify_activity

router = APIRouter()


class ScreenshotResponse(BaseModel):
    id: str
    timestamp: datetime
    image_path: Optional[str]  # Local path (nullable for cloud storage)
    thumbnail_path: Optional[str]  # Local thumbnail (nullable)
    storage_url: Optional[str] = None  # Firebase URL
    thumbnail_url: Optional[str] = None  # Firebase thumbnail URL
    app_name: Optional[str]
    window_title: Optional[str]
    url: Optional[str]
    category: str
    is_blurred: bool
    productivity_type: str = "neutral"

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ScreenshotResponse])
async def get_screenshots(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    app: Optional[str] = Query(None, description="Filter by app name"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get list of screenshots with optional filters"""
    query = select(Screenshot).where(Screenshot.is_deleted == False).order_by(Screenshot.timestamp.desc())

    # Filter by user_id if authenticated
    if current_user:
        query = query.where(Screenshot.user_id == current_user.id)

    # Apply date filter
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d")
            next_day = filter_date + timedelta(days=1)
            query = query.where(
                and_(
                    Screenshot.timestamp >= filter_date,
                    Screenshot.timestamp < next_day
                )
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Apply app filter
    if app:
        query = query.where(Screenshot.app_name.ilike(f"%{app}%"))

    # Apply category filter
    if category:
        query = query.where(Screenshot.category == category)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    screenshots = result.scalars().all()

    return [
        ScreenshotResponse(
            id=s.id,
            timestamp=s.timestamp,
            image_path=s.image_path,
            thumbnail_path=s.thumbnail_path,
            storage_url=s.storage_url,
            thumbnail_url=s.thumbnail_url,
            app_name=s.app_name,
            window_title=s.window_title,
            url=s.url,
            category=s.category,
            is_blurred=s.is_blurred,
            productivity_type=_get_productivity_type(s.app_name, s.window_title, s.url),
        )
        for s in screenshots
    ]


def _get_productivity_type(app_name: Optional[str], window_title: Optional[str], url: Optional[str]) -> str:
    """Helper to get productivity type for a screenshot"""
    if not app_name:
        return "neutral"
    classification = classify_activity(app_name, window_title or "", url)
    return classification.productivity_type


# These routes MUST come before /{screenshot_id} to avoid route conflicts
@router.get("/files")
async def list_screenshot_files(limit: int = Query(50)):
    """List screenshot files directly from disk (without database)"""
    screenshots_dir = screenshot_service.screenshots_path
    files = []

    if screenshots_dir.exists():
        for f in sorted(screenshots_dir.glob("*.jpg"), key=lambda x: x.stat().st_mtime, reverse=True):
            if "_thumb" not in f.name:
                files.append({
                    "filename": f.name,
                    "path": str(f),
                    "size_kb": round(f.stat().st_size / 1024, 1),
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })
                if len(files) >= limit:
                    break

    return {"screenshots": files, "count": len(files), "directory": str(screenshots_dir)}


@router.get("/files/{filename}")
async def get_screenshot_file(filename: str):
    """Get a screenshot file directly by filename"""
    filepath = screenshot_service.screenshots_path / filename

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Screenshot file not found")

    return FileResponse(filepath, media_type="image/jpeg", filename=filename)


@router.post("/capture/quick")
async def quick_capture():
    """Quick capture without database storage (for testing)"""
    result = await screenshot_service.capture_screenshot()

    if not result:
        raise HTTPException(status_code=500, detail="Failed to capture screenshot")

    return {
        "status": "captured",
        "id": result["id"],
        "timestamp": result["timestamp"],
        "image_path": result["image_path"],
        "thumbnail_path": result.get("thumbnail_path"),
    }


@router.get("/{screenshot_id}", response_model=ScreenshotResponse)
async def get_screenshot(
    screenshot_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific screenshot"""
    result = await db.execute(
        select(Screenshot).where(
            and_(Screenshot.id == screenshot_id, Screenshot.is_deleted == False)
        )
    )
    screenshot = result.scalar_one_or_none()

    if not screenshot:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    return ScreenshotResponse(
        id=screenshot.id,
        timestamp=screenshot.timestamp,
        image_path=screenshot.image_path,
        thumbnail_path=screenshot.thumbnail_path,
        app_name=screenshot.app_name,
        window_title=screenshot.window_title,
        url=screenshot.url,
        category=screenshot.category,
        is_blurred=screenshot.is_blurred,
        productivity_type=_get_productivity_type(screenshot.app_name, screenshot.window_title, screenshot.url),
    )


@router.get("/{screenshot_id}/image")
async def get_screenshot_image(
    screenshot_id: str,
    thumbnail: bool = Query(False, description="Return thumbnail instead"),
    db: AsyncSession = Depends(get_db),
):
    """Get the actual screenshot image file"""
    result = await db.execute(
        select(Screenshot).where(
            and_(Screenshot.id == screenshot_id, Screenshot.is_deleted == False)
        )
    )
    screenshot = result.scalar_one_or_none()

    if not screenshot:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    # Get appropriate path
    if thumbnail and screenshot.thumbnail_path:
        image_path = screenshot.thumbnail_path
    else:
        image_path = screenshot.image_path

    # Check if file exists
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Screenshot file not found")

    return FileResponse(
        image_path,
        media_type="image/jpeg",
        filename=os.path.basename(image_path)
    )


@router.delete("/{screenshot_id}")
async def delete_screenshot(
    screenshot_id: str,
    permanent: bool = Query(False, description="Permanently delete (remove files)"),
    db: AsyncSession = Depends(get_db),
):
    """Delete a screenshot"""
    result = await db.execute(
        select(Screenshot).where(Screenshot.id == screenshot_id)
    )
    screenshot = result.scalar_one_or_none()

    if not screenshot:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    if permanent:
        # Delete files
        try:
            if screenshot.image_path and os.path.exists(screenshot.image_path):
                os.remove(screenshot.image_path)
            if screenshot.thumbnail_path and os.path.exists(screenshot.thumbnail_path):
                os.remove(screenshot.thumbnail_path)
        except OSError as e:
            print(f"Error deleting screenshot files: {e}")

        # Delete from database
        await db.delete(screenshot)
    else:
        # Soft delete
        screenshot.is_deleted = True

    await db.commit()

    return {"status": "deleted", "id": screenshot_id, "permanent": permanent}


@router.post("/capture")
async def capture_screenshot_now(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Capture a screenshot immediately"""
    # Get current activity for metadata
    current_activity = await activity_watch_client.get_current_activity()

    # Capture screenshot with user context
    result = await screenshot_service.capture_screenshot(
        user_id=current_user.id if current_user else None
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to capture screenshot")

    # Classify the activity
    classification = classify_activity(
        current_activity.app_name if current_activity else "Unknown",
        current_activity.window_title if current_activity else "",
        current_activity.url if current_activity else None,
    )

    # Update screenshot metadata in database
    from sqlalchemy import update
    await db.execute(
        update(Screenshot)
        .where(Screenshot.id == result["id"])
        .values(
            app_name=current_activity.app_name if current_activity else None,
            window_title=current_activity.window_title if current_activity else None,
            url=current_activity.url if current_activity else None,
            category=classification.category,
        )
    )
    await db.commit()

    return {
        "status": "captured",
        "id": result["id"],
        "timestamp": result["timestamp"],
        "app_name": current_activity.app_name if current_activity else None,
        "category": classification.category,
        "productivity_type": classification.productivity_type,
    }


class ScreenshotSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    interval_min: Optional[int] = None
    interval_max: Optional[int] = None
    blur_mode: Optional[str] = None
    quality: Optional[int] = None
    excluded_apps: Optional[List[str]] = None


@router.get("/settings/current")
async def get_screenshot_settings():
    """Get current screenshot settings"""
    return {
        "enabled": screenshot_service.enabled,
        "interval_min": screenshot_service.min_interval,
        "interval_max": screenshot_service.max_interval,
        "blur_mode": screenshot_service.blur_mode,
        "quality": screenshot_service.quality,
        "excluded_apps": screenshot_service.excluded_apps,
    }


@router.put("/settings")
async def update_screenshot_settings(
    settings: ScreenshotSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update screenshot capture settings"""
    screenshot_service.update_settings(
        enabled=settings.enabled,
        min_interval=settings.interval_min,
        max_interval=settings.interval_max,
        excluded_apps=settings.excluded_apps,
        blur_mode=settings.blur_mode,
        quality=settings.quality,
    )

    return {
        "status": "updated",
        "settings": {
            "enabled": screenshot_service.enabled,
            "interval_min": screenshot_service.min_interval,
            "interval_max": screenshot_service.max_interval,
            "blur_mode": screenshot_service.blur_mode,
            "quality": screenshot_service.quality,
            "excluded_apps": screenshot_service.excluded_apps,
        }
    }


@router.get("/stats")
async def get_screenshot_stats(
    days: int = Query(7, description="Number of days"),
    db: AsyncSession = Depends(get_db),
):
    """Get screenshot statistics"""
    start = datetime.now() - timedelta(days=days)

    result = await db.execute(
        select(Screenshot).where(
            and_(
                Screenshot.timestamp >= start,
                Screenshot.is_deleted == False
            )
        )
    )
    screenshots = result.scalars().all()

    # Calculate stats
    total_count = len(screenshots)

    # Calculate storage
    total_size = 0
    for s in screenshots:
        try:
            if s.image_path and os.path.exists(s.image_path):
                total_size += os.path.getsize(s.image_path)
            if s.thumbnail_path and os.path.exists(s.thumbnail_path):
                total_size += os.path.getsize(s.thumbnail_path)
        except OSError:
            pass

    # Category breakdown
    categories: dict = {}
    for s in screenshots:
        cat = s.category
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "period_days": days,
        "total_count": total_count,
        "storage_bytes": total_size,
        "storage_mb": round(total_size / (1024 * 1024), 2),
        "categories": categories,
        "daily_average": round(total_count / days, 1) if days > 0 else 0,
    }


@router.delete("/cleanup")
async def cleanup_old_screenshots(
    older_than_days: int = Query(30, description="Delete screenshots older than N days"),
    db: AsyncSession = Depends(get_db),
):
    """Clean up old screenshots"""
    cutoff = datetime.now() - timedelta(days=older_than_days)

    result = await db.execute(
        select(Screenshot).where(Screenshot.timestamp < cutoff)
    )
    old_screenshots = result.scalars().all()

    deleted_count = 0
    freed_bytes = 0

    for screenshot in old_screenshots:
        try:
            # Delete files
            if screenshot.image_path and os.path.exists(screenshot.image_path):
                freed_bytes += os.path.getsize(screenshot.image_path)
                os.remove(screenshot.image_path)
            if screenshot.thumbnail_path and os.path.exists(screenshot.thumbnail_path):
                freed_bytes += os.path.getsize(screenshot.thumbnail_path)
                os.remove(screenshot.thumbnail_path)

            # Delete from database
            await db.delete(screenshot)
            deleted_count += 1
        except OSError as e:
            print(f"Error deleting screenshot: {e}")

    await db.commit()

    return {
        "status": "cleaned",
        "deleted_count": deleted_count,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2),
        "cutoff_date": cutoff.isoformat(),
    }
