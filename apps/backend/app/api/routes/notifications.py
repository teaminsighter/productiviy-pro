"""
Notification and Onboarding API Routes
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.notifications import (
    Notification,
    NotificationSettings,
    UserProfile,
    NotificationType,
    NotificationPriority,
    UserProfileType,
    COMMON_WORK_APPS,
    PROFILE_DESCRIPTIONS,
)


router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class NotificationAction(BaseModel):
    """Action button for notification"""
    label: str
    action: str  # Action identifier
    primary: bool = False


class NotificationCreate(BaseModel):
    """Create notification request"""
    type: str = NotificationType.INFO.value
    title: str
    message: str
    icon: Optional[str] = None
    actions: Optional[List[NotificationAction]] = None
    priority: str = NotificationPriority.NORMAL.value
    source: Optional[str] = None
    data: Optional[dict] = None
    show_native: bool = False
    expires_at: Optional[datetime] = None


class NotificationResponse(BaseModel):
    """Notification response"""
    id: int
    type: str
    title: str
    message: str
    icon: Optional[str]
    actions: Optional[List[dict]]
    is_read: bool
    is_dismissed: bool
    priority: str
    source: Optional[str]
    data: Optional[dict]
    created_at: datetime
    read_at: Optional[datetime]
    expires_at: Optional[datetime]
    show_native: bool

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    """Update notification settings"""
    notifications_enabled: Optional[bool] = None
    distraction_alerts: Optional[bool] = None
    distraction_threshold_minutes: Optional[int] = None
    goal_notifications: Optional[bool] = None
    streak_notifications: Optional[bool] = None
    focus_reminders: Optional[bool] = None
    break_reminders: Optional[bool] = None
    break_threshold_minutes: Optional[int] = None
    daily_summary: Optional[bool] = None
    daily_summary_time: Optional[str] = None
    weekly_report: Optional[bool] = None
    weekly_report_day: Optional[int] = None
    ai_insights: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    native_notifications: Optional[bool] = None
    sound_enabled: Optional[bool] = None


class NotificationSettingsResponse(BaseModel):
    """Notification settings response"""
    id: int
    notifications_enabled: bool
    distraction_alerts: bool
    distraction_threshold_minutes: int
    goal_notifications: bool
    streak_notifications: bool
    focus_reminders: bool
    break_reminders: bool
    break_threshold_minutes: int
    daily_summary: bool
    daily_summary_time: str
    weekly_report: bool
    weekly_report_day: int
    ai_insights: bool
    quiet_hours_enabled: bool
    quiet_hours_start: str
    quiet_hours_end: str
    native_notifications: bool
    sound_enabled: bool

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """Update user profile"""
    profile_type: Optional[str] = None
    work_apps: Optional[List[str]] = None
    daily_productive_hours: Optional[float] = None
    max_distraction_hours: Optional[float] = None
    ai_enabled: Optional[bool] = None
    openai_api_key: Optional[str] = None
    accessibility_granted: Optional[bool] = None
    screen_recording_granted: Optional[bool] = None
    launch_on_startup: Optional[bool] = None


class UserProfileResponse(BaseModel):
    """User profile response"""
    id: int
    onboarding_completed: bool
    onboarding_completed_at: Optional[datetime]
    onboarding_step: int
    profile_type: str
    work_apps: List[str]
    daily_productive_hours: float
    max_distraction_hours: float
    ai_enabled: bool
    accessibility_granted: bool
    screen_recording_granted: bool
    launch_on_startup: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OnboardingStepData(BaseModel):
    """Data for a specific onboarding step"""
    step: int
    data: dict


class CommonAppsResponse(BaseModel):
    """Common apps for onboarding"""
    apps: List[dict]


class UnreadCountResponse(BaseModel):
    """Unread notification count"""
    count: int


# ============================================================================
# Notification Routes
# ============================================================================

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
    type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List notifications"""
    query = select(Notification).where(Notification.is_dismissed == False)

    if unread_only:
        query = query.where(Notification.is_read == False)

    if type:
        query = query.where(Notification.type == type)

    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    notifications = result.scalars().all()

    return notifications


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(db: AsyncSession = Depends(get_db)):
    """Get unread notification count"""
    query = select(func.count(Notification.id)).where(
        and_(
            Notification.is_read == False,
            Notification.is_dismissed == False
        )
    )
    result = await db.execute(query)
    count = result.scalar() or 0

    return UnreadCountResponse(count=count)


@router.post("/notifications", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new notification"""
    db_notification = Notification(
        type=notification.type,
        title=notification.title,
        message=notification.message,
        icon=notification.icon,
        actions=[a.model_dump() for a in notification.actions] if notification.actions else None,
        priority=notification.priority,
        source=notification.source,
        data=notification.data,
        show_native=notification.show_native,
        expires_at=notification.expires_at,
    )

    db.add(db_notification)
    await db.commit()
    await db.refresh(db_notification)

    return db_notification


@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Mark a notification as read"""
    query = select(Notification).where(Notification.id == notification_id)
    result = await db.execute(query)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    await db.commit()
    await db.refresh(notification)

    return notification


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete (dismiss) a notification"""
    query = select(Notification).where(Notification.id == notification_id)
    result = await db.execute(query)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_dismissed = True
    await db.commit()

    return {"status": "success", "message": "Notification dismissed"}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(db: AsyncSession = Depends(get_db)):
    """Mark all notifications as read"""
    await db.execute(
        update(Notification)
        .where(Notification.is_read == False)
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.commit()

    return {"status": "success", "message": "All notifications marked as read"}


@router.delete("/notifications/clear")
async def clear_all_notifications(db: AsyncSession = Depends(get_db)):
    """Clear all notifications (mark as dismissed)"""
    await db.execute(
        update(Notification)
        .values(is_dismissed=True)
    )
    await db.commit()

    return {"status": "success", "message": "All notifications cleared"}


# ============================================================================
# Notification Settings Routes
# ============================================================================

@router.get("/notifications/settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(db: AsyncSession = Depends(get_db)):
    """Get notification settings"""
    query = select(NotificationSettings)
    result = await db.execute(query)
    settings = result.scalar_one_or_none()

    if not settings:
        # Create default settings
        settings = NotificationSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


@router.put("/notifications/settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    updates: NotificationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update notification settings"""
    query = select(NotificationSettings)
    result = await db.execute(query)
    settings = result.scalar_one_or_none()

    if not settings:
        settings = NotificationSettings()
        db.add(settings)

    # Update only provided fields
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)

    return settings
