"""
Reports API Routes
Provides endpoints for generating and downloading PDF reports.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.core.database import get_db
from app.services.pdf_generator import pdf_generator
from app.services.activity_tracker import activity_watch_client
from app.services.classification import classify_activity

router = APIRouter()


async def get_daily_summary_data(date_str: str) -> dict:
    """Get daily summary data for PDF generation"""
    try:
        if date_str == "today":
            filter_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            date_display = datetime.now().strftime("%Y-%m-%d")
        else:
            filter_date = datetime.strptime(date_str, "%Y-%m-%d")
            date_display = date_str
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD or 'today'")

    next_day = filter_date + timedelta(days=1)

    # Fetch from ActivityWatch
    aw_activities = await activity_watch_client.get_activities(filter_date, next_day)

    # Transform to our format with classification
    activities_data = []
    for a in aw_activities:
        classification = classify_activity(a["app_name"], a["window_title"], a.get("url"))
        activities_data.append({
            "app_name": a["app_name"],
            "duration": a["duration"],
            "productivity_score": classification.productivity_score,
            "productivity_type": classification.productivity_type,
            "category": classification.category,
        })

    # Filter out excluded apps
    active_activities = [a for a in activities_data if a["productivity_type"] != "excluded"]

    # Calculate totals
    total_time = sum(a["duration"] for a in active_activities)
    productive_time = sum(a["duration"] for a in active_activities if a["productivity_type"] == "productive")
    distracting_time = sum(a["duration"] for a in active_activities if a["productivity_type"] == "distracting")
    neutral_time = total_time - productive_time - distracting_time

    # Calculate productivity score
    productivity_score = (productive_time / total_time * 100) if total_time > 0 else 0.0

    # Calculate focus score
    if productivity_score >= 80 and distracting_time < total_time * 0.1:
        focus_score = "A"
    elif productivity_score >= 70:
        focus_score = "B"
    elif productivity_score >= 60:
        focus_score = "C"
    elif productivity_score >= 40:
        focus_score = "D"
    else:
        focus_score = "F"

    # Get top apps
    app_durations: dict = {}
    app_types: dict = {}
    for a in active_activities:
        app = a["app_name"]
        app_durations[app] = app_durations.get(app, 0) + a["duration"]
        app_types[app] = a["productivity_type"]

    sorted_apps = sorted(app_durations.items(), key=lambda x: x[1], reverse=True)
    top_apps = [
        {"app": app, "duration": dur, "productivity_type": app_types.get(app, "neutral")}
        for app, dur in sorted_apps[:10]
    ]

    top_distractions = [
        {"app": app, "duration": dur}
        for app, dur in sorted_apps
        if app_types.get(app) == "distracting"
    ][:5]

    # Categories breakdown
    categories: dict = {}
    for a in active_activities:
        cat = a["category"]
        categories[cat] = categories.get(cat, 0) + a["duration"]

    categories_list = [
        {"category": cat, "duration": dur, "percentage": (dur / total_time * 100) if total_time > 0 else 0}
        for cat, dur in sorted(categories.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "date": date_display,
        "total_time": total_time,
        "productive_time": productive_time,
        "distracting_time": distracting_time,
        "neutral_time": neutral_time,
        "productivity_score": productivity_score,
        "focus_score": focus_score,
        "top_apps": top_apps,
        "top_distractions": top_distractions,
        "categories": categories_list,
    }


@router.get("/daily/{date_str}")
async def download_daily_report(date_str: str):
    """Download daily report as PDF"""
    summary = await get_daily_summary_data(date_str)
    pdf_bytes = pdf_generator.generate_daily_report(summary)

    filename = f"productivity-report-{summary['date']}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/daily")
async def download_today_report():
    """Download today's report as PDF"""
    return await download_daily_report("today")


@router.get("/weekly")
async def download_weekly_report():
    """Download weekly report as PDF"""
    # Calculate week range
    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    daily_summaries = []
    total_hours = 0
    productive_hours = 0

    # Get data for each day of the week
    for i in range(7):
        day = week_start + timedelta(days=i)
        if day > today:
            break

        try:
            day_str = day.strftime("%Y-%m-%d")
            summary = await get_daily_summary_data(day_str)

            hours = summary["total_time"] / 3600
            prod_hours = summary["productive_time"] / 3600

            total_hours += hours
            productive_hours += prod_hours

            daily_summaries.append({
                "day": day.strftime("%A"),
                "hours": hours,
                "productivity": summary["productivity_score"],
                "focus_score": summary["focus_score"],
            })
        except Exception:
            continue

    # Find best day
    best_day = "N/A"
    if daily_summaries:
        best = max(daily_summaries, key=lambda x: x.get("productivity", 0))
        best_day = best.get("day", "N/A")

    avg_productivity = (productive_hours / total_hours * 100) if total_hours > 0 else 0

    weekly_data = {
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": week_end.strftime("%Y-%m-%d"),
        "overview": {
            "total_hours": total_hours,
            "productive_hours": productive_hours,
            "avg_productivity": avg_productivity,
            "best_day": best_day,
        },
        "daily_breakdown": daily_summaries,
    }

    pdf_bytes = pdf_generator.generate_weekly_report(weekly_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=productivity-report-week-{week_start.strftime('%Y-%m-%d')}.pdf"
        }
    )


@router.get("/preview/daily/{date_str}")
async def preview_daily_report(date_str: str):
    """Get daily report data without generating PDF (for preview)"""
    return await get_daily_summary_data(date_str)
