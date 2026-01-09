from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.models.activity import Activity
from app.services.activity_tracker import activity_watch_client
from app.services.classification import classify_activity

router = APIRouter()


class HourlyProductivity(BaseModel):
    hour: int
    productivity: float
    total_time: int
    productive_time: int
    distracting_time: int


class CategoryBreakdown(BaseModel):
    category: str
    duration: int
    percentage: float
    productivity_type: str


class AppBreakdown(BaseModel):
    app: str
    duration: int
    percentage: float
    productivity_type: str
    category: str


class DailyAnalyticsResponse(BaseModel):
    date: str
    total_time: int
    productivity_score: float
    productive_time: int
    neutral_time: int
    distracting_time: int
    hourly_productivity: List[HourlyProductivity]
    category_breakdown: List[CategoryBreakdown]
    top_apps: List[AppBreakdown]
    best_hour: int
    worst_hour: int
    focus_sessions: int


class WeeklyAnalyticsResponse(BaseModel):
    start_date: str
    end_date: str
    total_time: int
    average_daily_time: int
    productivity_score: float
    daily_scores: List[dict]
    category_breakdown: List[CategoryBreakdown]
    top_apps: List[AppBreakdown]
    comparison_to_last_week: dict
    streak_days: int


async def _get_activities_for_period(
    start: datetime,
    end: datetime,
    db: AsyncSession
) -> List[dict]:
    """Helper to get activities for a date range"""
    # Try database first
    query = select(Activity).where(
        and_(
            Activity.start_time >= start,
            Activity.start_time < end
        )
    )
    result = await db.execute(query)
    db_activities = result.scalars().all()

    if db_activities:
        return [
            {
                "app_name": a.app_name,
                "window_title": a.window_title,
                "url": a.url,
                "duration": a.duration,
                "start_time": a.start_time,
                "productivity_score": a.productivity_score,
                "category": a.category,
            }
            for a in db_activities
        ]

    # Fall back to ActivityWatch
    aw_activities = await activity_watch_client.get_activities(start, end)
    activities = []

    for a in aw_activities:
        classification = classify_activity(a["app_name"], a["window_title"], a.get("url"))
        start_time = a["start_time"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))

        activities.append({
            "app_name": a["app_name"],
            "window_title": a["window_title"],
            "url": a.get("url"),
            "duration": a["duration"],
            "start_time": start_time,
            "productivity_score": classification.productivity_score,
            "category": classification.category,
        })

    return activities


def _calculate_analytics(activities: List[dict]) -> dict:
    """Calculate analytics from activities list"""
    if not activities:
        return {
            "total_time": 0,
            "productive_time": 0,
            "neutral_time": 0,
            "distracting_time": 0,
            "productivity_score": 0.0,
            "hourly": {},
            "categories": {},
            "apps": {},
        }

    total_time = sum(a["duration"] for a in activities)
    productive_time = sum(a["duration"] for a in activities if a["productivity_score"] >= 0.6)
    distracting_time = sum(a["duration"] for a in activities if a["productivity_score"] <= 0.35)
    neutral_time = total_time - productive_time - distracting_time

    productivity_score = productive_time / total_time if total_time > 0 else 0.0

    # Hourly breakdown
    hourly: dict = {}
    for a in activities:
        start = a["start_time"]
        if isinstance(start, datetime):
            hour = start.hour
        else:
            continue

        if hour not in hourly:
            hourly[hour] = {"total": 0, "productive": 0, "distracting": 0}

        hourly[hour]["total"] += a["duration"]
        if a["productivity_score"] >= 0.6:
            hourly[hour]["productive"] += a["duration"]
        elif a["productivity_score"] <= 0.35:
            hourly[hour]["distracting"] += a["duration"]

    # Category breakdown
    categories: dict = {}
    for a in activities:
        cat = a["category"]
        if cat not in categories:
            categories[cat] = {"duration": 0, "scores": []}
        categories[cat]["duration"] += a["duration"]
        categories[cat]["scores"].append(a["productivity_score"])

    # App breakdown
    apps: dict = {}
    for a in activities:
        app = a["app_name"]
        if app not in apps:
            apps[app] = {"duration": 0, "scores": [], "category": a["category"]}
        apps[app]["duration"] += a["duration"]
        apps[app]["scores"].append(a["productivity_score"])

    return {
        "total_time": total_time,
        "productive_time": productive_time,
        "neutral_time": neutral_time,
        "distracting_time": distracting_time,
        "productivity_score": productivity_score,
        "hourly": hourly,
        "categories": categories,
        "apps": apps,
    }


@router.get("/daily", response_model=DailyAnalyticsResponse)
async def get_daily_analytics(
    date: Optional[str] = Query(None, description="Date (YYYY-MM-DD), defaults to today"),
    db: AsyncSession = Depends(get_db),
):
    """Get daily analytics"""
    try:
        if not date or date == "today":
            filter_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            date_str = filter_date.strftime("%Y-%m-%d")
        else:
            filter_date = datetime.strptime(date, "%Y-%m-%d")
            date_str = date
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    end_date = filter_date + timedelta(days=1)

    activities = await _get_activities_for_period(filter_date, end_date, db)
    analytics = _calculate_analytics(activities)

    # Build hourly productivity list
    hourly_productivity = []
    for hour in range(24):
        data = analytics["hourly"].get(hour, {"total": 0, "productive": 0, "distracting": 0})
        productivity = data["productive"] / data["total"] if data["total"] > 0 else 0.5
        hourly_productivity.append(HourlyProductivity(
            hour=hour,
            productivity=round(productivity, 2),
            total_time=data["total"],
            productive_time=data["productive"],
            distracting_time=data["distracting"],
        ))

    # Find best and worst hours
    active_hours = [(h.hour, h.productivity) for h in hourly_productivity if h.total_time > 0]
    best_hour = max(active_hours, key=lambda x: x[1])[0] if active_hours else 10
    worst_hour = min(active_hours, key=lambda x: x[1])[0] if active_hours else 14

    # Category breakdown
    total_time = analytics["total_time"]
    category_breakdown = []
    for cat, data in sorted(analytics["categories"].items(), key=lambda x: x[1]["duration"], reverse=True):
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0.5
        productivity_type = "productive" if avg_score >= 0.6 else "distracting" if avg_score <= 0.35 else "neutral"
        category_breakdown.append(CategoryBreakdown(
            category=cat,
            duration=data["duration"],
            percentage=round(data["duration"] / total_time * 100, 1) if total_time > 0 else 0,
            productivity_type=productivity_type,
        ))

    # Top apps
    top_apps = []
    for app, data in sorted(analytics["apps"].items(), key=lambda x: x[1]["duration"], reverse=True)[:10]:
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0.5
        productivity_type = "productive" if avg_score >= 0.6 else "distracting" if avg_score <= 0.35 else "neutral"
        top_apps.append(AppBreakdown(
            app=app,
            duration=data["duration"],
            percentage=round(data["duration"] / total_time * 100, 1) if total_time > 0 else 0,
            productivity_type=productivity_type,
            category=data["category"],
        ))

    # Count focus sessions (periods of 30+ min productive work)
    focus_sessions = 0
    current_productive_streak = 0
    for a in sorted(activities, key=lambda x: x["start_time"] if isinstance(x["start_time"], datetime) else datetime.now()):
        if a["productivity_score"] >= 0.6:
            current_productive_streak += a["duration"]
        else:
            if current_productive_streak >= 1800:  # 30 minutes
                focus_sessions += 1
            current_productive_streak = 0
    if current_productive_streak >= 1800:
        focus_sessions += 1

    return DailyAnalyticsResponse(
        date=date_str,
        total_time=analytics["total_time"],
        productivity_score=round(analytics["productivity_score"] * 100, 1),
        productive_time=analytics["productive_time"],
        neutral_time=analytics["neutral_time"],
        distracting_time=analytics["distracting_time"],
        hourly_productivity=hourly_productivity,
        category_breakdown=category_breakdown,
        top_apps=top_apps,
        best_hour=best_hour,
        worst_hour=worst_hour,
        focus_sessions=focus_sessions,
    )


@router.get("/weekly", response_model=WeeklyAnalyticsResponse)
async def get_weekly_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """Get weekly analytics"""
    try:
        if not start_date:
            # Default to start of current week (Monday)
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            start = today - timedelta(days=today.weekday())
        else:
            start = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    end = start + timedelta(days=7)
    start_str = start.strftime("%Y-%m-%d")
    end_str = (end - timedelta(days=1)).strftime("%Y-%m-%d")

    # Get activities for the week
    activities = await _get_activities_for_period(start, end, db)
    analytics = _calculate_analytics(activities)

    # Get last week for comparison
    last_week_start = start - timedelta(days=7)
    last_week_activities = await _get_activities_for_period(last_week_start, start, db)
    last_week_analytics = _calculate_analytics(last_week_activities)

    # Daily breakdown
    daily_scores = []
    streak_days = 0
    current_streak = 0

    for day_offset in range(7):
        day = start + timedelta(days=day_offset)
        day_end = day + timedelta(days=1)
        day_activities = [a for a in activities
                         if isinstance(a["start_time"], datetime) and day <= a["start_time"] < day_end]

        day_analytics = _calculate_analytics(day_activities)
        productivity = day_analytics["productivity_score"]

        daily_scores.append({
            "date": day.strftime("%Y-%m-%d"),
            "day": day.strftime("%A"),
            "total_time": day_analytics["total_time"],
            "productivity_score": round(productivity * 100, 1),
            "productive_time": day_analytics["productive_time"],
            "distracting_time": day_analytics["distracting_time"],
        })

        # Track streak
        if productivity >= 0.6:
            current_streak += 1
            streak_days = max(streak_days, current_streak)
        else:
            current_streak = 0

    # Category breakdown
    total_time = analytics["total_time"]
    category_breakdown = []
    for cat, data in sorted(analytics["categories"].items(), key=lambda x: x[1]["duration"], reverse=True):
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0.5
        productivity_type = "productive" if avg_score >= 0.6 else "distracting" if avg_score <= 0.35 else "neutral"
        category_breakdown.append(CategoryBreakdown(
            category=cat,
            duration=data["duration"],
            percentage=round(data["duration"] / total_time * 100, 1) if total_time > 0 else 0,
            productivity_type=productivity_type,
        ))

    # Top apps
    top_apps = []
    for app, data in sorted(analytics["apps"].items(), key=lambda x: x[1]["duration"], reverse=True)[:10]:
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0.5
        productivity_type = "productive" if avg_score >= 0.6 else "distracting" if avg_score <= 0.35 else "neutral"
        top_apps.append(AppBreakdown(
            app=app,
            duration=data["duration"],
            percentage=round(data["duration"] / total_time * 100, 1) if total_time > 0 else 0,
            productivity_type=productivity_type,
            category=data["category"],
        ))

    # Comparison to last week
    last_total = last_week_analytics["total_time"]
    last_productivity = last_week_analytics["productivity_score"]

    comparison = {
        "total_time_change": analytics["total_time"] - last_total,
        "total_time_change_percent": round((analytics["total_time"] - last_total) / last_total * 100, 1) if last_total > 0 else 0,
        "productivity_change": round((analytics["productivity_score"] - last_productivity) * 100, 1),
        "productive_time_change": analytics["productive_time"] - last_week_analytics["productive_time"],
    }

    return WeeklyAnalyticsResponse(
        start_date=start_str,
        end_date=end_str,
        total_time=analytics["total_time"],
        average_daily_time=analytics["total_time"] // 7,
        productivity_score=round(analytics["productivity_score"] * 100, 1),
        daily_scores=daily_scores,
        category_breakdown=category_breakdown,
        top_apps=top_apps,
        comparison_to_last_week=comparison,
        streak_days=streak_days,
    )


@router.get("/top-apps")
async def get_top_apps(
    days: int = Query(7, description="Number of days to analyze"),
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get top apps by time spent"""
    end = datetime.now()
    start = end - timedelta(days=days)

    activities = await _get_activities_for_period(start, end, db)
    analytics = _calculate_analytics(activities)

    total_time = analytics["total_time"]
    top_apps = []

    for app, data in sorted(analytics["apps"].items(), key=lambda x: x[1]["duration"], reverse=True)[:limit]:
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0.5
        productivity_type = "productive" if avg_score >= 0.6 else "distracting" if avg_score <= 0.35 else "neutral"
        top_apps.append({
            "app": app,
            "duration": data["duration"],
            "percentage": round(data["duration"] / total_time * 100, 1) if total_time > 0 else 0,
            "productivity_type": productivity_type,
            "productivity_score": round(avg_score, 2),
            "category": data["category"],
        })

    return {
        "period_days": days,
        "total_time": total_time,
        "apps": top_apps,
    }


@router.get("/categories")
async def get_categories(
    days: int = Query(7, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
):
    """Get time breakdown by category"""
    end = datetime.now()
    start = end - timedelta(days=days)

    activities = await _get_activities_for_period(start, end, db)
    analytics = _calculate_analytics(activities)

    total_time = analytics["total_time"]
    categories = []

    for cat, data in sorted(analytics["categories"].items(), key=lambda x: x[1]["duration"], reverse=True):
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0.5
        productivity_type = "productive" if avg_score >= 0.6 else "distracting" if avg_score <= 0.35 else "neutral"
        categories.append({
            "category": cat,
            "duration": data["duration"],
            "percentage": round(data["duration"] / total_time * 100, 1) if total_time > 0 else 0,
            "productivity_type": productivity_type,
            "productivity_score": round(avg_score, 2),
        })

    return {
        "period_days": days,
        "total_time": total_time,
        "categories": categories,
    }


@router.get("/productivity")
async def get_productivity_trend(
    days: int = Query(7, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
):
    """Get productivity trend over time"""
    end = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    start = end - timedelta(days=days)

    trend = []
    for day_offset in range(days):
        day_start = start + timedelta(days=day_offset)
        day_end = day_start + timedelta(days=1)

        activities = await _get_activities_for_period(day_start, day_end, db)
        analytics = _calculate_analytics(activities)

        trend.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "total_time": analytics["total_time"],
            "productivity_score": round(analytics["productivity_score"] * 100, 1),
            "productive_time": analytics["productive_time"],
            "neutral_time": analytics["neutral_time"],
            "distracting_time": analytics["distracting_time"],
        })

    # Calculate trend direction
    if len(trend) >= 2:
        recent_avg = sum(t["productivity_score"] for t in trend[-3:]) / min(3, len(trend))
        earlier_avg = sum(t["productivity_score"] for t in trend[:3]) / min(3, len(trend))
        trend_direction = "up" if recent_avg > earlier_avg else "down" if recent_avg < earlier_avg else "stable"
    else:
        trend_direction = "stable"

    return {
        "period_days": days,
        "trend": trend,
        "trend_direction": trend_direction,
        "average_productivity": round(sum(t["productivity_score"] for t in trend) / len(trend), 1) if trend else 0,
    }


@router.get("/trends")
async def get_trends(
    period: str = Query("week", description="week, month, or year"),
    db: AsyncSession = Depends(get_db),
):
    """Get productivity trends and insights"""
    days_map = {"week": 7, "month": 30, "year": 365}
    days = days_map.get(period, 7)

    end = datetime.now()
    start = end - timedelta(days=days)

    activities = await _get_activities_for_period(start, end, db)
    analytics = _calculate_analytics(activities)

    # Generate insights
    insights = []

    if analytics["productivity_score"] >= 0.7:
        insights.append({
            "type": "positive",
            "message": f"Great productivity! You've been focused {round(analytics['productivity_score'] * 100)}% of the time.",
        })
    elif analytics["productivity_score"] < 0.4:
        insights.append({
            "type": "warning",
            "message": "Your productivity has been lower than usual. Consider using focus mode.",
        })

    # Check for distracting apps
    for app, data in analytics["apps"].items():
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0.5
        if avg_score <= 0.35 and data["duration"] > 3600:
            hours = data["duration"] / 3600
            insights.append({
                "type": "warning",
                "message": f"You spent {hours:.1f} hours on {app}. Consider setting limits.",
            })

    # Best productivity hour
    if analytics["hourly"]:
        best_hour = max(analytics["hourly"].items(),
                       key=lambda x: x[1]["productive"] / x[1]["total"] if x[1]["total"] > 0 else 0)
        if best_hour[1]["total"] > 0:
            insights.append({
                "type": "info",
                "message": f"Your most productive hour is {best_hour[0]}:00. Schedule important work then!",
            })

    return {
        "period": period,
        "total_time": analytics["total_time"],
        "productivity_score": round(analytics["productivity_score"] * 100, 1),
        "trends": [
            {
                "metric": "Total Time",
                "value": analytics["total_time"],
                "unit": "seconds",
            },
            {
                "metric": "Productivity",
                "value": round(analytics["productivity_score"] * 100, 1),
                "unit": "percent",
            },
            {
                "metric": "Productive Time",
                "value": analytics["productive_time"],
                "unit": "seconds",
            },
        ],
        "insights": insights,
    }
