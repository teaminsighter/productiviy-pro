"""
Focus Mode Service
Manages focus sessions, detects calendar gaps, and handles distraction blocking
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload


class FocusBlockStatus(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


@dataclass
class CalendarGap:
    """Represents a gap in the calendar suitable for focus time"""
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    quality_score: int  # 0-100, based on time of day, duration, surrounding meetings


@dataclass
class FocusSuggestion:
    """AI-generated suggestion for a focus block"""
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    reason: str
    priority: str  # high, medium, low
    conflicts: List[str]  # Any potential conflicts


class FocusService:
    """Service for managing focus mode and detecting opportunities"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_settings(self, user_id: int):
        """Get user's focus settings, create if doesn't exist"""
        from app.models import FocusSettings

        result = await self.db.execute(
            select(FocusSettings).where(FocusSettings.user_id == user_id)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            settings = FocusSettings(user_id=user_id)
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)

        return settings

    async def update_settings(self, user_id: int, updates: Dict[str, Any]):
        """Update user's focus settings"""
        settings = await self.get_or_create_settings(user_id)

        for key, value in updates.items():
            if hasattr(settings, key):
                setattr(settings, key, value)

        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def detect_calendar_gaps(
        self,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        min_gap_minutes: int = 30
    ) -> List[CalendarGap]:
        """Find gaps in calendar suitable for focus time"""
        from app.models import CalendarEvent, FocusSettings

        # Get user's work schedule
        settings = await self.get_or_create_settings(user_id)
        work_start = settings.work_start_time  # "09:00"
        work_end = settings.work_end_time  # "18:00"
        work_days = settings.work_days  # [1,2,3,4,5]

        # Get all calendar events in range
        result = await self.db.execute(
            select(CalendarEvent).where(
                and_(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_time >= start_date,
                    CalendarEvent.end_time <= end_date,
                    CalendarEvent.status != "cancelled"
                )
            ).order_by(CalendarEvent.start_time)
        )
        events = result.scalars().all()

        gaps = []
        current_date = start_date.date()

        while current_date <= end_date.date():
            # Skip non-work days
            if current_date.isoweekday() not in work_days:
                current_date += timedelta(days=1)
                continue

            # Parse work hours for this day
            work_start_dt = datetime.combine(
                current_date,
                datetime.strptime(work_start, "%H:%M").time()
            )
            work_end_dt = datetime.combine(
                current_date,
                datetime.strptime(work_end, "%H:%M").time()
            )

            # Get events for this day
            day_events = [
                e for e in events
                if e.start_time.date() == current_date
            ]

            # Find gaps between events
            day_gaps = self._find_gaps_in_day(
                work_start_dt,
                work_end_dt,
                day_events,
                min_gap_minutes
            )
            gaps.extend(day_gaps)

            current_date += timedelta(days=1)

        return gaps

    def _find_gaps_in_day(
        self,
        day_start: datetime,
        day_end: datetime,
        events: List,
        min_gap_minutes: int
    ) -> List[CalendarGap]:
        """Find gaps in a single day"""
        gaps = []

        if not events:
            # Entire day is free
            duration = int((day_end - day_start).total_seconds() / 60)
            if duration >= min_gap_minutes:
                gaps.append(CalendarGap(
                    start_time=day_start,
                    end_time=day_end,
                    duration_minutes=duration,
                    quality_score=self._calculate_gap_quality(day_start, duration)
                ))
            return gaps

        # Sort events by start time
        sorted_events = sorted(events, key=lambda e: e.start_time)

        # Gap before first event
        if sorted_events[0].start_time > day_start:
            gap_duration = int((sorted_events[0].start_time - day_start).total_seconds() / 60)
            if gap_duration >= min_gap_minutes:
                gaps.append(CalendarGap(
                    start_time=day_start,
                    end_time=sorted_events[0].start_time,
                    duration_minutes=gap_duration,
                    quality_score=self._calculate_gap_quality(day_start, gap_duration)
                ))

        # Gaps between events
        for i in range(len(sorted_events) - 1):
            current_end = sorted_events[i].end_time
            next_start = sorted_events[i + 1].start_time

            if next_start > current_end:
                gap_duration = int((next_start - current_end).total_seconds() / 60)
                if gap_duration >= min_gap_minutes:
                    gaps.append(CalendarGap(
                        start_time=current_end,
                        end_time=next_start,
                        duration_minutes=gap_duration,
                        quality_score=self._calculate_gap_quality(current_end, gap_duration)
                    ))

        # Gap after last event
        last_end = sorted_events[-1].end_time
        if last_end < day_end:
            gap_duration = int((day_end - last_end).total_seconds() / 60)
            if gap_duration >= min_gap_minutes:
                gaps.append(CalendarGap(
                    start_time=last_end,
                    end_time=day_end,
                    duration_minutes=gap_duration,
                    quality_score=self._calculate_gap_quality(last_end, gap_duration)
                ))

        return gaps

    def _calculate_gap_quality(self, start_time: datetime, duration_minutes: int) -> int:
        """Calculate quality score for a focus gap (0-100)"""
        score = 50  # Base score

        hour = start_time.hour

        # Morning focus time is best (9-12)
        if 9 <= hour < 12:
            score += 30
        # Early afternoon is okay (13-15)
        elif 13 <= hour < 15:
            score += 15
        # Late afternoon less ideal (15-17)
        elif 15 <= hour < 17:
            score += 5
        # Early morning or evening
        else:
            score -= 10

        # Longer gaps are better
        if duration_minutes >= 120:
            score += 20
        elif duration_minutes >= 90:
            score += 15
        elif duration_minutes >= 60:
            score += 10
        elif duration_minutes >= 45:
            score += 5

        return max(0, min(100, score))

    async def get_focus_suggestions(
        self,
        user_id: int,
        days_ahead: int = 7
    ) -> List[FocusSuggestion]:
        """Generate AI suggestions for focus blocks"""
        now = datetime.now()
        end_date = now + timedelta(days=days_ahead)

        # Get calendar gaps
        gaps = await self.detect_calendar_gaps(
            user_id,
            now,
            end_date,
            min_gap_minutes=30
        )

        # Sort by quality score
        gaps.sort(key=lambda g: g.quality_score, reverse=True)

        suggestions = []
        for gap in gaps[:10]:  # Top 10 suggestions
            priority = "high" if gap.quality_score >= 70 else "medium" if gap.quality_score >= 50 else "low"

            # Generate reason based on gap characteristics
            hour = gap.start_time.hour
            if 9 <= hour < 12:
                reason = "Morning hours are ideal for deep work before meetings"
            elif gap.duration_minutes >= 90:
                reason = f"This {gap.duration_minutes}-minute block is long enough for meaningful deep work"
            elif gap.start_time.date() == now.date():
                reason = "You have time available today for focused work"
            else:
                reason = "Good opportunity for focused work"

            suggestions.append(FocusSuggestion(
                start_time=gap.start_time,
                end_time=gap.end_time,
                duration_minutes=gap.duration_minutes,
                reason=reason,
                priority=priority,
                conflicts=[]
            ))

        return suggestions

    async def create_focus_block(
        self,
        user_id: int,
        start_time: datetime,
        end_time: datetime,
        title: str = "Focus Time",
        blocking_enabled: bool = True,
        sync_to_calendar: bool = False
    ):
        """Create a new focus block"""
        from app.models import FocusBlock, FocusSettings

        settings = await self.get_or_create_settings(user_id)

        duration = int((end_time - start_time).total_seconds() / 60)

        block = FocusBlock(
            user_id=user_id,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration,
            title=title,
            block_type="manual",
            source="user",
            status="scheduled",
            blocking_enabled=blocking_enabled,
            blocked_apps=settings.default_blocked_apps,
            blocked_websites=settings.default_blocked_websites,
            synced_to_calendar=sync_to_calendar
        )

        self.db.add(block)
        await self.db.commit()
        await self.db.refresh(block)

        # If sync_to_calendar, create calendar event
        if sync_to_calendar:
            try:
                await self._create_calendar_event_for_block(user_id, block)
                block.synced_to_calendar = True
                await self.db.commit()
            except Exception as e:
                # Log but don't fail if calendar sync fails
                print(f"Failed to sync focus block to calendar: {e}")

        return block

    async def _create_calendar_event_for_block(self, user_id: int, block) -> bool:
        """Create a calendar event for a focus block"""
        from app.models.calendar import CalendarConnection, CalendarProvider
        from app.services.calendar_service import google_calendar_service, calendar_sync_service
        import httpx

        # Get user's calendar connection
        connection = await calendar_sync_service.get_user_connection(
            self.db, user_id, CalendarProvider.GOOGLE
        )

        if not connection or not connection.is_active:
            return False

        # Ensure we have a valid access token
        access_token = await calendar_sync_service.ensure_valid_token(self.db, connection)
        if not access_token:
            return False

        # Create the calendar event
        event_body = {
            "summary": f"🎯 {block.title}",
            "description": "Focus time block created by Productify Pro. Do not disturb.",
            "start": {
                "dateTime": block.start_time.isoformat(),
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": block.end_time.isoformat(),
                "timeZone": "UTC",
            },
            "colorId": "11",  # Red color for focus time
            "transparency": "opaque",  # Show as busy
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 5},
                ],
            },
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                    json=event_body,
                    timeout=10.0,
                )

                if response.status_code == 200 or response.status_code == 201:
                    event_data = response.json()
                    block.calendar_event_id = event_data.get("id")
                    return True
                else:
                    print(f"Calendar API error: {response.status_code} - {response.text}")
                    return False

        except Exception as e:
            print(f"Failed to create calendar event: {e}")
            return False

    async def start_focus_session(self, user_id: int, block_id: str = None):
        """Start a focus session (either scheduled or ad-hoc)"""
        from app.models import FocusBlock, FocusSettings

        settings = await self.get_or_create_settings(user_id)

        if block_id:
            # Start a scheduled block
            result = await self.db.execute(
                select(FocusBlock).where(
                    and_(
                        FocusBlock.id == block_id,
                        FocusBlock.user_id == user_id
                    )
                )
            )
            block = result.scalar_one_or_none()
            if not block:
                raise ValueError("Focus block not found")
        else:
            # Create ad-hoc focus session
            now = datetime.now()
            end_time = now + timedelta(minutes=settings.focus_duration_minutes)

            block = FocusBlock(
                user_id=user_id,
                start_time=now,
                end_time=end_time,
                duration_minutes=settings.focus_duration_minutes,
                title="Quick Focus",
                block_type="manual",
                source="user",
                blocking_enabled=True,
                blocked_apps=settings.default_blocked_apps,
                blocked_websites=settings.default_blocked_websites,
            )
            self.db.add(block)

        block.status = "active"
        await self.db.commit()
        await self.db.refresh(block)

        return block

    async def end_focus_session(self, user_id: int, block_id: str):
        """End a focus session and calculate stats"""
        from app.models import FocusBlock, FocusSettings

        result = await self.db.execute(
            select(FocusBlock).where(
                and_(
                    FocusBlock.id == block_id,
                    FocusBlock.user_id == user_id
                )
            )
        )
        block = result.scalar_one_or_none()

        if not block:
            raise ValueError("Focus block not found")

        now = datetime.now()

        # Calculate actual focus time
        actual_minutes = int((now - block.start_time).total_seconds() / 60)
        block.completed_minutes = min(actual_minutes, block.duration_minutes)
        block.success_rate = block.completed_minutes / block.duration_minutes if block.duration_minutes > 0 else 0
        block.status = "completed"
        block.end_time = now

        # Update user stats
        settings = await self.get_or_create_settings(user_id)
        settings.total_focus_minutes += block.completed_minutes

        # Update streak
        today = datetime.now().date()
        if settings.last_focus_date:
            last_date = settings.last_focus_date.date()
            if last_date == today - timedelta(days=1):
                settings.current_streak_days += 1
            elif last_date != today:
                settings.current_streak_days = 1
        else:
            settings.current_streak_days = 1

        settings.last_focus_date = datetime.now()
        settings.longest_streak_days = max(settings.longest_streak_days, settings.current_streak_days)

        await self.db.commit()
        await self.db.refresh(block)

        return block

    async def pause_focus_session(self, user_id: int, block_id: str):
        """Pause an active focus session"""
        from app.models import FocusBlock

        result = await self.db.execute(
            select(FocusBlock).where(
                and_(
                    FocusBlock.id == block_id,
                    FocusBlock.user_id == user_id,
                    FocusBlock.status == "active"
                )
            )
        )
        block = result.scalar_one_or_none()

        if not block:
            raise ValueError("Active focus block not found")

        block.status = "paused"
        await self.db.commit()
        await self.db.refresh(block)

        return block

    async def get_active_focus_session(self, user_id: int):
        """Get currently active focus session"""
        from app.models import FocusBlock

        result = await self.db.execute(
            select(FocusBlock).where(
                and_(
                    FocusBlock.user_id == user_id,
                    FocusBlock.status == "active"
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_upcoming_focus_blocks(self, user_id: int, hours_ahead: int = 24):
        """Get scheduled focus blocks"""
        from app.models import FocusBlock

        now = datetime.now()
        end_time = now + timedelta(hours=hours_ahead)

        result = await self.db.execute(
            select(FocusBlock).where(
                and_(
                    FocusBlock.user_id == user_id,
                    FocusBlock.start_time >= now,
                    FocusBlock.start_time <= end_time,
                    FocusBlock.status == "scheduled"
                )
            ).order_by(FocusBlock.start_time)
        )
        return result.scalars().all()

    async def get_focus_stats(self, user_id: int, days: int = 7) -> Dict[str, Any]:
        """Get focus statistics for a user"""
        from app.models import FocusBlock, FocusSettings

        settings = await self.get_or_create_settings(user_id)

        start_date = datetime.now() - timedelta(days=days)

        # Get completed blocks
        result = await self.db.execute(
            select(FocusBlock).where(
                and_(
                    FocusBlock.user_id == user_id,
                    FocusBlock.status == "completed",
                    FocusBlock.start_time >= start_date
                )
            )
        )
        blocks = result.scalars().all()

        total_focus_minutes = sum(b.completed_minutes for b in blocks)
        total_planned_minutes = sum(b.duration_minutes for b in blocks)
        distractions_blocked = sum(b.distractions_blocked for b in blocks)

        # Daily breakdown - collect by date
        daily_stats_dict = {}
        for block in blocks:
            date_key = block.start_time.date().isoformat()
            if date_key not in daily_stats_dict:
                daily_stats_dict[date_key] = {"focus_minutes": 0, "sessions": 0, "distractions_blocked": 0}
            daily_stats_dict[date_key]["focus_minutes"] += block.completed_minutes
            daily_stats_dict[date_key]["sessions"] += 1
            daily_stats_dict[date_key]["distractions_blocked"] += block.distractions_blocked

        # Convert to array format expected by frontend
        daily_stats = [
            {
                "date": date_key,
                "focus_minutes": stats["focus_minutes"],
                "sessions": stats["sessions"],
                "distractions_blocked": stats["distractions_blocked"],
            }
            for date_key, stats in sorted(daily_stats_dict.items())
        ]

        return {
            "period_days": days,
            "total_focus_minutes": total_focus_minutes,
            "total_focus_hours": round(total_focus_minutes / 60, 1),
            "total_sessions": len(blocks),
            "completed_sessions": len([b for b in blocks if b.status == "completed"]),
            "average_session_minutes": round(total_focus_minutes / len(blocks), 1) if blocks else 0,
            "total_distractions_blocked": distractions_blocked,
            "average_success_rate": round(total_focus_minutes / total_planned_minutes * 100, 1) if total_planned_minutes > 0 else 100,
            "current_streak": settings.current_streak_days,
            "longest_streak": settings.longest_streak_days,
            "daily_stats": daily_stats,
        }

    async def record_distraction_blocked(self, user_id: int, block_id: str, app_or_site: str):
        """Record a blocked distraction attempt"""
        from app.models import FocusBlock, FocusSettings

        result = await self.db.execute(
            select(FocusBlock).where(
                and_(
                    FocusBlock.id == block_id,
                    FocusBlock.user_id == user_id
                )
            )
        )
        block = result.scalar_one_or_none()

        if block:
            block.distractions_blocked += 1

        settings = await self.get_or_create_settings(user_id)
        settings.total_distractions_blocked += 1

        await self.db.commit()

    async def check_auto_start_focus(self, user_id: int) -> Optional[Dict]:
        """Check if there's a calendar focus event that should auto-start"""
        from app.models import CalendarEvent, FocusSettings

        settings = await self.get_or_create_settings(user_id)

        if not settings.auto_start_from_calendar:
            return None

        now = datetime.now()
        window_start = now - timedelta(minutes=5)
        window_end = now + timedelta(minutes=5)

        # Look for focus events starting now
        result = await self.db.execute(
            select(CalendarEvent).where(
                and_(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.is_focus_time == True,
                    CalendarEvent.start_time >= window_start,
                    CalendarEvent.start_time <= window_end,
                    CalendarEvent.status == "confirmed"
                )
            )
        )
        event = result.scalar_one_or_none()

        if event:
            return {
                "event_id": event.id,
                "title": event.title,
                "start_time": event.start_time.isoformat(),
                "end_time": event.end_time.isoformat(),
                "duration_minutes": event.duration_minutes,
            }

        return None
