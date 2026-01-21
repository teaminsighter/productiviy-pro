"""
Deep Work API routes for productivity analytics and focus metrics
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.calendar import DeepWorkScore, FocusBlock
from app.services.deepwork_service import deepwork_calculator


router = APIRouter()


# Pydantic models
class DeepWorkScoreResponse(BaseModel):
    id: str
    date: datetime
    deep_work_score: int
    deep_work_minutes: int
    deep_work_hours: float  # Computed field
    total_tracked_minutes: int
    total_meeting_minutes: int
    meeting_count: int
    meeting_load_percent: float
    fragmentation_score: int
    context_switches: int
    longest_focus_block_minutes: int
    average_focus_block_minutes: float
    focus_blocks_count: int
    productive_minutes: int
    neutral_minutes: int
    distracting_minutes: int
    focus_efficiency: float
    work_start_time: Optional[datetime]
    work_end_time: Optional[datetime]
    best_focus_hour: Optional[int]
    vs_yesterday: Optional[float]
    vs_week_avg: Optional[float]
    vs_month_avg: Optional[float]
    ai_summary: Optional[str]
    ai_recommendations: List[str]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_hours(cls, obj: DeepWorkScore) -> "DeepWorkScoreResponse":
        return cls(
            id=obj.id,
            date=obj.date,
            deep_work_score=obj.deep_work_score or 0,
            deep_work_minutes=obj.deep_work_minutes or 0,
            deep_work_hours=round((obj.deep_work_minutes or 0) / 60, 1),
            total_tracked_minutes=obj.total_tracked_minutes or 0,
            total_meeting_minutes=obj.total_meeting_minutes or 0,
            meeting_count=obj.meeting_count or 0,
            meeting_load_percent=obj.meeting_load_percent or 0,
            fragmentation_score=obj.fragmentation_score or 0,
            context_switches=obj.context_switches or 0,
            longest_focus_block_minutes=obj.longest_focus_block_minutes or 0,
            average_focus_block_minutes=obj.average_focus_block_minutes or 0,
            focus_blocks_count=obj.focus_blocks_count or 0,
            productive_minutes=obj.productive_minutes or 0,
            neutral_minutes=obj.neutral_minutes or 0,
            distracting_minutes=obj.distracting_minutes or 0,
            focus_efficiency=obj.focus_efficiency or 0,
            work_start_time=obj.work_start_time,
            work_end_time=obj.work_end_time,
            best_focus_hour=obj.best_focus_hour,
            vs_yesterday=obj.vs_yesterday,
            vs_week_avg=obj.vs_week_avg,
            vs_month_avg=obj.vs_month_avg,
            ai_summary=obj.ai_summary,
            ai_recommendations=obj.ai_recommendations or [],
        )


class TodayScoreResponse(BaseModel):
    """Simplified response for dashboard widget"""
    deep_work_score: int
    deep_work_hours: float
    meeting_hours: float
    fragmentation_score: int
    longest_focus_block: int  # minutes
    focus_efficiency: float
    vs_yesterday: Optional[float]
    status: str  # "excellent", "good", "fair", "poor"
    message: str  # Human-readable summary


class WeeklySummaryResponse(BaseModel):
    week_start: str
    week_end: str
    avg_deep_work_score: float
    total_deep_work_hours: float
    total_meeting_hours: float
    avg_fragmentation: float
    avg_focus_efficiency: float
    best_day: Optional[dict]
    worst_day: Optional[dict]
    days_tracked: int
    daily_scores: List[dict]


class ChartDataResponse(BaseModel):
    """Data formatted for frontend charts"""
    daily_breakdown: List[dict]  # For stacked bar chart
    productivity_trend: List[dict]  # For line chart
    category_distribution: List[dict]  # For pie chart
    meeting_heatmap: List[dict]  # For heatmap


# Routes

@router.get("/score/today", response_model=TodayScoreResponse)
async def get_today_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's deep work score (for dashboard widget)"""
    today = date.today()

    # Calculate or get today's score
    score = await deepwork_calculator.calculate_daily_score(db, current_user.id, today)

    # Determine status and message
    deep_work_score = score.deep_work_score or 0
    if deep_work_score >= 80:
        status_label = "excellent"
        message = "Outstanding focus today! Keep it up."
    elif deep_work_score >= 60:
        status_label = "good"
        message = "Good focus day. Room for improvement."
    elif deep_work_score >= 40:
        status_label = "fair"
        message = "Moderate focus. Try blocking more time."
    else:
        status_label = "poor"
        message = "High fragmentation. Consider fewer meetings."

    # Add context to message
    meeting_hours = round((score.total_meeting_minutes or 0) / 60, 1)
    if meeting_hours > 4:
        message = f"Heavy meeting day ({meeting_hours}h). {message}"

    return TodayScoreResponse(
        deep_work_score=deep_work_score,
        deep_work_hours=round((score.deep_work_minutes or 0) / 60, 1),
        meeting_hours=meeting_hours,
        fragmentation_score=score.fragmentation_score or 0,
        longest_focus_block=score.longest_focus_block_minutes or 0,
        focus_efficiency=score.focus_efficiency or 0,
        vs_yesterday=score.vs_yesterday,
        status=status_label,
        message=message,
    )


@router.get("/score/{target_date}", response_model=DeepWorkScoreResponse)
async def get_score_for_date(
    target_date: date,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get deep work score for a specific date"""
    score = await deepwork_calculator.calculate_daily_score(db, current_user.id, target_date)
    return DeepWorkScoreResponse.from_orm_with_hours(score)


@router.post("/score/{target_date}/calculate", response_model=DeepWorkScoreResponse)
async def calculate_score_for_date(
    target_date: date,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Force recalculation of deep work score for a specific date"""
    score = await deepwork_calculator.calculate_daily_score(db, current_user.id, target_date)
    return DeepWorkScoreResponse.from_orm_with_hours(score)


@router.get("/scores", response_model=List[DeepWorkScoreResponse])
async def get_scores_range(
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get deep work scores for a date range"""
    scores = await deepwork_calculator.get_scores_for_range(
        db, current_user.id, start_date, end_date
    )
    return [DeepWorkScoreResponse.from_orm_with_hours(s) for s in scores]


@router.get("/weekly", response_model=WeeklySummaryResponse)
async def get_weekly_summary(
    week_offset: int = Query(0, description="Week offset (0 = current week, -1 = last week)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get weekly deep work summary"""
    today = date.today()
    week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)

    summary = await deepwork_calculator.get_weekly_summary(db, current_user.id, week_start)
    return WeeklySummaryResponse(**summary)


@router.get("/charts", response_model=ChartDataResponse)
async def get_chart_data(
    days: int = Query(7, description="Number of days to include", ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get data formatted for frontend charts"""
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    scores = await deepwork_calculator.get_scores_for_range(
        db, current_user.id, start_date, end_date
    )

    # Daily breakdown for stacked bar chart
    daily_breakdown = []
    for score in scores:
        if score.date:
            daily_breakdown.append({
                "date": score.date.strftime("%a"),
                "full_date": score.date.date().isoformat(),
                "deep_work": round((score.deep_work_minutes or 0) / 60, 1),
                "meetings": round((score.total_meeting_minutes or 0) / 60, 1),
                "other": round(
                    ((score.total_tracked_minutes or 0) - (score.deep_work_minutes or 0) - (score.total_meeting_minutes or 0)) / 60, 1
                ),
            })

    # Productivity trend for line chart
    productivity_trend = []
    for score in scores:
        if score.date:
            productivity_trend.append({
                "date": score.date.strftime("%b %d"),
                "full_date": score.date.date().isoformat(),
                "score": score.deep_work_score or 0,
                "fragmentation": score.fragmentation_score or 0,
            })

    # Category distribution for pie chart (aggregate over period)
    total_productive = sum(s.productive_minutes or 0 for s in scores)
    total_meeting = sum(s.total_meeting_minutes or 0 for s in scores)
    total_neutral = sum(s.neutral_minutes or 0 for s in scores)
    total_distracting = sum(s.distracting_minutes or 0 for s in scores)

    category_distribution = [
        {"name": "Deep Work", "value": round(total_productive / 60, 1), "color": "#10b981"},
        {"name": "Meetings", "value": round(total_meeting / 60, 1), "color": "#ef4444"},
        {"name": "Neutral", "value": round(total_neutral / 60, 1), "color": "#6b7280"},
        {"name": "Distracting", "value": round(total_distracting / 60, 1), "color": "#f59e0b"},
    ]

    # Meeting heatmap (meetings per hour per day)
    # This requires calendar events, so we'll generate a placeholder structure
    meeting_heatmap = []
    for day in range(7):  # Monday to Sunday
        for hour in range(9, 18):  # 9 AM to 6 PM
            meeting_heatmap.append({
                "day": day,
                "hour": hour,
                "meetings": 0,  # Will be populated when we have meeting data
            })

    return ChartDataResponse(
        daily_breakdown=daily_breakdown,
        productivity_trend=productivity_trend,
        category_distribution=category_distribution,
        meeting_heatmap=meeting_heatmap,
    )


@router.get("/insights")
async def get_deep_work_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-powered deep work insights"""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Get this week's scores
    scores = await deepwork_calculator.get_scores_for_range(
        db, current_user.id, week_start, today
    )

    if not scores:
        return {
            "summary": "Not enough data yet. Keep tracking to get personalized insights.",
            "insights": [],
            "recommendations": [
                "Connect your calendar to see meeting impact",
                "Track for a few days to see patterns emerge",
            ],
        }

    # Calculate insights
    avg_score = sum(s.deep_work_score or 0 for s in scores) / len(scores)
    avg_meetings = sum(s.total_meeting_minutes or 0 for s in scores) / len(scores) / 60
    avg_fragmentation = sum(s.fragmentation_score or 0 for s in scores) / len(scores)

    insights = []
    recommendations = []

    # Meeting load insight
    if avg_meetings > 4:
        insights.append({
            "type": "warning",
            "title": "High Meeting Load",
            "message": f"You average {avg_meetings:.1f} hours of meetings per day. This leaves little time for deep work.",
        })
        recommendations.append("Try to batch meetings on specific days")
        recommendations.append("Decline optional meetings when possible")
    elif avg_meetings > 2:
        insights.append({
            "type": "info",
            "title": "Moderate Meeting Load",
            "message": f"You spend about {avg_meetings:.1f} hours per day in meetings.",
        })

    # Fragmentation insight
    if avg_fragmentation > 60:
        insights.append({
            "type": "warning",
            "title": "High Fragmentation",
            "message": "Your days are highly fragmented. Context switching is hurting productivity.",
        })
        recommendations.append("Block 2-hour focus windows on your calendar")
    elif avg_fragmentation < 30:
        insights.append({
            "type": "success",
            "title": "Good Focus Blocks",
            "message": "You're maintaining good periods of uninterrupted work.",
        })

    # Best hour insight
    best_hours = [s.best_focus_hour for s in scores if s.best_focus_hour is not None]
    if best_hours:
        from collections import Counter
        most_common_hour = Counter(best_hours).most_common(1)[0][0]
        hour_str = f"{most_common_hour}:00" if most_common_hour < 12 else f"{most_common_hour-12 if most_common_hour > 12 else 12}:00 PM"
        insights.append({
            "type": "success",
            "title": "Peak Productivity Hour",
            "message": f"You're most productive around {hour_str}. Protect this time!",
        })
        recommendations.append(f"Schedule important work around {hour_str}")

    # Trend insight
    if len(scores) >= 3:
        recent_avg = sum(s.deep_work_score or 0 for s in scores[-3:]) / 3
        earlier_avg = sum(s.deep_work_score or 0 for s in scores[:-3]) / max(len(scores) - 3, 1) if len(scores) > 3 else recent_avg

        if recent_avg > earlier_avg + 5:
            insights.append({
                "type": "success",
                "title": "Improving Trend",
                "message": "Your deep work score is trending up! Keep it going.",
            })
        elif recent_avg < earlier_avg - 5:
            insights.append({
                "type": "warning",
                "title": "Declining Trend",
                "message": "Your focus has decreased recently. Check what changed.",
            })

    # Generate summary
    if avg_score >= 70:
        summary = f"Great week for deep work! You're averaging a score of {avg_score:.0f}."
    elif avg_score >= 50:
        summary = f"Decent focus this week (score: {avg_score:.0f}). There's room to improve."
    else:
        summary = f"Tough week for focus (score: {avg_score:.0f}). Try the recommendations below."

    return {
        "summary": summary,
        "insights": insights,
        "recommendations": recommendations[:4],  # Max 4 recommendations
    }


@router.get("/compare")
async def compare_periods(
    period1_start: date = Query(..., description="First period start"),
    period1_end: date = Query(..., description="First period end"),
    period2_start: date = Query(..., description="Second period start"),
    period2_end: date = Query(..., description="Second period end"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compare deep work metrics between two periods"""
    scores1 = await deepwork_calculator.get_scores_for_range(
        db, current_user.id, period1_start, period1_end
    )
    scores2 = await deepwork_calculator.get_scores_for_range(
        db, current_user.id, period2_start, period2_end
    )

    def calc_averages(scores):
        if not scores:
            return {
                "avg_score": 0,
                "avg_deep_work_hours": 0,
                "avg_meeting_hours": 0,
                "avg_fragmentation": 0,
            }
        return {
            "avg_score": round(sum(s.deep_work_score or 0 for s in scores) / len(scores), 1),
            "avg_deep_work_hours": round(sum(s.deep_work_minutes or 0 for s in scores) / len(scores) / 60, 1),
            "avg_meeting_hours": round(sum(s.total_meeting_minutes or 0 for s in scores) / len(scores) / 60, 1),
            "avg_fragmentation": round(sum(s.fragmentation_score or 0 for s in scores) / len(scores), 1),
        }

    period1_stats = calc_averages(scores1)
    period2_stats = calc_averages(scores2)

    # Calculate differences
    def calc_diff(v1, v2):
        if v2 == 0:
            return 0
        return round(((v1 - v2) / v2) * 100, 1)

    return {
        "period1": {
            "start": period1_start.isoformat(),
            "end": period1_end.isoformat(),
            "days": len(scores1),
            **period1_stats,
        },
        "period2": {
            "start": period2_start.isoformat(),
            "end": period2_end.isoformat(),
            "days": len(scores2),
            **period2_stats,
        },
        "comparison": {
            "score_change": calc_diff(period1_stats["avg_score"], period2_stats["avg_score"]),
            "deep_work_change": calc_diff(period1_stats["avg_deep_work_hours"], period2_stats["avg_deep_work_hours"]),
            "meeting_change": calc_diff(period1_stats["avg_meeting_hours"], period2_stats["avg_meeting_hours"]),
            "fragmentation_change": calc_diff(period1_stats["avg_fragmentation"], period2_stats["avg_fragmentation"]),
        },
    }
