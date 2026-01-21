"""
Team Deep Work Service

Handles team-level deep work metrics, alerts, and scheduling intelligence.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
import uuid

from app.models import (
    Team,
    TeamMember,
    DeepWorkScore,
    TeamDeepWorkScore,
    TeamMeetingFreeZone,
    TeamManagerAlert,
    TeamSchedulingSuggestion,
    CalendarEvent,
    AlertType,
    AlertPriority,
)
from app.models.user import User


# ═══════════════════════════════════════════════════════════════════════════
# THRESHOLDS
# ═══════════════════════════════════════════════════════════════════════════

MEETING_LOAD_WARNING = 40  # % - Show warning
MEETING_LOAD_CRITICAL = 60  # % - Critical alert
FOCUS_DEFICIT_WARNING = 60  # minutes - Less than 1hr deep work
FOCUS_DEFICIT_CRITICAL = 30  # minutes - Less than 30min deep work
DEEP_WORK_TARGET = 120  # minutes - 2 hours daily target
FRAGMENTATION_WARNING = 70  # Score above this is concerning


class TeamDeepWorkService:
    """Service for team deep work analytics and insights"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ═══════════════════════════════════════════════════════════════════
    # TEAM METRICS CALCULATION
    # ═══════════════════════════════════════════════════════════════════

    async def calculate_team_score(
        self,
        team_id: int,
        date: datetime
    ) -> TeamDeepWorkScore:
        """Calculate aggregated deep work score for a team on a specific date"""

        # Get team members
        members_result = await self.db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.share_activity == True
                )
            )
        )
        members = members_result.scalars().all()
        member_ids = [m.user_id for m in members]

        if not member_ids:
            return await self._create_empty_team_score(team_id, date)

        # Get individual deep work scores for the date
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        scores_result = await self.db.execute(
            select(DeepWorkScore).where(
                and_(
                    DeepWorkScore.user_id.in_(member_ids),
                    DeepWorkScore.date >= start_of_day,
                    DeepWorkScore.date < end_of_day
                )
            )
        )
        scores = scores_result.scalars().all()

        if not scores:
            return await self._create_empty_team_score(team_id, date)

        # Calculate aggregated metrics
        member_count = len(scores)
        total_deep_work = sum(s.deep_work_minutes for s in scores)
        total_meetings = sum(s.total_meeting_minutes for s in scores)
        total_productive = sum(s.productive_minutes for s in scores)
        total_distracting = sum(s.distracting_minutes for s in scores)

        avg_deep_work_score = sum(s.deep_work_score for s in scores) / member_count
        avg_deep_work_minutes = total_deep_work / member_count
        avg_meeting_minutes = total_meetings / member_count
        avg_meeting_load = sum(s.meeting_load_percent for s in scores) / member_count
        avg_fragmentation = sum(s.fragmentation_score for s in scores) / member_count
        avg_context_switches = sum(s.context_switches for s in scores) / member_count
        avg_longest_focus = sum(s.longest_focus_block_minutes for s in scores) / member_count
        avg_focus_efficiency = sum(s.focus_efficiency for s in scores) / member_count

        # Count members in different categories
        over_meeting = sum(1 for s in scores if s.meeting_load_percent > MEETING_LOAD_WARNING)
        with_deep_work = sum(1 for s in scores if s.deep_work_minutes >= DEEP_WORK_TARGET)
        needs_attention = sum(1 for s in scores if s.deep_work_score < 30)

        # Find top performer
        top_score = max(scores, key=lambda s: s.deep_work_score)
        top_performer_id = top_score.user_id

        # Calculate score distribution
        score_distribution = self._calculate_distribution(
            [s.deep_work_score for s in scores],
            [0, 20, 40, 60, 80, 100]
        )
        meeting_distribution = self._calculate_distribution(
            [s.meeting_load_percent for s in scores],
            [0, 20, 40, 60, 80, 100]
        )

        # Get yesterday's score for comparison
        yesterday = start_of_day - timedelta(days=1)
        yesterday_score = await self._get_team_score_for_date(team_id, yesterday)
        vs_yesterday = None
        if yesterday_score:
            vs_yesterday = ((avg_deep_work_score - yesterday_score.avg_deep_work_score)
                           / yesterday_score.avg_deep_work_score * 100
                           if yesterday_score.avg_deep_work_score > 0 else 0)

        # Calculate trend direction
        trend = "stable"
        if vs_yesterday:
            if vs_yesterday > 5:
                trend = "improving"
            elif vs_yesterday < -5:
                trend = "declining"

        # Check if score already exists
        existing = await self._get_team_score_for_date(team_id, start_of_day)

        if existing:
            # Update existing
            existing.avg_deep_work_score = avg_deep_work_score
            existing.total_deep_work_minutes = total_deep_work
            existing.avg_deep_work_minutes = avg_deep_work_minutes
            existing.total_meeting_minutes = total_meetings
            existing.avg_meeting_minutes = avg_meeting_minutes
            existing.avg_meeting_load_percent = avg_meeting_load
            existing.total_meeting_count = sum(s.meeting_count for s in scores)
            existing.avg_fragmentation_score = avg_fragmentation
            existing.avg_context_switches = avg_context_switches
            existing.avg_longest_focus_block = avg_longest_focus
            existing.total_productive_minutes = total_productive
            existing.total_distracting_minutes = total_distracting
            existing.avg_focus_efficiency = avg_focus_efficiency
            existing.member_count = member_count
            existing.members_over_meeting_threshold = over_meeting
            existing.members_with_deep_work = with_deep_work
            existing.top_performer_id = top_performer_id
            existing.needs_attention_count = needs_attention
            existing.score_distribution = score_distribution
            existing.meeting_load_distribution = meeting_distribution
            existing.vs_yesterday = vs_yesterday
            existing.trend_direction = trend
            existing.calculated_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(existing)
            return existing
        else:
            # Create new
            team_score = TeamDeepWorkScore(
                team_id=team_id,
                date=start_of_day,
                avg_deep_work_score=avg_deep_work_score,
                total_deep_work_minutes=total_deep_work,
                avg_deep_work_minutes=avg_deep_work_minutes,
                total_meeting_minutes=total_meetings,
                avg_meeting_minutes=avg_meeting_minutes,
                avg_meeting_load_percent=avg_meeting_load,
                total_meeting_count=sum(s.meeting_count for s in scores),
                avg_fragmentation_score=avg_fragmentation,
                avg_context_switches=avg_context_switches,
                avg_longest_focus_block=avg_longest_focus,
                total_productive_minutes=total_productive,
                total_distracting_minutes=total_distracting,
                avg_focus_efficiency=avg_focus_efficiency,
                member_count=member_count,
                members_over_meeting_threshold=over_meeting,
                members_with_deep_work=with_deep_work,
                top_performer_id=top_performer_id,
                needs_attention_count=needs_attention,
                score_distribution=score_distribution,
                meeting_load_distribution=meeting_distribution,
                vs_yesterday=vs_yesterday,
                trend_direction=trend,
            )

            self.db.add(team_score)
            await self.db.commit()
            await self.db.refresh(team_score)
            return team_score

    async def get_team_dashboard_data(
        self,
        team_id: int,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get comprehensive team dashboard data"""

        end_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = end_date - timedelta(days=days)

        # Get team scores for the period
        scores_result = await self.db.execute(
            select(TeamDeepWorkScore).where(
                and_(
                    TeamDeepWorkScore.team_id == team_id,
                    TeamDeepWorkScore.date >= start_date
                )
            ).order_by(TeamDeepWorkScore.date.desc())
        )
        scores = scores_result.scalars().all()

        # Get latest score
        latest = scores[0] if scores else None

        # Calculate period averages
        if scores:
            period_avg_score = sum(s.avg_deep_work_score for s in scores) / len(scores)
            period_avg_meetings = sum(s.avg_meeting_minutes for s in scores) / len(scores)
            period_avg_deep_work = sum(s.avg_deep_work_minutes for s in scores) / len(scores)
        else:
            period_avg_score = 0
            period_avg_meetings = 0
            period_avg_deep_work = 0

        # Get member breakdown
        members_data = await self._get_member_breakdown(team_id, days)

        # Get active alerts
        alerts = await self.get_active_alerts(team_id)

        # Get meeting-free zones
        zones = await self.get_meeting_free_zones(team_id)

        return {
            "summary": {
                "avg_deep_work_score": round(latest.avg_deep_work_score if latest else 0, 1),
                "avg_deep_work_minutes": round(latest.avg_deep_work_minutes if latest else 0),
                "avg_meeting_load": round(latest.avg_meeting_load_percent if latest else 0, 1),
                "member_count": latest.member_count if latest else 0,
                "members_with_deep_work": latest.members_with_deep_work if latest else 0,
                "members_over_meeting": latest.members_over_meeting_threshold if latest else 0,
                "needs_attention": latest.needs_attention_count if latest else 0,
                "trend": latest.trend_direction if latest else "stable",
                "vs_yesterday": round(latest.vs_yesterday if latest and latest.vs_yesterday else 0, 1),
            },
            "period_stats": {
                "days": days,
                "avg_score": round(period_avg_score, 1),
                "avg_deep_work_minutes": round(period_avg_deep_work),
                "avg_meeting_minutes": round(period_avg_meetings),
            },
            "daily_scores": [
                {
                    "date": s.date.isoformat(),
                    "score": round(s.avg_deep_work_score, 1),
                    "deep_work_minutes": round(s.avg_deep_work_minutes),
                    "meeting_minutes": round(s.avg_meeting_minutes),
                    "member_count": s.member_count,
                }
                for s in reversed(scores)
            ],
            "distributions": {
                "score": latest.score_distribution if latest else {},
                "meeting_load": latest.meeting_load_distribution if latest else {},
            },
            "members": members_data,
            "alerts": [
                {
                    "id": a.id,
                    "type": a.alert_type.value,
                    "priority": a.priority.value,
                    "title": a.title,
                    "message": a.message,
                    "target_user_id": a.target_user_id,
                    "suggestion": a.suggestion,
                    "created_at": a.created_at.isoformat(),
                }
                for a in alerts[:5]  # Top 5 alerts
            ],
            "meeting_free_zones": [
                {
                    "id": z.id,
                    "name": z.name,
                    "start_time": z.start_time,
                    "end_time": z.end_time,
                    "days": z.days_of_week,
                    "is_enforced": z.is_enforced,
                }
                for z in zones
            ],
        }

    # ═══════════════════════════════════════════════════════════════════
    # MANAGER ALERTS
    # ═══════════════════════════════════════════════════════════════════

    async def generate_alerts(self, team_id: int) -> List[TeamManagerAlert]:
        """Generate alerts based on team metrics"""

        alerts = []
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Get latest team score
        team_score = await self._get_team_score_for_date(team_id, today)
        if not team_score:
            return alerts

        # Get individual member scores
        members_result = await self.db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.share_activity == True
                )
            )
        )
        members = members_result.scalars().all()

        for member in members:
            member_score = await self._get_member_score(member.user_id, today)
            if not member_score:
                continue

            # Over-meeting alert
            if member_score.meeting_load_percent >= MEETING_LOAD_CRITICAL:
                alert = await self._create_alert_if_not_exists(
                    team_id=team_id,
                    target_user_id=member.user_id,
                    alert_type=AlertType.OVER_MEETING,
                    priority=AlertPriority.HIGH,
                    title="Critical Meeting Overload",
                    message=f"Member has {round(member_score.meeting_load_percent)}% meeting load today",
                    metric_name="meeting_load_percent",
                    metric_value=member_score.meeting_load_percent,
                    threshold_value=MEETING_LOAD_CRITICAL,
                    suggestion="Consider declining non-essential meetings or moving them to async"
                )
                if alert:
                    alerts.append(alert)

            elif member_score.meeting_load_percent >= MEETING_LOAD_WARNING:
                alert = await self._create_alert_if_not_exists(
                    team_id=team_id,
                    target_user_id=member.user_id,
                    alert_type=AlertType.OVER_MEETING,
                    priority=AlertPriority.MEDIUM,
                    title="High Meeting Load",
                    message=f"Member has {round(member_score.meeting_load_percent)}% meeting load today",
                    metric_name="meeting_load_percent",
                    metric_value=member_score.meeting_load_percent,
                    threshold_value=MEETING_LOAD_WARNING,
                    suggestion="Review tomorrow's calendar for opportunities to batch meetings"
                )
                if alert:
                    alerts.append(alert)

            # Focus deficit alert
            if member_score.deep_work_minutes <= FOCUS_DEFICIT_CRITICAL:
                alert = await self._create_alert_if_not_exists(
                    team_id=team_id,
                    target_user_id=member.user_id,
                    alert_type=AlertType.FOCUS_DEFICIT,
                    priority=AlertPriority.HIGH,
                    title="Critical Focus Deficit",
                    message=f"Only {member_score.deep_work_minutes} minutes of deep work today",
                    metric_name="deep_work_minutes",
                    metric_value=member_score.deep_work_minutes,
                    threshold_value=FOCUS_DEFICIT_CRITICAL,
                    suggestion="Block 2 hours of focus time on the calendar for tomorrow"
                )
                if alert:
                    alerts.append(alert)

        # Team-wide alerts
        if team_score.avg_meeting_load_percent >= MEETING_LOAD_WARNING:
            alert = await self._create_alert_if_not_exists(
                team_id=team_id,
                target_user_id=None,
                alert_type=AlertType.TEAM_TREND,
                priority=AlertPriority.HIGH,
                title="Team Meeting Overload",
                message=f"Team average meeting load is {round(team_score.avg_meeting_load_percent)}%",
                metric_name="avg_meeting_load_percent",
                metric_value=team_score.avg_meeting_load_percent,
                threshold_value=MEETING_LOAD_WARNING,
                suggestion="Consider establishing meeting-free focus hours for the team"
            )
            if alert:
                alerts.append(alert)

        return alerts

    async def get_active_alerts(self, team_id: int) -> List[TeamManagerAlert]:
        """Get active (unread, not dismissed) alerts for a team"""
        result = await self.db.execute(
            select(TeamManagerAlert).where(
                and_(
                    TeamManagerAlert.team_id == team_id,
                    TeamManagerAlert.is_dismissed == False,
                    or_(
                        TeamManagerAlert.expires_at == None,
                        TeamManagerAlert.expires_at > datetime.utcnow()
                    )
                )
            ).order_by(
                TeamManagerAlert.priority.desc(),
                TeamManagerAlert.created_at.desc()
            )
        )
        return result.scalars().all()

    async def dismiss_alert(self, alert_id: str, team_id: int) -> bool:
        """Dismiss an alert"""
        result = await self.db.execute(
            select(TeamManagerAlert).where(
                and_(
                    TeamManagerAlert.id == alert_id,
                    TeamManagerAlert.team_id == team_id
                )
            )
        )
        alert = result.scalar_one_or_none()
        if alert:
            alert.is_dismissed = True
            alert.dismissed_at = datetime.utcnow()
            await self.db.commit()
            return True
        return False

    # ═══════════════════════════════════════════════════════════════════
    # MEETING-FREE ZONES
    # ═══════════════════════════════════════════════════════════════════

    async def create_meeting_free_zone(
        self,
        team_id: int,
        created_by: int,
        name: str,
        start_time: str,
        end_time: str,
        days_of_week: List[int],
        is_enforced: bool = False,
    ) -> TeamMeetingFreeZone:
        """Create a meeting-free zone for the team"""

        zone = TeamMeetingFreeZone(
            team_id=team_id,
            created_by=created_by,
            name=name,
            start_time=start_time,
            end_time=end_time,
            days_of_week=days_of_week,
            is_enforced=is_enforced,
        )

        self.db.add(zone)
        await self.db.commit()
        await self.db.refresh(zone)
        return zone

    async def get_meeting_free_zones(self, team_id: int) -> List[TeamMeetingFreeZone]:
        """Get all meeting-free zones for a team"""
        result = await self.db.execute(
            select(TeamMeetingFreeZone).where(
                and_(
                    TeamMeetingFreeZone.team_id == team_id,
                    TeamMeetingFreeZone.is_active == True
                )
            )
        )
        return result.scalars().all()

    async def delete_meeting_free_zone(self, zone_id: str, team_id: int) -> bool:
        """Delete a meeting-free zone"""
        result = await self.db.execute(
            select(TeamMeetingFreeZone).where(
                and_(
                    TeamMeetingFreeZone.id == zone_id,
                    TeamMeetingFreeZone.team_id == team_id
                )
            )
        )
        zone = result.scalar_one_or_none()
        if zone:
            await self.db.delete(zone)
            await self.db.commit()
            return True
        return False

    # ═══════════════════════════════════════════════════════════════════
    # SCHEDULING SUGGESTIONS
    # ═══════════════════════════════════════════════════════════════════

    async def generate_scheduling_suggestions(
        self,
        team_id: int,
        days_ahead: int = 7
    ) -> List[TeamSchedulingSuggestion]:
        """Generate AI suggestions for optimal meeting times"""

        suggestions = []

        # Get team members
        members_result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id)
        )
        members = members_result.scalars().all()
        member_ids = [m.user_id for m in members]

        if not member_ids:
            return suggestions

        # Analyze best meeting times based on historical data
        best_times = await self._analyze_best_meeting_times(member_ids)

        # Create suggestions for best meeting times
        for time_slot in best_times[:3]:  # Top 3 suggestions
            suggestion = TeamSchedulingSuggestion(
                team_id=team_id,
                suggestion_type="best_meeting_time",
                suggested_start=time_slot["start"],
                suggested_end=time_slot["end"],
                day_of_week=time_slot["day_of_week"],
                reason=time_slot["reason"],
                impact_score=time_slot["impact_score"],
                availability_score=time_slot["availability"],
                affected_members=member_ids,
            )
            self.db.add(suggestion)
            suggestions.append(suggestion)

        await self.db.commit()
        return suggestions

    async def get_scheduling_suggestions(
        self,
        team_id: int
    ) -> List[TeamSchedulingSuggestion]:
        """Get active scheduling suggestions"""
        result = await self.db.execute(
            select(TeamSchedulingSuggestion).where(
                and_(
                    TeamSchedulingSuggestion.team_id == team_id,
                    TeamSchedulingSuggestion.is_dismissed == False,
                    TeamSchedulingSuggestion.is_applied == False
                )
            ).order_by(TeamSchedulingSuggestion.impact_score.desc())
        )
        return result.scalars().all()

    # ═══════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════

    async def _create_empty_team_score(
        self,
        team_id: int,
        date: datetime
    ) -> TeamDeepWorkScore:
        """Create an empty team score"""
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)

        team_score = TeamDeepWorkScore(
            team_id=team_id,
            date=start_of_day,
            member_count=0,
        )
        self.db.add(team_score)
        await self.db.commit()
        await self.db.refresh(team_score)
        return team_score

    async def _get_team_score_for_date(
        self,
        team_id: int,
        date: datetime
    ) -> Optional[TeamDeepWorkScore]:
        """Get team score for a specific date"""
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        result = await self.db.execute(
            select(TeamDeepWorkScore).where(
                and_(
                    TeamDeepWorkScore.team_id == team_id,
                    TeamDeepWorkScore.date >= start_of_day,
                    TeamDeepWorkScore.date < end_of_day
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_member_score(
        self,
        user_id: int,
        date: datetime
    ) -> Optional[DeepWorkScore]:
        """Get individual member's deep work score for a date"""
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        result = await self.db.execute(
            select(DeepWorkScore).where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= start_of_day,
                    DeepWorkScore.date < end_of_day
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_member_breakdown(
        self,
        team_id: int,
        days: int
    ) -> List[Dict[str, Any]]:
        """Get breakdown of metrics per team member"""

        end_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = end_date - timedelta(days=days)

        members_result = await self.db.execute(
            select(TeamMember, User).join(
                User, TeamMember.user_id == User.id
            ).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.share_activity == True
                )
            )
        )
        members = members_result.all()

        member_data = []
        for member, user in members:
            # Get scores for this member
            scores_result = await self.db.execute(
                select(DeepWorkScore).where(
                    and_(
                        DeepWorkScore.user_id == member.user_id,
                        DeepWorkScore.date >= start_date
                    )
                )
            )
            scores = scores_result.scalars().all()

            if scores:
                avg_score = sum(s.deep_work_score for s in scores) / len(scores)
                avg_deep_work = sum(s.deep_work_minutes for s in scores) / len(scores)
                avg_meetings = sum(s.meeting_load_percent for s in scores) / len(scores)
            else:
                avg_score = 0
                avg_deep_work = 0
                avg_meetings = 0

            member_data.append({
                "user_id": user.id,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "avg_score": round(avg_score, 1),
                "avg_deep_work_minutes": round(avg_deep_work),
                "avg_meeting_load": round(avg_meetings, 1),
                "role": member.role.value,
            })

        # Sort by avg score descending
        member_data.sort(key=lambda x: x["avg_score"], reverse=True)
        return member_data

    def _calculate_distribution(
        self,
        values: List[float],
        buckets: List[int]
    ) -> Dict[str, int]:
        """Calculate distribution of values into buckets"""
        distribution = {}
        for i in range(len(buckets) - 1):
            low, high = buckets[i], buckets[i + 1]
            key = f"{low}-{high}"
            distribution[key] = sum(1 for v in values if low <= v < high)
        return distribution

    async def _create_alert_if_not_exists(
        self,
        team_id: int,
        target_user_id: Optional[int],
        alert_type: AlertType,
        priority: AlertPriority,
        title: str,
        message: str,
        metric_name: str,
        metric_value: float,
        threshold_value: float,
        suggestion: str,
    ) -> Optional[TeamManagerAlert]:
        """Create alert if a similar one doesn't exist today"""

        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Check for existing similar alert today
        existing = await self.db.execute(
            select(TeamManagerAlert).where(
                and_(
                    TeamManagerAlert.team_id == team_id,
                    TeamManagerAlert.target_user_id == target_user_id,
                    TeamManagerAlert.alert_type == alert_type,
                    TeamManagerAlert.created_at >= today,
                    TeamManagerAlert.is_dismissed == False
                )
            )
        )

        if existing.scalar_one_or_none():
            return None

        alert = TeamManagerAlert(
            team_id=team_id,
            target_user_id=target_user_id,
            alert_type=alert_type,
            priority=priority,
            title=title,
            message=message,
            metric_name=metric_name,
            metric_value=metric_value,
            threshold_value=threshold_value,
            suggestion=suggestion,
            expires_at=today + timedelta(days=1),  # Expire end of day
        )

        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def _analyze_best_meeting_times(
        self,
        member_ids: List[int]
    ) -> List[Dict[str, Any]]:
        """Analyze historical data to find best meeting times"""

        # This is a simplified version - in production would analyze:
        # - Historical productivity patterns
        # - Meeting free times across team
        # - Individual preferences

        now = datetime.utcnow()
        next_week = now + timedelta(days=7)

        # Default suggestions based on common patterns
        suggestions = [
            {
                "day_of_week": 2,  # Tuesday
                "start": now.replace(hour=14, minute=0, second=0) + timedelta(days=(2 - now.weekday()) % 7),
                "end": now.replace(hour=15, minute=0, second=0) + timedelta(days=(2 - now.weekday()) % 7),
                "reason": "Tuesday afternoon has lowest impact on morning focus time",
                "impact_score": 85,
                "availability": 90,
            },
            {
                "day_of_week": 4,  # Thursday
                "start": now.replace(hour=15, minute=0, second=0) + timedelta(days=(4 - now.weekday()) % 7),
                "end": now.replace(hour=16, minute=0, second=0) + timedelta(days=(4 - now.weekday()) % 7),
                "reason": "Thursday late afternoon preserves deep work periods",
                "impact_score": 80,
                "availability": 85,
            },
            {
                "day_of_week": 3,  # Wednesday
                "start": now.replace(hour=11, minute=0, second=0) + timedelta(days=(3 - now.weekday()) % 7),
                "end": now.replace(hour=12, minute=0, second=0) + timedelta(days=(3 - now.weekday()) % 7),
                "reason": "Mid-week before lunch is good for sync meetings",
                "impact_score": 75,
                "availability": 88,
            },
        ]

        return suggestions
