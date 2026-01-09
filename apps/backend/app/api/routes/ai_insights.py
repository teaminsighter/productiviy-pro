"""
AI Insights API Routes

Provides endpoints for AI-powered activity classification,
daily insights, weekly reports, and queue management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.security import get_openai_api_key
from app.services.ai_service import ai_service, DailyInsights, WeeklyReport
from app.models.activity import Activity

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class ClassificationRequest(BaseModel):
    """Request to classify an activity"""
    app_name: str
    window_title: str
    url: Optional[str] = None
    user_context: Optional[str] = None


class ClassificationResponse(BaseModel):
    """Activity classification result"""
    is_productive: bool
    productivity_score: float
    category: str
    reasoning: str
    confidence: float


class YouTubeClassificationRequest(BaseModel):
    """Request to classify a YouTube video"""
    video_title: str
    channel_name: str
    user_context: Optional[str] = None


class YouTubeClassificationResponse(BaseModel):
    """YouTube video classification result"""
    category: str
    is_productive: bool
    productivity_score: float
    reasoning: str


class DailyInsightItem(BaseModel):
    """Single insight item"""
    insight_type: str
    title: str
    description: str
    icon: str = "lightbulb"


class DailyInsightsResponse(BaseModel):
    """Complete daily insights response"""
    date: str
    summary: str
    productivity_score: float
    wins: List[str]
    improvements: List[str]
    tip: str
    focus_score_explanation: str
    insights: List[DailyInsightItem]
    generated_at: str
    ai_powered: bool = True


class WeeklyReportResponse(BaseModel):
    """Complete weekly report response"""
    week_start: str
    week_end: str
    executive_summary: str
    highlights: List[str]
    concerns: List[str]
    recommendations: List[str]
    trends: dict
    next_week_goals: List[str]
    productivity_trend: str
    total_productive_hours: float
    average_daily_score: float
    generated_at: str
    ai_powered: bool = True


class AIStatusResponse(BaseModel):
    """AI service status"""
    configured: bool
    available: bool
    online: bool
    cache_size: int
    queue_size: int
    rate_limited: bool


class QueueStatusResponse(BaseModel):
    """Offline queue status"""
    total: int
    pending: int
    processing: int
    failed: int
    requests: List[dict]


class QueueProcessResponse(BaseModel):
    """Queue processing result"""
    processed: int
    failed: int
    remaining: int
    error: Optional[str] = None


# ============================================================================
# Status Endpoints
# ============================================================================

@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status():
    """Get current AI service status"""
    status = ai_service.status
    return AIStatusResponse(**status)


# ============================================================================
# Classification Endpoints
# ============================================================================

@router.post("/classify", response_model=ClassificationResponse)
async def classify_activity(
    request: ClassificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Classify an activity as productive or not using AI.

    Falls back to rule-based classification if AI is unavailable.
    """
    result = await ai_service.classify_activity(
        app_name=request.app_name,
        window_title=request.window_title,
        url=request.url,
        user_context=request.user_context,
    )

    if result:
        return ClassificationResponse(
            is_productive=result.is_productive,
            productivity_score=result.productivity_score,
            category=result.category,
            reasoning=result.reasoning,
            confidence=result.confidence,
        )

    # This shouldn't happen with fallback, but just in case
    raise HTTPException(
        status_code=500,
        detail="Classification failed unexpectedly"
    )


@router.post("/classify/youtube", response_model=YouTubeClassificationResponse)
async def classify_youtube_video(
    request: YouTubeClassificationRequest,
):
    """Classify a YouTube video for productivity relevance"""
    result = await ai_service.classify_youtube_video(
        video_title=request.video_title,
        channel_name=request.channel_name,
        user_context=request.user_context,
    )

    if result:
        return YouTubeClassificationResponse(
            category=result.category,
            is_productive=result.is_productive,
            productivity_score=result.productivity_score,
            reasoning=result.reasoning,
        )

    raise HTTPException(
        status_code=500,
        detail="YouTube classification failed"
    )


# ============================================================================
# Insights Endpoints
# ============================================================================

@router.get("/insights/daily", response_model=DailyInsightsResponse)
async def get_daily_insights(
    date_str: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI-generated daily insights for a specific date.

    If no date is provided, returns insights for today.
    """
    # Parse date
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = date.today()

    # Fetch activities for the date
    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = datetime.combine(target_date, datetime.max.time())

    try:
        result = await db.execute(
            select(Activity).where(
                and_(
                    Activity.timestamp >= start_of_day,
                    Activity.timestamp <= end_of_day,
                )
            )
        )
        activities = result.scalars().all()

        # Convert to list of dicts
        activity_data = [
            {
                "app_name": a.app_name,
                "window_title": a.window_title,
                "url": a.url,
                "duration": a.duration,
                "is_productive": a.is_productive,
                "productivity_score": a.productivity_score or 0.5,
                "category": a.category,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            }
            for a in activities
        ]
    except Exception as e:
        # If database query fails, use empty list
        print(f"Failed to fetch activities: {e}")
        activity_data = []

    # Generate insights
    insights = await ai_service.generate_daily_insights(
        activities=activity_data,
        date_str=target_date.isoformat(),
    )

    if insights:
        return DailyInsightsResponse(
            date=insights.date,
            summary=insights.summary,
            productivity_score=insights.productivity_score,
            wins=insights.wins,
            improvements=insights.improvements,
            tip=insights.tip,
            focus_score_explanation=insights.focus_score_explanation,
            insights=[
                DailyInsightItem(
                    insight_type=i.insight_type,
                    title=i.title,
                    description=i.description,
                    icon=i.icon,
                )
                for i in insights.insights
            ],
            generated_at=insights.generated_at,
            ai_powered=ai_service.is_available,
        )

    # Fallback response
    return DailyInsightsResponse(
        date=target_date.isoformat(),
        summary="No data available for this date",
        productivity_score=0,
        wins=[],
        improvements=[],
        tip="Start tracking to get personalized insights!",
        focus_score_explanation="No activities recorded",
        insights=[],
        generated_at=datetime.now().isoformat(),
        ai_powered=False,
    )


@router.post("/insights/daily/generate", response_model=DailyInsightsResponse)
async def regenerate_daily_insights(
    date_str: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
):
    """
    Force regenerate daily insights (bypasses cache).
    """
    # Clear relevant cache entries
    ai_service.clear_cache()

    # Call the regular endpoint
    return await get_daily_insights(date_str, db)


@router.get("/insights/weekly", response_model=WeeklyReportResponse)
async def get_weekly_insights(
    week_offset: int = Query(0, description="Week offset from current week (0 = this week, -1 = last week)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI-generated weekly report.

    Use week_offset to get reports for previous weeks.
    """
    # Calculate week boundaries
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday() + (7 * abs(week_offset)))
    end_of_week = start_of_week + timedelta(days=6)

    start_datetime = datetime.combine(start_of_week, datetime.min.time())
    end_datetime = datetime.combine(end_of_week, datetime.max.time())

    try:
        # Fetch activities for the week
        result = await db.execute(
            select(Activity).where(
                and_(
                    Activity.timestamp >= start_datetime,
                    Activity.timestamp <= end_datetime,
                )
            )
        )
        activities = result.scalars().all()

        # Calculate daily stats
        daily_stats = {}
        app_times = {}
        distraction_times = {}
        total_seconds = 0
        productive_seconds = 0

        for a in activities:
            day = a.timestamp.strftime("%A") if a.timestamp else "Unknown"
            duration = a.duration or 0

            if day not in daily_stats:
                daily_stats[day] = {"hours": 0, "productive_hours": 0, "productivity": 0}

            daily_stats[day]["hours"] += duration / 3600
            total_seconds += duration

            if a.is_productive or (a.productivity_score and a.productivity_score > 0.5):
                daily_stats[day]["productive_hours"] += duration / 3600
                productive_seconds += duration

            # Track app times
            app_name = a.app_name or "Unknown"
            app_times[app_name] = app_times.get(app_name, 0) + duration

            if not a.is_productive and a.productivity_score and a.productivity_score < 0.4:
                distraction_times[app_name] = distraction_times.get(app_name, 0) + duration

        # Calculate daily productivity
        for day in daily_stats:
            if daily_stats[day]["hours"] > 0:
                daily_stats[day]["productivity"] = (
                    daily_stats[day]["productive_hours"] / daily_stats[day]["hours"] * 100
                )

        # Find best/worst days
        daily_list = [(d, s) for d, s in daily_stats.items()]
        daily_list.sort(key=lambda x: x[1]["productivity"], reverse=True)
        best_day = daily_list[0][0] if daily_list else "Unknown"
        worst_day = daily_list[-1][0] if daily_list else "Unknown"

        # Build weekly data
        weekly_data = {
            "week_start": start_of_week.isoformat(),
            "week_end": end_of_week.isoformat(),
            "total_hours": total_seconds / 3600,
            "productive_hours": productive_seconds / 3600,
            "avg_productivity": (productive_seconds / total_seconds * 100) if total_seconds > 0 else 0,
            "best_day": best_day,
            "worst_day": worst_day,
            "top_productive_apps": sorted(
                [(k, v) for k, v in app_times.items()],
                key=lambda x: x[1],
                reverse=True
            )[:5],
            "top_distractions": sorted(
                [(k, v) for k, v in distraction_times.items()],
                key=lambda x: x[1],
                reverse=True
            )[:3],
            "daily_stats": [
                {"day": d, "hours": s["hours"], "productivity": s["productivity"]}
                for d, s in daily_stats.items()
            ],
            "hours_change": 0,  # TODO: Compare with previous week
            "productivity_change": 0,
        }

    except Exception as e:
        print(f"Failed to fetch weekly data: {e}")
        weekly_data = {
            "week_start": start_of_week.isoformat(),
            "week_end": end_of_week.isoformat(),
            "total_hours": 0,
            "productive_hours": 0,
            "avg_productivity": 0,
            "best_day": "Unknown",
            "worst_day": "Unknown",
            "top_productive_apps": [],
            "top_distractions": [],
            "daily_stats": [],
            "hours_change": 0,
            "productivity_change": 0,
        }

    # Generate report
    report = await ai_service.generate_weekly_report(weekly_data)

    if report:
        return WeeklyReportResponse(
            week_start=report.week_start,
            week_end=report.week_end,
            executive_summary=report.executive_summary,
            highlights=report.highlights,
            concerns=report.concerns,
            recommendations=report.recommendations,
            trends=report.trends,
            next_week_goals=report.next_week_goals,
            productivity_trend=report.productivity_trend,
            total_productive_hours=report.total_productive_hours,
            average_daily_score=report.average_daily_score,
            generated_at=report.generated_at,
            ai_powered=ai_service.is_available,
        )

    # Fallback
    return WeeklyReportResponse(
        week_start=start_of_week.isoformat(),
        week_end=end_of_week.isoformat(),
        executive_summary="No data available for this week",
        highlights=[],
        concerns=[],
        recommendations=["Configure AI for personalized insights"],
        trends={},
        next_week_goals=["Start tracking your activities"],
        productivity_trend="stable",
        total_productive_hours=0,
        average_daily_score=0,
        generated_at=datetime.now().isoformat(),
        ai_powered=False,
    )


@router.post("/insights/weekly/generate", response_model=WeeklyReportResponse)
async def regenerate_weekly_insights(
    week_offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """Force regenerate weekly report (bypasses cache)."""
    ai_service.clear_cache()
    return await get_weekly_insights(week_offset, db)


# ============================================================================
# Quick Tip Endpoint
# ============================================================================

class QuickTipResponse(BaseModel):
    """Quick productivity tip"""
    tip: str
    category: str
    generated_at: str


@router.get("/tip", response_model=QuickTipResponse)
async def get_quick_tip():
    """Get a quick productivity tip based on current time and patterns"""
    current_hour = datetime.now().hour

    # Time-based tips
    tips = {
        "morning": [
            ("Start your day with the hardest task - you have the most energy now!", "focus"),
            ("Consider a 5-minute planning session before diving into work.", "planning"),
            ("Morning light exposure helps maintain your circadian rhythm.", "wellness"),
        ],
        "midday": [
            ("Time for a short break! A 5-minute walk can boost creativity.", "break"),
            ("Stay hydrated - dehydration affects cognitive performance.", "wellness"),
            ("Consider eating lunch away from your desk.", "wellness"),
        ],
        "afternoon": [
            ("Energy dipping? Try a standing desk session.", "energy"),
            ("This is a good time for collaborative work and meetings.", "collaboration"),
            ("Avoid starting complex tasks - finish what you've started.", "focus"),
        ],
        "evening": [
            ("Time to wrap up and plan tomorrow's priorities.", "planning"),
            ("Consider writing down 3 wins from today.", "reflection"),
            ("Evening is great for light reading or learning.", "learning"),
        ],
    }

    if 5 <= current_hour < 12:
        period = "morning"
    elif 12 <= current_hour < 14:
        period = "midday"
    elif 14 <= current_hour < 18:
        period = "afternoon"
    else:
        period = "evening"

    import random
    tip, category = random.choice(tips[period])

    return QuickTipResponse(
        tip=tip,
        category=category,
        generated_at=datetime.now().isoformat(),
    )


# ============================================================================
# Queue Management Endpoints
# ============================================================================

@router.get("/queue", response_model=QueueStatusResponse)
async def get_offline_queue():
    """Get items in the offline AI processing queue"""
    status = ai_service.get_queue_status()
    return QueueStatusResponse(**status)


@router.post("/queue/process", response_model=QueueProcessResponse)
async def process_offline_queue():
    """Process all items in the offline queue"""
    if not ai_service.is_available:
        raise HTTPException(
            status_code=503,
            detail="AI service not available. Check API key configuration."
        )

    result = await ai_service.process_queue()
    return QueueProcessResponse(**result)


@router.delete("/queue")
async def clear_offline_queue():
    """Clear all items from the offline queue"""
    count = ai_service.clear_queue()
    return {"cleared": count, "message": f"Cleared {count} items from queue"}


# ============================================================================
# Cache Management
# ============================================================================

@router.delete("/cache")
async def clear_ai_cache():
    """Clear AI classification caches"""
    result = ai_service.clear_cache()
    return {
        "cleared": result,
        "message": "Cache cleared successfully",
    }
