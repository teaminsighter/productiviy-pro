"""
Deep Work Score calculation service
Analyzes activity and meeting data to calculate productivity metrics
"""
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from collections import defaultdict

from app.models.calendar import CalendarEvent, DeepWorkScore, FocusBlock
from app.models.activity import Activity


class DeepWorkCalculator:
    """
    Calculates Deep Work Score and related metrics.

    Key Metrics:
    - Deep Work Score (0-100): Overall daily productivity score
    - Deep Work Hours: Hours of uninterrupted productive work
    - Fragmentation Score (0-100): How broken up the day is (lower = better)
    - Meeting Load: Percentage of work hours spent in meetings
    - Longest Focus Block: Longest uninterrupted productive period
    """

    # Configuration
    WORK_START_HOUR = 9  # 9 AM
    WORK_END_HOUR = 18  # 6 PM
    WORK_HOURS = WORK_END_HOUR - WORK_START_HOUR  # 9 hours

    # Thresholds for focus blocks
    MIN_FOCUS_BLOCK_MINUTES = 30  # Minimum time to count as a focus block
    IDEAL_FOCUS_BLOCK_MINUTES = 90  # Ideal focus block length

    # Productivity thresholds
    PRODUCTIVE_THRESHOLD = 0.6  # Activity score >= 0.6 is productive

    async def calculate_daily_score(
        self,
        db: AsyncSession,
        user_id: int,
        target_date: date,
    ) -> DeepWorkScore:
        """Calculate or update the deep work score for a specific day"""

        # Get date range for the day
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())

        # Fetch activities for the day
        activities = await self._get_activities(db, user_id, start_of_day, end_of_day)

        # Fetch meetings for the day
        meetings = await self._get_meetings(db, user_id, start_of_day, end_of_day)

        # Calculate metrics
        metrics = self._calculate_metrics(activities, meetings, start_of_day, end_of_day)

        # Check for existing score
        result = await db.execute(
            select(DeepWorkScore).where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= start_of_day,
                    DeepWorkScore.date < end_of_day,
                )
            )
        )
        existing_score = result.scalar_one_or_none()

        # Get comparison data
        comparisons = await self._calculate_comparisons(db, user_id, target_date, metrics)

        if existing_score:
            # Update existing score
            for key, value in metrics.items():
                setattr(existing_score, key, value)
            for key, value in comparisons.items():
                setattr(existing_score, key, value)
            existing_score.calculated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing_score)
            return existing_score

        # Create new score
        score = DeepWorkScore(
            user_id=user_id,
            date=start_of_day,
            **metrics,
            **comparisons,
        )
        db.add(score)
        await db.commit()
        await db.refresh(score)
        return score

    async def _get_activities(
        self,
        db: AsyncSession,
        user_id: int,
        start_time: datetime,
        end_time: datetime,
    ) -> List[Activity]:
        """Fetch activities for a time range"""
        result = await db.execute(
            select(Activity)
            .where(
                and_(
                    Activity.user_id == user_id,
                    Activity.start_time >= start_time,
                    Activity.start_time < end_time,
                )
            )
            .order_by(Activity.start_time)
        )
        return list(result.scalars().all())

    async def _get_meetings(
        self,
        db: AsyncSession,
        user_id: int,
        start_time: datetime,
        end_time: datetime,
    ) -> List[CalendarEvent]:
        """Fetch meetings for a time range"""
        result = await db.execute(
            select(CalendarEvent)
            .where(
                and_(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_time >= start_time,
                    CalendarEvent.start_time < end_time,
                    CalendarEvent.status != "cancelled",
                    CalendarEvent.is_focus_time == False,
                    CalendarEvent.is_all_day == False,
                )
            )
            .order_by(CalendarEvent.start_time)
        )
        return list(result.scalars().all())

    def _calculate_metrics(
        self,
        activities: List[Activity],
        meetings: List[CalendarEvent],
        start_of_day: datetime,
        end_of_day: datetime,
    ) -> Dict[str, Any]:
        """Calculate all deep work metrics"""

        # Initialize metrics
        metrics = {
            "deep_work_score": 0,
            "deep_work_minutes": 0,
            "total_tracked_minutes": 0,
            "total_meeting_minutes": 0,
            "meeting_count": 0,
            "meeting_load_percent": 0,
            "fragmentation_score": 0,
            "context_switches": 0,
            "longest_focus_block_minutes": 0,
            "average_focus_block_minutes": 0,
            "focus_blocks_count": 0,
            "productive_minutes": 0,
            "neutral_minutes": 0,
            "distracting_minutes": 0,
            "focus_efficiency": 0,
            "work_start_time": None,
            "work_end_time": None,
            "best_focus_hour": None,
        }

        if not activities and not meetings:
            return metrics

        # Calculate meeting metrics
        metrics["meeting_count"] = len(meetings)
        metrics["total_meeting_minutes"] = sum(m.duration_minutes or 0 for m in meetings)

        # Calculate work hours (9 hours default)
        work_minutes = self.WORK_HOURS * 60
        metrics["meeting_load_percent"] = round(
            (metrics["total_meeting_minutes"] / work_minutes) * 100, 1
        ) if work_minutes > 0 else 0

        # Calculate activity metrics
        if activities:
            metrics["work_start_time"] = activities[0].start_time
            metrics["work_end_time"] = activities[-1].end_time or activities[-1].start_time

            for activity in activities:
                duration = activity.duration or 0
                metrics["total_tracked_minutes"] += duration // 60

                score = activity.productivity_score or 0.5
                if score >= self.PRODUCTIVE_THRESHOLD:
                    metrics["productive_minutes"] += duration // 60
                elif score >= 0.4:
                    metrics["neutral_minutes"] += duration // 60
                else:
                    metrics["distracting_minutes"] += duration // 60

            # Count context switches (app changes)
            prev_app = None
            for activity in activities:
                if prev_app and activity.app_name != prev_app:
                    metrics["context_switches"] += 1
                prev_app = activity.app_name

        # Calculate focus blocks (periods of uninterrupted productive work)
        focus_blocks = self._identify_focus_blocks(activities, meetings)
        if focus_blocks:
            metrics["focus_blocks_count"] = len(focus_blocks)
            block_durations = [b["duration_minutes"] for b in focus_blocks]
            metrics["longest_focus_block_minutes"] = max(block_durations)
            metrics["average_focus_block_minutes"] = round(
                sum(block_durations) / len(block_durations), 1
            )
            metrics["deep_work_minutes"] = sum(block_durations)

        # Calculate fragmentation score (0-100, lower is better)
        metrics["fragmentation_score"] = self._calculate_fragmentation(
            activities, meetings, metrics["context_switches"]
        )

        # Calculate focus efficiency
        available_focus_minutes = work_minutes - metrics["total_meeting_minutes"]
        if available_focus_minutes > 0:
            metrics["focus_efficiency"] = round(
                metrics["productive_minutes"] / available_focus_minutes, 2
            )

        # Calculate best focus hour
        if activities:
            metrics["best_focus_hour"] = self._find_best_focus_hour(activities)

        # Calculate overall Deep Work Score (0-100)
        metrics["deep_work_score"] = self._calculate_overall_score(metrics)

        return metrics

    def _identify_focus_blocks(
        self,
        activities: List[Activity],
        meetings: List[CalendarEvent],
    ) -> List[Dict[str, Any]]:
        """
        Identify periods of uninterrupted productive work.
        A focus block is:
        - At least 30 minutes of productive activity
        - Not interrupted by meetings
        - Not interrupted by distracting activities
        """
        if not activities:
            return []

        # Create list of interruptions (meetings + distracting activities)
        interruptions = []
        for meeting in meetings:
            interruptions.append({
                "start": meeting.start_time,
                "end": meeting.end_time,
                "type": "meeting",
            })

        # Sort activities by start time
        sorted_activities = sorted(activities, key=lambda a: a.start_time)

        focus_blocks = []
        current_block_start = None
        current_block_duration = 0

        for activity in sorted_activities:
            is_productive = (activity.productivity_score or 0.5) >= self.PRODUCTIVE_THRESHOLD
            duration_minutes = (activity.duration or 0) // 60

            # Check if activity is during a meeting
            during_meeting = any(
                i["start"] <= activity.start_time < i["end"]
                for i in interruptions
            )

            if is_productive and not during_meeting:
                if current_block_start is None:
                    current_block_start = activity.start_time
                current_block_duration += duration_minutes
            else:
                # End current block if it meets minimum threshold
                if current_block_duration >= self.MIN_FOCUS_BLOCK_MINUTES:
                    focus_blocks.append({
                        "start_time": current_block_start,
                        "duration_minutes": current_block_duration,
                    })
                current_block_start = None
                current_block_duration = 0

        # Don't forget the last block
        if current_block_duration >= self.MIN_FOCUS_BLOCK_MINUTES:
            focus_blocks.append({
                "start_time": current_block_start,
                "duration_minutes": current_block_duration,
            })

        return focus_blocks

    def _calculate_fragmentation(
        self,
        activities: List[Activity],
        meetings: List[CalendarEvent],
        context_switches: int,
    ) -> int:
        """
        Calculate fragmentation score (0-100, lower is better).

        Factors:
        - Number of meetings (more meetings = more fragmented)
        - Context switches (more switches = more fragmented)
        - Average gap between activities
        """
        if not activities:
            return 100  # No data = maximum fragmentation (unknown)

        # Base score starts at 0 (no fragmentation)
        score = 0

        # Meeting penalty: +10 per meeting, capped at 50
        meeting_penalty = min(len(meetings) * 10, 50)
        score += meeting_penalty

        # Context switch penalty: +2 per switch, capped at 30
        switch_penalty = min(context_switches * 2, 30)
        score += switch_penalty

        # Short focus blocks penalty
        focus_blocks = self._identify_focus_blocks(activities, meetings)
        if focus_blocks:
            avg_block = sum(b["duration_minutes"] for b in focus_blocks) / len(focus_blocks)
            # Penalty if average block is less than ideal (90 min)
            if avg_block < self.IDEAL_FOCUS_BLOCK_MINUTES:
                block_penalty = int((1 - avg_block / self.IDEAL_FOCUS_BLOCK_MINUTES) * 20)
                score += block_penalty
        else:
            score += 20  # No focus blocks = high fragmentation

        return min(100, score)

    def _find_best_focus_hour(self, activities: List[Activity]) -> Optional[int]:
        """Find the hour with highest average productivity"""
        if not activities:
            return None

        hourly_scores = defaultdict(list)
        for activity in activities:
            if activity.start_time:
                hour = activity.start_time.hour
                hourly_scores[hour].append(activity.productivity_score or 0.5)

        if not hourly_scores:
            return None

        # Calculate average score per hour
        avg_scores = {
            hour: sum(scores) / len(scores)
            for hour, scores in hourly_scores.items()
        }

        # Return hour with highest average
        return max(avg_scores, key=avg_scores.get)

    def _calculate_overall_score(self, metrics: Dict[str, Any]) -> int:
        """
        Calculate overall Deep Work Score (0-100).

        Weights:
        - 40%: Deep work time (aim for 4+ hours)
        - 25%: Focus efficiency
        - 20%: Low meeting load (aim for <30%)
        - 15%: Low fragmentation
        """
        score = 0

        # Deep work time component (0-40 points)
        # 4 hours = 240 minutes is the target
        deep_work_ratio = min(metrics["deep_work_minutes"] / 240, 1.0)
        score += int(deep_work_ratio * 40)

        # Focus efficiency component (0-25 points)
        score += int(metrics["focus_efficiency"] * 25)

        # Meeting load component (0-20 points)
        # 0% meetings = 20 points, 50%+ meetings = 0 points
        meeting_load = metrics["meeting_load_percent"] / 100
        meeting_score = max(0, (1 - meeting_load * 2)) * 20
        score += int(meeting_score)

        # Fragmentation component (0-15 points)
        # 0 fragmentation = 15 points, 100 fragmentation = 0 points
        fragmentation_score = (1 - metrics["fragmentation_score"] / 100) * 15
        score += int(fragmentation_score)

        return min(100, max(0, score))

    async def _calculate_comparisons(
        self,
        db: AsyncSession,
        user_id: int,
        target_date: date,
        current_metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Calculate comparisons to yesterday, week average, and month average"""
        comparisons = {
            "vs_yesterday": None,
            "vs_week_avg": None,
            "vs_month_avg": None,
        }

        current_score = current_metrics["deep_work_score"]

        # Get yesterday's score
        yesterday = target_date - timedelta(days=1)
        yesterday_start = datetime.combine(yesterday, datetime.min.time())
        yesterday_end = datetime.combine(yesterday, datetime.max.time())

        result = await db.execute(
            select(DeepWorkScore.deep_work_score).where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= yesterday_start,
                    DeepWorkScore.date < yesterday_end,
                )
            )
        )
        yesterday_score = result.scalar_one_or_none()
        if yesterday_score is not None:
            comparisons["vs_yesterday"] = round(
                ((current_score - yesterday_score) / max(yesterday_score, 1)) * 100, 1
            )

        # Get week average
        week_start = datetime.combine(target_date - timedelta(days=7), datetime.min.time())
        result = await db.execute(
            select(func.avg(DeepWorkScore.deep_work_score)).where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= week_start,
                    DeepWorkScore.date < datetime.combine(target_date, datetime.min.time()),
                )
            )
        )
        week_avg = result.scalar_one_or_none()
        if week_avg is not None:
            comparisons["vs_week_avg"] = round(
                ((current_score - week_avg) / max(week_avg, 1)) * 100, 1
            )

        # Get month average
        month_start = datetime.combine(target_date - timedelta(days=30), datetime.min.time())
        result = await db.execute(
            select(func.avg(DeepWorkScore.deep_work_score)).where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= month_start,
                    DeepWorkScore.date < datetime.combine(target_date, datetime.min.time()),
                )
            )
        )
        month_avg = result.scalar_one_or_none()
        if month_avg is not None:
            comparisons["vs_month_avg"] = round(
                ((current_score - month_avg) / max(month_avg, 1)) * 100, 1
            )

        return comparisons

    async def get_score_for_date(
        self,
        db: AsyncSession,
        user_id: int,
        target_date: date,
    ) -> Optional[DeepWorkScore]:
        """Get the deep work score for a specific date"""
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())

        result = await db.execute(
            select(DeepWorkScore).where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= start_of_day,
                    DeepWorkScore.date < end_of_day,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_scores_for_range(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: date,
        end_date: date,
    ) -> List[DeepWorkScore]:
        """Get deep work scores for a date range"""
        start = datetime.combine(start_date, datetime.min.time())
        end = datetime.combine(end_date, datetime.max.time())

        result = await db.execute(
            select(DeepWorkScore)
            .where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= start,
                    DeepWorkScore.date <= end,
                )
            )
            .order_by(DeepWorkScore.date)
        )
        return list(result.scalars().all())

    async def get_weekly_summary(
        self,
        db: AsyncSession,
        user_id: int,
        week_start: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get weekly deep work summary"""
        if week_start is None:
            today = date.today()
            week_start = today - timedelta(days=today.weekday())

        week_end = week_start + timedelta(days=6)
        scores = await self.get_scores_for_range(db, user_id, week_start, week_end)

        if not scores:
            return {
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "avg_deep_work_score": 0,
                "total_deep_work_hours": 0,
                "total_meeting_hours": 0,
                "avg_fragmentation": 0,
                "best_day": None,
                "worst_day": None,
                "days_tracked": 0,
            }

        # Calculate weekly aggregates
        total_deep_work_minutes = sum(s.deep_work_minutes or 0 for s in scores)
        total_meeting_minutes = sum(s.total_meeting_minutes or 0 for s in scores)

        # Find best and worst days
        best_score = max(scores, key=lambda s: s.deep_work_score or 0)
        worst_score = min(scores, key=lambda s: s.deep_work_score or 0)

        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "avg_deep_work_score": round(
                sum(s.deep_work_score or 0 for s in scores) / len(scores), 1
            ),
            "total_deep_work_hours": round(total_deep_work_minutes / 60, 1),
            "total_meeting_hours": round(total_meeting_minutes / 60, 1),
            "avg_fragmentation": round(
                sum(s.fragmentation_score or 0 for s in scores) / len(scores), 1
            ),
            "avg_focus_efficiency": round(
                sum(s.focus_efficiency or 0 for s in scores) / len(scores), 2
            ),
            "best_day": {
                "date": best_score.date.date().isoformat() if best_score.date else None,
                "score": best_score.deep_work_score,
            },
            "worst_day": {
                "date": worst_score.date.date().isoformat() if worst_score.date else None,
                "score": worst_score.deep_work_score,
            },
            "days_tracked": len(scores),
            "daily_scores": [
                {
                    "date": s.date.date().isoformat() if s.date else None,
                    "deep_work_score": s.deep_work_score,
                    "deep_work_hours": round((s.deep_work_minutes or 0) / 60, 1),
                    "meeting_hours": round((s.total_meeting_minutes or 0) / 60, 1),
                    "fragmentation_score": s.fragmentation_score,
                }
                for s in scores
            ],
        }


# Singleton instance
deepwork_calculator = DeepWorkCalculator()
