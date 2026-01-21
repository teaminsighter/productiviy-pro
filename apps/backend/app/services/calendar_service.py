"""
Google Calendar sync service for meeting tracking and deep work analysis
"""
import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.calendar import CalendarConnection, CalendarEvent, CalendarProvider


class GoogleCalendarService:
    """Service for Google Calendar OAuth and sync"""

    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    def __init__(self):
        self.client_id = settings.google_client_id
        self.client_secret = settings.google_client_secret
        self.redirect_uri = settings.google_redirect_uri
        self.scopes = settings.google_calendar_scopes.split()

    def get_authorization_url(self, state: str) -> str:
        """Generate Google OAuth authorization URL"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return f"{self.GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(self, code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access and refresh tokens"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.GOOGLE_TOKEN_URL,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": self.redirect_uri,
                    },
                )
                if response.status_code == 200:
                    return response.json()
                print(f"Token exchange error: {response.text}")
                return None
            except Exception as e:
                print(f"Token exchange exception: {e}")
                return None

    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh an expired access token"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.GOOGLE_TOKEN_URL,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
                if response.status_code == 200:
                    return response.json()
                return None
            except Exception as e:
                print(f"Token refresh exception: {e}")
                return None

    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get Google user info"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if response.status_code == 200:
                    return response.json()
                return None
            except Exception as e:
                print(f"User info exception: {e}")
                return None

    async def get_calendar_list(self, access_token: str) -> List[Dict[str, Any]]:
        """Get list of user's calendars"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GOOGLE_CALENDAR_API}/users/me/calendarList",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("items", [])
                return []
            except Exception as e:
                print(f"Calendar list exception: {e}")
                return []

    async def get_events(
        self,
        access_token: str,
        calendar_id: str = "primary",
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 250,
    ) -> List[Dict[str, Any]]:
        """Get calendar events within a time range"""
        if time_min is None:
            time_min = datetime.utcnow() - timedelta(days=7)
        if time_max is None:
            time_max = datetime.utcnow() + timedelta(days=30)

        params = {
            "timeMin": time_min.isoformat() + "Z",
            "timeMax": time_max.isoformat() + "Z",
            "maxResults": max_results,
            "singleEvents": "true",
            "orderBy": "startTime",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params=params,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("items", [])
                print(f"Events fetch error: {response.text}")
                return []
            except Exception as e:
                print(f"Events fetch exception: {e}")
                return []

    def parse_event(self, event: Dict[str, Any], user_email: str) -> Dict[str, Any]:
        """Parse a Google Calendar event into our format"""
        # Get start/end times
        start = event.get("start", {})
        end = event.get("end", {})

        # Handle all-day events vs timed events
        is_all_day = "date" in start
        if is_all_day:
            start_time = datetime.fromisoformat(start["date"])
            end_time = datetime.fromisoformat(end["date"])
        else:
            start_str = start.get("dateTime", "")
            end_str = end.get("dateTime", "")
            # Handle timezone-aware datetime strings
            start_time = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            end_time = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
            # Convert to naive UTC for storage
            start_time = start_time.replace(tzinfo=None)
            end_time = end_time.replace(tzinfo=None)

        # Calculate duration
        duration_minutes = int((end_time - start_time).total_seconds() / 60)

        # Get attendees
        attendees = event.get("attendees", [])
        attendee_count = len(attendees) if attendees else 1
        organizer = event.get("organizer", {})
        organizer_email = organizer.get("email", "")
        is_organizer = organizer_email == user_email

        # Get my response status
        response_status = "accepted"
        for attendee in attendees:
            if attendee.get("self"):
                response_status = attendee.get("responseStatus", "accepted")
                break

        # Detect meeting URL
        meeting_url = None
        meeting_type = None
        conference_data = event.get("conferenceData", {})
        if conference_data:
            entry_points = conference_data.get("entryPoints", [])
            for ep in entry_points:
                if ep.get("entryPointType") == "video":
                    meeting_url = ep.get("uri")
                    break
            conference_solution = conference_data.get("conferenceSolution", {})
            meeting_type = conference_solution.get("name", "").lower()
            if "meet" in meeting_type:
                meeting_type = "meet"
            elif "zoom" in meeting_type:
                meeting_type = "zoom"
            elif "teams" in meeting_type:
                meeting_type = "teams"

        # Check for other meeting URLs in description/location
        if not meeting_url:
            location = event.get("location", "") or ""
            description = event.get("description", "") or ""
            for text in [location, description]:
                if "zoom.us" in text:
                    meeting_type = "zoom"
                    # Extract zoom URL
                    import re
                    zoom_match = re.search(r'https://[^\s]*zoom\.us/[^\s<>"]+', text)
                    if zoom_match:
                        meeting_url = zoom_match.group(0)
                    break
                elif "meet.google.com" in text:
                    meeting_type = "meet"
                    break
                elif "teams.microsoft.com" in text:
                    meeting_type = "teams"
                    break

        # Check if this is a "Focus Time" block
        summary = event.get("summary", "") or ""
        is_focus_time = any(
            term in summary.lower()
            for term in ["focus time", "focus block", "deep work", "no meetings"]
        )

        return {
            "provider_event_id": event.get("id"),
            "title": summary or "(No title)",
            "description": event.get("description"),
            "location": event.get("location"),
            "start_time": start_time,
            "end_time": end_time,
            "duration_minutes": duration_minutes,
            "is_all_day": is_all_day,
            "timezone": start.get("timeZone", "UTC"),
            "is_recurring": event.get("recurringEventId") is not None,
            "recurrence_rule": event.get("recurrence", [None])[0] if event.get("recurrence") else None,
            "recurring_event_id": event.get("recurringEventId"),
            "attendee_count": attendee_count,
            "attendees": [
                {
                    "email": a.get("email"),
                    "name": a.get("displayName"),
                    "response_status": a.get("responseStatus"),
                }
                for a in attendees
            ],
            "organizer_email": organizer_email,
            "is_organizer": is_organizer,
            "status": event.get("status", "confirmed"),
            "response_status": response_status,
            "meeting_url": meeting_url,
            "meeting_type": meeting_type,
            "is_focus_time": is_focus_time,
            "raw_data": event,
        }


class CalendarSyncService:
    """Service for syncing calendar data to database"""

    def __init__(self):
        self.google_service = GoogleCalendarService()

    async def get_user_connection(
        self, db: AsyncSession, user_id: int, provider: CalendarProvider = CalendarProvider.GOOGLE
    ) -> Optional[CalendarConnection]:
        """Get user's calendar connection"""
        result = await db.execute(
            select(CalendarConnection).where(
                and_(
                    CalendarConnection.user_id == user_id,
                    CalendarConnection.provider == provider,
                    CalendarConnection.is_active == True,
                )
            )
        )
        return result.scalar_one_or_none()

    async def create_connection(
        self,
        db: AsyncSession,
        user_id: int,
        provider: CalendarProvider,
        access_token: str,
        refresh_token: str,
        expires_in: int,
        provider_email: str,
        provider_account_id: Optional[str] = None,
    ) -> CalendarConnection:
        """Create or update a calendar connection"""
        # Check for existing connection
        existing = await self.get_user_connection(db, user_id, provider)

        if existing:
            # Update existing connection
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            existing.provider_email = provider_email
            existing.provider_account_id = provider_account_id
            existing.sync_status = "pending"
            existing.sync_error = None
            await db.commit()
            await db.refresh(existing)
            return existing

        # Create new connection
        connection = CalendarConnection(
            user_id=user_id,
            provider=provider,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            provider_email=provider_email,
            provider_account_id=provider_account_id,
        )
        db.add(connection)
        await db.commit()
        await db.refresh(connection)
        return connection

    async def disconnect(self, db: AsyncSession, user_id: int, provider: CalendarProvider) -> bool:
        """Disconnect a calendar"""
        connection = await self.get_user_connection(db, user_id, provider)
        if not connection:
            return False

        # Delete all events for this connection
        await db.execute(
            delete(CalendarEvent).where(CalendarEvent.calendar_connection_id == connection.id)
        )

        # Delete the connection
        await db.delete(connection)
        await db.commit()
        return True

    async def ensure_valid_token(self, db: AsyncSession, connection: CalendarConnection) -> Optional[str]:
        """Ensure the access token is valid, refresh if needed"""
        if connection.token_expires_at and connection.token_expires_at > datetime.utcnow() + timedelta(minutes=5):
            return connection.access_token

        # Token expired or about to expire, refresh it
        if not connection.refresh_token:
            connection.sync_status = "error"
            connection.sync_error = "No refresh token available"
            await db.commit()
            return None

        tokens = await self.google_service.refresh_access_token(connection.refresh_token)
        if not tokens:
            connection.sync_status = "error"
            connection.sync_error = "Failed to refresh access token"
            await db.commit()
            return None

        # Update tokens
        connection.access_token = tokens.get("access_token")
        if tokens.get("refresh_token"):
            connection.refresh_token = tokens.get("refresh_token")
        connection.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
        await db.commit()

        return connection.access_token

    async def sync_events(
        self,
        db: AsyncSession,
        connection: CalendarConnection,
        days_back: int = 7,
        days_forward: int = 30,
    ) -> Dict[str, Any]:
        """Sync calendar events for a connection"""
        connection.sync_status = "syncing"
        await db.commit()

        # Ensure valid token
        access_token = await self.ensure_valid_token(db, connection)
        if not access_token:
            return {"success": False, "error": "Invalid access token"}

        try:
            time_min = datetime.utcnow() - timedelta(days=days_back)
            time_max = datetime.utcnow() + timedelta(days=days_forward)

            # Fetch events from each calendar
            calendars_to_sync = connection.calendars_to_sync or ["primary"]
            total_synced = 0
            total_created = 0
            total_updated = 0

            for calendar_id in calendars_to_sync:
                events = await self.google_service.get_events(
                    access_token, calendar_id, time_min, time_max
                )

                for event_data in events:
                    # Skip cancelled events
                    if event_data.get("status") == "cancelled":
                        continue

                    parsed = self.google_service.parse_event(event_data, connection.provider_email or "")

                    # Check if event exists
                    result = await db.execute(
                        select(CalendarEvent).where(
                            and_(
                                CalendarEvent.calendar_connection_id == connection.id,
                                CalendarEvent.provider_event_id == parsed["provider_event_id"],
                            )
                        )
                    )
                    existing_event = result.scalar_one_or_none()

                    if existing_event:
                        # Update existing event
                        for key, value in parsed.items():
                            if key != "provider_event_id":
                                setattr(existing_event, key, value)
                        existing_event.synced_at = datetime.utcnow()
                        existing_event.provider_calendar_id = calendar_id
                        total_updated += 1
                    else:
                        # Create new event
                        new_event = CalendarEvent(
                            user_id=connection.user_id,
                            calendar_connection_id=connection.id,
                            provider_calendar_id=calendar_id,
                            **parsed,
                        )
                        db.add(new_event)
                        total_created += 1

                    total_synced += 1

            # Delete old events outside sync range
            await db.execute(
                delete(CalendarEvent).where(
                    and_(
                        CalendarEvent.calendar_connection_id == connection.id,
                        CalendarEvent.start_time < time_min,
                    )
                )
            )

            connection.sync_status = "success"
            connection.sync_error = None
            connection.last_sync_at = datetime.utcnow()
            await db.commit()

            return {
                "success": True,
                "total_synced": total_synced,
                "created": total_created,
                "updated": total_updated,
            }

        except Exception as e:
            connection.sync_status = "error"
            connection.sync_error = str(e)
            await db.commit()
            return {"success": False, "error": str(e)}

    async def get_events_for_date_range(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> List[CalendarEvent]:
        """Get calendar events for a user within a date range"""
        result = await db.execute(
            select(CalendarEvent)
            .where(
                and_(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_time >= start_date,
                    CalendarEvent.start_time < end_date,
                    CalendarEvent.status != "cancelled",
                )
            )
            .order_by(CalendarEvent.start_time)
        )
        return list(result.scalars().all())

    async def get_today_events(self, db: AsyncSession, user_id: int) -> List[CalendarEvent]:
        """Get today's calendar events"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        return await self.get_events_for_date_range(db, user_id, today, tomorrow)

    async def get_week_events(self, db: AsyncSession, user_id: int) -> List[CalendarEvent]:
        """Get this week's calendar events"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=7)
        return await self.get_events_for_date_range(db, user_id, start_of_week, end_of_week)


# Singleton instances
google_calendar_service = GoogleCalendarService()
calendar_sync_service = CalendarSyncService()
