"""
Calendar API routes for Google Calendar integration and meeting tracking
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.config import settings
from app.core.secure_storage import secure_state_storage
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.calendar import CalendarConnection, CalendarEvent, CalendarProvider
from app.services.calendar_service import google_calendar_service, calendar_sync_service


router = APIRouter()


# Pydantic models
class CalendarConnectionResponse(BaseModel):
    id: str
    provider: str
    provider_email: Optional[str]
    is_active: bool
    last_sync_at: Optional[datetime]
    sync_status: str
    sync_error: Optional[str]
    calendars_to_sync: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CalendarEventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    location: Optional[str]
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_all_day: bool
    is_recurring: bool
    attendee_count: int
    organizer_email: Optional[str]
    is_organizer: bool
    status: str
    response_status: str
    meeting_url: Optional[str]
    meeting_type: Optional[str]
    is_focus_time: bool
    meeting_cost: Optional[float]

    class Config:
        from_attributes = True


class CalendarListResponse(BaseModel):
    id: str
    summary: str
    primary: bool
    access_role: str


class MeetingStatsResponse(BaseModel):
    total_meetings: int
    total_meeting_hours: float
    avg_meeting_duration: float
    meetings_as_organizer: int
    meetings_declined: int
    focus_time_blocks: int
    busiest_day: Optional[str]
    meeting_free_hours: float


class SyncCalendarsRequest(BaseModel):
    calendar_ids: List[str]


# Routes

@router.get("/connect/google")
async def connect_google_calendar(
    current_user: User = Depends(get_current_user),
):
    """
    Initiate Google Calendar OAuth flow.
    Returns the authorization URL to redirect the user to.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar integration not configured"
        )

    # Create secure state token with 10 minute expiry
    state = await secure_state_storage.create_state(
        user_id=current_user.id,
        extra_data={"provider": "google_calendar"},
        ttl=600
    )

    auth_url = google_calendar_service.get_authorization_url(state)

    return {"authorization_url": auth_url}


@router.get("/callback")
async def google_calendar_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Google OAuth callback.
    This is called by Google after user authorizes the app.
    """
    # Verify and consume state token
    state_data = await secure_state_storage.verify_state(state)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state"
        )

    user_id = state_data["user_id"]

    # Exchange code for tokens
    tokens = await google_calendar_service.exchange_code_for_tokens(code)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code for tokens"
        )

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No access token received"
        )

    # Get user info
    user_info = await google_calendar_service.get_user_info(access_token)
    provider_email = user_info.get("email") if user_info else None
    provider_account_id = user_info.get("id") if user_info else None

    # Create or update connection
    connection = await calendar_sync_service.create_connection(
        db=db,
        user_id=user_id,
        provider=CalendarProvider.GOOGLE,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        provider_email=provider_email,
        provider_account_id=provider_account_id,
    )

    # Redirect to frontend with success
    frontend_url = settings.frontend_url
    return RedirectResponse(
        url=f"{frontend_url}/settings?calendar=connected",
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/connection", response_model=Optional[CalendarConnectionResponse])
async def get_calendar_connection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's calendar connection status"""
    connection = await calendar_sync_service.get_user_connection(
        db, current_user.id, CalendarProvider.GOOGLE
    )
    if not connection:
        return None
    return CalendarConnectionResponse.model_validate(connection)


@router.delete("/connection")
async def disconnect_calendar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect Google Calendar"""
    success = await calendar_sync_service.disconnect(
        db, current_user.id, CalendarProvider.GOOGLE
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No calendar connection found"
        )
    return {"message": "Calendar disconnected successfully"}


@router.get("/calendars", response_model=List[CalendarListResponse])
async def list_calendars(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List available calendars from connected account"""
    connection = await calendar_sync_service.get_user_connection(
        db, current_user.id, CalendarProvider.GOOGLE
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No calendar connection found"
        )

    # Ensure valid token
    access_token = await calendar_sync_service.ensure_valid_token(db, connection)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Calendar access token expired"
        )

    calendars = await google_calendar_service.get_calendar_list(access_token)

    return [
        CalendarListResponse(
            id=cal.get("id", ""),
            summary=cal.get("summary", "Unknown"),
            primary=cal.get("primary", False),
            access_role=cal.get("accessRole", "reader"),
        )
        for cal in calendars
    ]


@router.post("/calendars/select")
async def select_calendars_to_sync(
    request: SyncCalendarsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Select which calendars to sync"""
    connection = await calendar_sync_service.get_user_connection(
        db, current_user.id, CalendarProvider.GOOGLE
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No calendar connection found"
        )

    connection.calendars_to_sync = request.calendar_ids
    await db.commit()

    return {"message": "Calendars selected successfully", "calendars": request.calendar_ids}


@router.post("/sync")
async def sync_calendar(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger calendar sync"""
    connection = await calendar_sync_service.get_user_connection(
        db, current_user.id, CalendarProvider.GOOGLE
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No calendar connection found"
        )

    # Sync events
    result = await calendar_sync_service.sync_events(db, connection)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Sync failed")
        )

    return {
        "message": "Calendar synced successfully",
        "events_synced": result.get("total_synced", 0),
        "created": result.get("created", 0),
        "updated": result.get("updated", 0),
    }


@router.get("/events", response_model=List[CalendarEventResponse])
async def get_calendar_events(
    start_date: Optional[date] = Query(None, description="Start date (default: today)"),
    end_date: Optional[date] = Query(None, description="End date (default: 7 days from start)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get calendar events for a date range"""
    if start_date is None:
        start_date = date.today()
    if end_date is None:
        end_date = start_date + timedelta(days=7)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    events = await calendar_sync_service.get_events_for_date_range(
        db, current_user.id, start_datetime, end_datetime
    )

    return [CalendarEventResponse.model_validate(e) for e in events]


@router.get("/events/today", response_model=List[CalendarEventResponse])
async def get_today_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's calendar events"""
    events = await calendar_sync_service.get_today_events(db, current_user.id)
    return [CalendarEventResponse.model_validate(e) for e in events]


@router.get("/events/week", response_model=List[CalendarEventResponse])
async def get_week_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get this week's calendar events"""
    events = await calendar_sync_service.get_week_events(db, current_user.id)
    return [CalendarEventResponse.model_validate(e) for e in events]


@router.get("/stats", response_model=MeetingStatsResponse)
async def get_meeting_stats(
    start_date: Optional[date] = Query(None, description="Start date (default: start of week)"),
    end_date: Optional[date] = Query(None, description="End date (default: end of week)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get meeting statistics for a date range"""
    if start_date is None:
        today = date.today()
        start_date = today - timedelta(days=today.weekday())
    if end_date is None:
        end_date = start_date + timedelta(days=6)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    events = await calendar_sync_service.get_events_for_date_range(
        db, current_user.id, start_datetime, end_datetime
    )

    # Filter to actual meetings (not focus time, not all-day)
    meetings = [e for e in events if not e.is_focus_time and not e.is_all_day]
    focus_blocks = [e for e in events if e.is_focus_time]

    if not meetings:
        return MeetingStatsResponse(
            total_meetings=0,
            total_meeting_hours=0,
            avg_meeting_duration=0,
            meetings_as_organizer=0,
            meetings_declined=0,
            focus_time_blocks=len(focus_blocks),
            busiest_day=None,
            meeting_free_hours=0,
        )

    # Calculate stats
    total_minutes = sum(m.duration_minutes or 0 for m in meetings)
    organizer_count = sum(1 for m in meetings if m.is_organizer)
    declined_count = sum(1 for m in meetings if m.response_status == "declined")

    # Find busiest day
    from collections import Counter
    day_counts = Counter(m.start_time.strftime("%A") for m in meetings)
    busiest_day = day_counts.most_common(1)[0][0] if day_counts else None

    # Calculate meeting-free hours (work hours - meeting hours)
    work_days = (end_date - start_date).days + 1
    work_hours = work_days * 8  # Assume 8-hour work days
    meeting_hours = total_minutes / 60
    meeting_free_hours = max(0, work_hours - meeting_hours)

    return MeetingStatsResponse(
        total_meetings=len(meetings),
        total_meeting_hours=round(meeting_hours, 1),
        avg_meeting_duration=round(total_minutes / len(meetings), 0),
        meetings_as_organizer=organizer_count,
        meetings_declined=declined_count,
        focus_time_blocks=len(focus_blocks),
        busiest_day=busiest_day,
        meeting_free_hours=round(meeting_free_hours, 1),
    )


@router.patch("/events/{event_id}/focus")
async def mark_as_focus_time(
    event_id: str,
    is_focus: bool = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a calendar event as focus time (or unmark)"""
    from sqlalchemy import select, and_

    result = await db.execute(
        select(CalendarEvent).where(
            and_(
                CalendarEvent.id == event_id,
                CalendarEvent.user_id == current_user.id,
            )
        )
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event.is_focus_time = is_focus
    await db.commit()

    return {"message": f"Event {'marked' if is_focus else 'unmarked'} as focus time"}
