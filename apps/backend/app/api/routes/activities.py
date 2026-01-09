from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional, List
from datetime import datetime, timedelta, time
from pydantic import BaseModel
import uuid
import hashlib
import re

from app.core.database import get_db
from app.models.activity import Activity
from app.models.user import User
from app.api.routes.auth import get_current_user_optional
from app.services.activity_tracker import (
    activity_watch_client,
    get_current_activity as aw_get_current_activity,
    check_activitywatch_status,
)
from app.services.classification import classify_activity
from app.services.url_analyzer import url_analyzer

router = APIRouter()


# ============== Time Stats Models ==============

class TimeStatsResponse(BaseModel):
    today: dict
    week: dict
    month: dict
    day_start_hour: int


class PlatformStats(BaseModel):
    domain: str
    total_time: int
    visit_count: int
    productivity: str
    category: str
    last_visited: Optional[str]


class URLHistoryItem(BaseModel):
    id: int
    url: str
    title: str
    domain: str
    duration: int
    timestamp: str
    category: str
    is_productive: bool


class URLDetailResponse(BaseModel):
    domain: str
    total_time: int
    visit_count: int
    productivity: str
    urls: List[dict]


class ActivityResponse(BaseModel):
    id: str
    app_name: str
    window_title: str
    url: Optional[str] = None
    domain: Optional[str] = None
    platform: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: int
    category: str
    productivity_score: float
    is_productive: bool
    productivity_type: str = "neutral"

    class Config:
        from_attributes = True


class CurrentActivityResponse(BaseModel):
    app_name: str
    window_title: str
    url: Optional[str] = None
    domain: Optional[str] = None
    platform: Optional[str] = None
    start_time: Optional[datetime] = None
    duration: int
    category: str
    productivity_score: float
    productivity_type: str
    is_afk: bool = False
    activitywatch_available: bool = False


class DailySummaryResponse(BaseModel):
    date: str
    total_time: int
    productive_time: int
    distracting_time: int
    neutral_time: int
    productivity_score: float
    focus_score: str
    top_apps: List[dict]
    top_distractions: List[dict]
    categories: List[dict]


class TimelineEntry(BaseModel):
    hour: int
    activities: List[dict]
    total_duration: int
    productivity_score: float


class TimelineResponse(BaseModel):
    date: str
    timeline: List[TimelineEntry]


@router.get("/", response_model=List[ActivityResponse])
async def get_activities(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    productivity_type: Optional[str] = Query(None, description="productive, neutral, or distracting"),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get list of activities with optional filters"""
    query = select(Activity).order_by(Activity.start_time.desc())

    # Filter by user_id if authenticated
    if current_user:
        query = query.where(Activity.user_id == current_user.id)

    # Apply date filter
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d")
            next_day = filter_date + timedelta(days=1)
            query = query.where(
                and_(
                    Activity.start_time >= filter_date,
                    Activity.start_time < next_day
                )
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Apply category filter
    if category:
        query = query.where(Activity.category == category)

    # Apply productivity type filter
    if productivity_type:
        if productivity_type == "productive":
            query = query.where(Activity.productivity_score >= 0.6)
        elif productivity_type == "distracting":
            query = query.where(Activity.productivity_score <= 0.35)
        elif productivity_type == "neutral":
            query = query.where(
                and_(
                    Activity.productivity_score > 0.35,
                    Activity.productivity_score < 0.6
                )
            )

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    activities = result.scalars().all()

    # If no activities in DB, fetch from ActivityWatch
    if not activities:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        aw_activities = await activity_watch_client.get_activities(
            today,
            today + timedelta(days=1)
        )

        return [
            ActivityResponse(
                id=str(uuid.uuid4()),
                app_name=a["app_name"],
                window_title=a["window_title"],
                url=a.get("url"),
                domain=url_analyzer.analyze(a["url"]).get("domain") if a.get("url") else None,
                start_time=datetime.fromisoformat(a["start_time"].replace("Z", "+00:00"))
                    if isinstance(a["start_time"], str) else a["start_time"],
                duration=a["duration"],
                category=classify_activity(a["app_name"], a["window_title"], a.get("url")).category,
                productivity_score=classify_activity(a["app_name"], a["window_title"], a.get("url")).productivity_score,
                is_productive=classify_activity(a["app_name"], a["window_title"], a.get("url")).productivity_score >= 0.6,
                productivity_type=classify_activity(a["app_name"], a["window_title"], a.get("url")).productivity_type,
            )
            for a in aw_activities[:limit]
        ]

    return [
        ActivityResponse(
            id=a.id,
            app_name=a.app_name,
            window_title=a.window_title,
            url=a.url,
            domain=a.domain,
            platform=a.platform,
            start_time=a.start_time,
            end_time=a.end_time,
            duration=a.duration,
            category=a.category,
            productivity_score=a.productivity_score,
            is_productive=a.is_productive,
            productivity_type="productive" if a.productivity_score >= 0.6
                else "distracting" if a.productivity_score <= 0.35 else "neutral",
        )
        for a in activities
    ]


@router.get("/current", response_model=CurrentActivityResponse)
async def get_current_activity_endpoint(db: AsyncSession = Depends(get_db)):
    """Get the currently active activity from ActivityWatch"""
    current = await aw_get_current_activity()
    status = await check_activitywatch_status()

    if not current:
        raise HTTPException(status_code=404, detail="No current activity found")

    # Classify the activity
    classification = classify_activity(
        current.app_name,
        current.window_title,
        current.url
    )

    # Get URL info if available
    domain = None
    platform = None
    if current.url:
        url_info = url_analyzer.analyze(current.url)
        domain = url_info.get("domain")
        platform = url_info.get("platform")

    return CurrentActivityResponse(
        app_name=current.app_name,
        window_title=current.window_title,
        url=current.url,
        domain=domain,
        platform=platform,
        start_time=current.start_time,
        duration=current.duration,
        category=classification.category,
        productivity_score=classification.productivity_score,
        productivity_type=classification.productivity_type,
        is_afk=current.is_afk,
        activitywatch_available=status.get("available", False),
    )


@router.get("/summary/{date_str}", response_model=DailySummaryResponse)
async def get_daily_summary(
    date_str: str,
    db: AsyncSession = Depends(get_db),
):
    """Get daily summary for a specific date"""
    try:
        if date_str == "today":
            filter_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            filter_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD or 'today'")

    next_day = filter_date + timedelta(days=1)

    # Try to get from database first
    query = select(Activity).where(
        and_(
            Activity.start_time >= filter_date,
            Activity.start_time < next_day
        )
    )
    result = await db.execute(query)
    activities = result.scalars().all()

    # If no DB activities, fetch from ActivityWatch
    if not activities:
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
    else:
        activities_data = [
            {
                "app_name": a.app_name,
                "duration": a.duration,
                "productivity_score": a.productivity_score,
                "productivity_type": "productive" if a.productivity_score >= 0.6
                    else "distracting" if a.productivity_score <= 0.35 else "neutral",
                "category": a.category,
            }
            for a in activities
        ]

    # Filter out excluded apps (system processes, lock screen, etc.)
    active_activities = [a for a in activities_data if a["productivity_type"] != "excluded"]

    # Calculate totals (excluding system/idle time)
    total_time = sum(a["duration"] for a in active_activities)
    productive_time = sum(a["duration"] for a in active_activities if a["productivity_type"] == "productive")
    distracting_time = sum(a["duration"] for a in active_activities if a["productivity_type"] == "distracting")
    neutral_time = total_time - productive_time - distracting_time

    # Calculate productivity score
    productivity_score = productive_time / total_time if total_time > 0 else 0.0

    # Calculate focus score (A-F based on productivity and minimal distraction)
    if productivity_score >= 0.8 and distracting_time < total_time * 0.1:
        focus_score = "A"
    elif productivity_score >= 0.7:
        focus_score = "B"
    elif productivity_score >= 0.6:
        focus_score = "C"
    elif productivity_score >= 0.4:
        focus_score = "D"
    else:
        focus_score = "F"

    # Get top apps (excluding system apps)
    app_durations: dict = {}
    app_types: dict = {}
    for a in active_activities:
        app = a["app_name"]
        app_durations[app] = app_durations.get(app, 0) + a["duration"]
        app_types[app] = a["productivity_type"]

    sorted_apps = sorted(app_durations.items(), key=lambda x: x[1], reverse=True)
    top_apps = [
        {"app": app, "duration": dur, "productivity_type": app_types.get(app, "neutral")}
        for app, dur in sorted_apps[:5]
    ]

    top_distractions = [
        {"app": app, "duration": dur}
        for app, dur in sorted_apps
        if app_types.get(app) == "distracting"
    ][:5]

    # Categories breakdown (excluding system apps)
    categories: dict = {}
    for a in active_activities:
        cat = a["category"]
        categories[cat] = categories.get(cat, 0) + a["duration"]

    categories_list = [
        {"category": cat, "duration": dur, "percentage": (dur / total_time * 100) if total_time > 0 else 0}
        for cat, dur in sorted(categories.items(), key=lambda x: x[1], reverse=True)
    ]

    return DailySummaryResponse(
        date=date_str,
        total_time=total_time,
        productive_time=productive_time,
        distracting_time=distracting_time,
        neutral_time=neutral_time,
        productivity_score=round(productivity_score * 100, 1),
        focus_score=focus_score,
        top_apps=top_apps,
        top_distractions=top_distractions,
        categories=categories_list,
    )


@router.get("/timeline/{date_str}", response_model=TimelineResponse)
async def get_timeline(
    date_str: str,
    db: AsyncSession = Depends(get_db),
):
    """Get hourly timeline for a specific date"""
    try:
        if date_str == "today":
            filter_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            filter_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    next_day = filter_date + timedelta(days=1)

    # Fetch activities
    aw_activities = await activity_watch_client.get_activities(filter_date, next_day)

    # Group by hour
    hourly: dict = {h: [] for h in range(24)}

    for a in aw_activities:
        start = a["start_time"]
        if isinstance(start, str):
            start = datetime.fromisoformat(start.replace("Z", "+00:00"))
        hour = start.hour

        classification = classify_activity(a["app_name"], a["window_title"], a.get("url"))
        hourly[hour].append({
            "app_name": a["app_name"],
            "window_title": a["window_title"],
            "duration": a["duration"],
            "productivity_score": classification.productivity_score,
            "productivity_type": classification.productivity_type,
        })

    timeline = []
    for hour in range(24):
        activities = hourly[hour]
        total_duration = sum(a["duration"] for a in activities)
        avg_score = (
            sum(a["productivity_score"] * a["duration"] for a in activities) / total_duration
            if total_duration > 0 else 0.5
        )

        timeline.append(TimelineEntry(
            hour=hour,
            activities=activities[:5],  # Top 5 for each hour
            total_duration=total_duration,
            productivity_score=round(avg_score, 2),
        ))

    return TimelineResponse(date=date_str, timeline=timeline)


class ManualActivityCreate(BaseModel):
    app_name: str
    window_title: str
    start_time: datetime
    end_time: datetime
    category: str
    is_productive: bool
    notes: Optional[str] = None


@router.post("/manual", response_model=ActivityResponse)
async def create_manual_activity(
    activity: ManualActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Create a manual activity entry"""
    duration = int((activity.end_time - activity.start_time).total_seconds())

    # Create activity
    new_activity = Activity(
        id=str(uuid.uuid4()),
        user_id=current_user.id if current_user else None,
        app_name=activity.app_name,
        window_title=activity.window_title,
        start_time=activity.start_time,
        end_time=activity.end_time,
        duration=duration,
        category=activity.category,
        productivity_score=0.8 if activity.is_productive else 0.3,
        is_productive=activity.is_productive,
        extra_data={"manual": True, "notes": activity.notes} if activity.notes else {"manual": True},
    )

    db.add(new_activity)
    await db.commit()
    await db.refresh(new_activity)

    return ActivityResponse(
        id=new_activity.id,
        app_name=new_activity.app_name,
        window_title=new_activity.window_title,
        start_time=new_activity.start_time,
        end_time=new_activity.end_time,
        duration=new_activity.duration,
        category=new_activity.category,
        productivity_score=new_activity.productivity_score,
        is_productive=new_activity.is_productive,
        productivity_type="productive" if new_activity.is_productive else "neutral",
    )


@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete an activity"""
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    await db.delete(activity)
    await db.commit()

    return {"status": "deleted", "id": activity_id}


@router.get("/status")
async def get_activitywatch_status():
    """Check ActivityWatch connection status"""
    return await check_activitywatch_status()


# Browser Extension Endpoints
class BrowserActivityCreate(BaseModel):
    url: str
    title: str
    domain: Optional[str] = None
    platform: Optional[str] = None
    category: Optional[str] = "browsing"
    duration: int
    timestamp: datetime
    metadata: Optional[dict] = None


class HeartbeatData(BaseModel):
    url: str
    title: str
    domain: Optional[str] = None
    duration: int


@router.post("/browser")
async def track_browser_activity(
    activity: BrowserActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Track activity from browser extension"""
    # Classify the activity
    classification = classify_activity(
        "Browser",
        activity.title,
        activity.url
    )

    # Create activity record
    new_activity = Activity(
        id=str(uuid.uuid4()),
        user_id=current_user.id if current_user else None,
        app_name="Browser",
        window_title=activity.title,
        url=activity.url,
        domain=activity.domain,
        platform=activity.platform,
        start_time=activity.timestamp,
        end_time=activity.timestamp + timedelta(seconds=activity.duration),
        duration=activity.duration,
        category=activity.category or classification.category,
        productivity_score=classification.productivity_score,
        is_productive=classification.productivity_score >= 0.6,
        extra_data=activity.metadata or {"source": "browser_extension"},
    )

    db.add(new_activity)
    await db.commit()

    return {"status": "recorded", "id": new_activity.id}


@router.post("/heartbeat")
async def activity_heartbeat(data: HeartbeatData):
    """Heartbeat for current browser activity"""
    # This endpoint is used to track ongoing activity
    # Could be used to update real-time dashboards or WebSocket connections
    return {
        "status": "ok",
        "url": data.url,
        "duration": data.duration
    }


# ============== Time Stats Endpoints ==============

def _extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split("/")[0]
        return domain.replace("www.", "")
    except:
        return url


def _hash_url(url: str) -> str:
    """Create a short hash for URL identification"""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def _get_productivity_label(domain: str) -> str:
    """Get productivity label for domain"""
    productive_domains = [
        "github.com", "gitlab.com", "stackoverflow.com", "notion.so",
        "figma.com", "linear.app", "jira.atlassian.com", "docs.google.com"
    ]
    distracting_domains = [
        "youtube.com", "twitter.com", "facebook.com", "instagram.com",
        "tiktok.com", "reddit.com", "netflix.com", "twitch.tv"
    ]

    domain_lower = domain.lower()
    if any(d in domain_lower for d in productive_domains):
        return "productive"
    if any(d in domain_lower for d in distracting_domains):
        return "distracting"
    return "neutral"


# Known browsers for detection
BROWSER_APPS = [
    "google chrome", "chrome", "safari", "firefox", "microsoft edge",
    "edge", "brave", "arc", "opera", "vivaldi", "chromium"
]


def _is_browser_app(app_name: str) -> bool:
    """Check if app is a web browser"""
    app_lower = app_name.lower()
    return any(browser in app_lower for browser in BROWSER_APPS)


def _extract_site_from_window_title(title: str) -> str:
    """
    Extract site/domain name from browser window title.

    Examples:
    - "Architecting multi-agent systems - YouTube - Google Chrome - Insighter" → "YouTube"
    - "Price My Solar - Firebase Studio - Google Chrome - Insighter" → "Firebase"
    - "Productify Pro - Google Chrome - Insighter" → "Productify Pro"
    - "GitHub - anthropics/claude-code - Google Chrome" → "GitHub"
    """
    if not title:
        return "Other"

    # Remove browser suffix patterns
    # Pattern: "... - Google Chrome - Insighter" or "... - Google Chrome"
    clean_title = title
    for browser in BROWSER_APPS:
        # Handle "- Browser - Profile" pattern
        pattern = rf'\s*-\s*{re.escape(browser)}(\s*-\s*\w+)?$'
        clean_title = re.sub(pattern, '', clean_title, flags=re.IGNORECASE)

    clean_title = clean_title.strip()

    # Known site patterns to extract
    known_sites = {
        'youtube': 'YouTube',
        'netflix': 'Netflix',
        'udemy': 'Udemy',
        'coursera': 'Coursera',
        'github': 'GitHub',
        'gitlab': 'GitLab',
        'firebase': 'Firebase',
        'claude': 'Claude',
        'chatgpt': 'ChatGPT',
        'openai': 'OpenAI',
        'stackoverflow': 'Stack Overflow',
        'stack overflow': 'Stack Overflow',
        'localhost': 'Localhost',
        'productify': 'Productify Pro',
        'twitter': 'Twitter',
        'x.com': 'Twitter',
        'reddit': 'Reddit',
        'linkedin': 'LinkedIn',
        'figma': 'Figma',
        'notion': 'Notion',
        'slack': 'Slack',
        'discord': 'Discord',
        'twitch': 'Twitch',
        'amazon': 'Amazon',
        'google docs': 'Google Docs',
        'google sheets': 'Google Sheets',
        'google drive': 'Google Drive',
        'gmail': 'Gmail',
        'outlook': 'Outlook',
        'trello': 'Trello',
        'jira': 'Jira',
        'asana': 'Asana',
        'vercel': 'Vercel',
        'netlify': 'Netlify',
        'heroku': 'Heroku',
        'aws': 'AWS',
        'azure': 'Azure',
        'digitalocean': 'DigitalOcean',
        'coolify': 'Coolify',
        'hulu': 'Hulu',
        'disney+': 'Disney+',
        'hbo': 'HBO Max',
        'prime video': 'Prime Video',
        'spotify': 'Spotify',
        'soundcloud': 'SoundCloud',
        'medium': 'Medium',
        'dev.to': 'Dev.to',
        'hashnode': 'Hashnode',
        'codepen': 'CodePen',
        'codesandbox': 'CodeSandbox',
        'replit': 'Replit',
        'kaggle': 'Kaggle',
        'leetcode': 'LeetCode',
        'hackerrank': 'HackerRank',
    }

    title_lower = clean_title.lower()

    # Check for known sites
    for key, site_name in known_sites.items():
        if key in title_lower:
            return site_name

    # Try to extract site from title format "Page Title - Site Name"
    # Work backwards from the cleaned title
    parts = clean_title.split(' - ')
    if len(parts) >= 2:
        # The last part is usually the site name
        potential_site = parts[-1].strip()
        # Avoid returning very long strings or page titles
        if potential_site and len(potential_site) < 30:
            return potential_site

    # If title is short enough, use it as-is
    if len(clean_title) < 40:
        return clean_title or "Other"

    # Truncate long titles
    return clean_title[:30] + "..." if clean_title else "Other"


@router.get("/stats/time")
async def get_time_stats(
    day_start_hour: int = Query(default=0, ge=0, le=23),
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive time stats: today, week, month"""
    now = datetime.now()

    # Calculate day start based on user preference
    if now.hour < day_start_hour:
        day_start = datetime.combine(now.date() - timedelta(days=1), time(day_start_hour, 0))
    else:
        day_start = datetime.combine(now.date(), time(day_start_hour, 0))

    # Week start (Monday at day_start_hour)
    days_since_monday = now.weekday()
    week_start = datetime.combine(
        now.date() - timedelta(days=days_since_monday),
        time(day_start_hour, 0)
    )

    # Month start
    month_start = datetime.combine(
        now.replace(day=1).date(),
        time(day_start_hour, 0)
    )

    # Get today's stats
    today_activities = await activity_watch_client.get_activities(day_start, now)
    today_total = sum(a.get("duration", 0) for a in today_activities)
    today_productive = sum(
        a.get("duration", 0) for a in today_activities
        if classify_activity(a.get("app_name", ""), a.get("window_title", ""), a.get("url")).productivity_type == "productive"
    )
    today_productivity = round((today_productive / today_total * 100) if today_total > 0 else 0)

    # Get week stats
    week_activities = await activity_watch_client.get_activities(week_start, now)
    week_total = sum(a.get("duration", 0) for a in week_activities)
    week_productive = sum(
        a.get("duration", 0) for a in week_activities
        if classify_activity(a.get("app_name", ""), a.get("window_title", ""), a.get("url")).productivity_type == "productive"
    )
    week_productivity = round((week_productive / week_total * 100) if week_total > 0 else 0)

    # Get month stats
    month_activities = await activity_watch_client.get_activities(month_start, now)
    month_total = sum(a.get("duration", 0) for a in month_activities)
    month_productive = sum(
        a.get("duration", 0) for a in month_activities
        if classify_activity(a.get("app_name", ""), a.get("window_title", ""), a.get("url")).productivity_type == "productive"
    )
    month_productivity = round((month_productive / month_total * 100) if month_total > 0 else 0)

    # Calculate focus score
    def get_focus_score(productivity: int) -> str:
        if productivity >= 80: return "A+"
        if productivity >= 70: return "A"
        if productivity >= 60: return "B"
        if productivity >= 50: return "C"
        if productivity >= 40: return "D"
        return "F"

    return {
        "today": {
            "total_time": today_total,
            "productive_time": today_productive,
            "productivity": today_productivity,
            "focus_score": get_focus_score(today_productivity),
            "start_time": day_start.isoformat(),
            "sessions": len(set(a.get("app_name", "") for a in today_activities))
        },
        "week": {
            "total_time": week_total,
            "productive_time": week_productive,
            "productivity": week_productivity,
            "start_time": week_start.isoformat(),
            "days_tracked": min(days_since_monday + 1, 7)
        },
        "month": {
            "total_time": month_total,
            "productive_time": month_productive,
            "productivity": month_productivity,
            "start_time": month_start.isoformat(),
            "days_tracked": now.day
        },
        "day_start_hour": day_start_hour
    }


@router.get("/history")
async def get_activity_history(
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    date: Optional[str] = None,
    domain: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get full activity history with all entries (with duplicates)"""
    # Determine date range
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d")
            start = filter_date
            end = filter_date + timedelta(days=1)
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    else:
        # Default to today
        start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

    # Get activities from ActivityWatch
    aw_activities = await activity_watch_client.get_activities(start, end)

    # Process and format events
    history = []
    for idx, event in enumerate(aw_activities):
        app_name = event.get("app_name", "Unknown")
        window_title = event.get("window_title", "")
        url = event.get("url", "")
        timestamp = event.get("start_time", "")
        duration = event.get("duration", 0)

        # Get domain from URL or app
        if url:
            domain_name = _extract_domain(url)
        else:
            domain_name = app_name

        # Apply domain filter
        if domain and domain_name != domain:
            continue

        # Classify activity
        classification = classify_activity(app_name, window_title, url)

        history.append({
            "id": hash(f"{timestamp}{url}{window_title}") % (10 ** 9),
            "url": url,
            "title": window_title,
            "domain": domain_name,
            "app": app_name,
            "duration": int(duration),
            "timestamp": timestamp,
            "category": classification.category,
            "is_productive": classification.productivity_type == "productive",
            "productivity_type": classification.productivity_type,
            "url_hash": _hash_url(url) if url else None
        })

    # Sort by timestamp descending
    history.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "activities": history[offset:offset + limit],
        "total": len(history),
        "has_more": len(history) > offset + limit
    }


@router.get("/platforms")
async def get_platforms_summary(
    period: str = Query(default="today", regex="^(today|week|month|all|custom)$"),
    date: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated stats per platform/domain (no duplicates)"""
    now = datetime.now()

    # Calculate time range
    if period == "custom" and date:
        try:
            start = datetime.strptime(date, "%Y-%m-%d")
            end = start + timedelta(days=1)
        except ValueError:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
    elif period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:
        start = now - timedelta(days=365)
        end = now

    # Get all events for period
    activities = await activity_watch_client.get_activities(start, end)

    # Aggregate by domain
    from collections import defaultdict
    platforms = defaultdict(lambda: {
        "total_time": 0,
        "visit_count": 0,
        "urls": set(),
        "sites": set(),  # Extracted site names for browsers
        "last_visited": None,
        "last_title": ""
    })

    for event in activities:
        url = event.get("url", "")
        app_name = event.get("app_name", "")
        duration = event.get("duration", 0)
        timestamp = event.get("start_time", "")
        title = event.get("window_title", "")

        # For browsers, always use app_name as the platform (not URL domain)
        # This groups all Chrome activities under "Google Chrome"
        if _is_browser_app(app_name):
            platform_key = app_name
        else:
            platform_key = _extract_domain(url) if url else app_name

        if not platform_key:
            continue

        platforms[platform_key]["total_time"] += duration
        platforms[platform_key]["visit_count"] += 1
        if url:
            platforms[platform_key]["urls"].add(url)

        # For browsers, track extracted site names from window titles
        if _is_browser_app(app_name):
            site = _extract_site_from_window_title(title)
            platforms[platform_key]["sites"].add(site)

        if not platforms[platform_key]["last_visited"] or timestamp > platforms[platform_key]["last_visited"]:
            platforms[platform_key]["last_visited"] = timestamp
            platforms[platform_key]["last_title"] = title

    # Convert to list and add metadata
    result = []
    for domain, stats in platforms.items():
        classification = classify_activity(domain, "", "")
        is_browser = _is_browser_app(domain)

        # For browsers, unique_urls = number of unique sites
        # For other apps, use URL count or visit count
        if is_browser:
            unique_count = len(stats["sites"]) if stats["sites"] else stats["visit_count"]
        else:
            unique_count = len(stats["urls"]) if stats["urls"] else stats["visit_count"]

        result.append({
            "domain": domain,
            "total_time": int(stats["total_time"]),
            "visit_count": stats["visit_count"],
            "unique_urls": unique_count,
            "productivity": _get_productivity_label(domain),
            "category": classification.category,
            "last_visited": stats["last_visited"],
            "last_title": stats["last_title"],
            "is_productive": classification.productivity_type == "productive",
            "is_browser": is_browser
        })

    # Sort by total time descending
    result.sort(key=lambda x: x["total_time"], reverse=True)

    return {
        "platforms": result,
        "total_platforms": len(result)
    }


@router.get("/websites")
async def get_websites_summary(
    period: str = Query(default="today", regex="^(today|week|month|all|custom)$"),
    date: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get all websites/URLs visited (extracted from browser window titles)"""
    now = datetime.now()

    # Calculate time range
    if period == "custom" and date:
        try:
            start = datetime.strptime(date, "%Y-%m-%d")
            end = start + timedelta(days=1)
        except ValueError:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
    elif period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:
        start = now - timedelta(days=365)
        end = now

    activities = await activity_watch_client.get_activities(start, end)

    # Extract websites from browser activities
    from collections import defaultdict
    websites = defaultdict(lambda: {
        "total_time": 0,
        "visit_count": 0,
        "pages": set(),
        "last_visited": None,
        "category": "browsing"
    })

    for event in activities:
        app_name = event.get("app_name", "")
        title = event.get("window_title", "")
        duration = event.get("duration", 0)
        timestamp = event.get("start_time", "")

        # Only process browser activities
        if not _is_browser_app(app_name):
            continue

        # Extract site name from window title
        site = _extract_site_from_window_title(title)
        if not site or site == "Other":
            continue

        websites[site]["total_time"] += duration
        websites[site]["visit_count"] += 1
        websites[site]["pages"].add(title)  # Track unique page titles

        if not websites[site]["last_visited"] or timestamp > websites[site]["last_visited"]:
            websites[site]["last_visited"] = timestamp

    # Convert to list
    result = []
    for site, stats in websites.items():
        classification = classify_activity("Browser", site, "")
        result.append({
            "site": site,
            "total_time": int(stats["total_time"]),
            "visit_count": stats["visit_count"],
            "pages": len(stats["pages"]),
            "productivity": _get_productivity_label(site),
            "category": classification.category,
            "last_visited": stats["last_visited"]
        })

    # Sort by total time
    result.sort(key=lambda x: x["total_time"], reverse=True)

    return {
        "websites": result,
        "total_websites": len(result)
    }


@router.get("/websites/{site}")
async def get_website_detail(
    site: str,
    period: str = Query(default="today", regex="^(today|week|month|all|custom)$"),
    date: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed history for a specific website"""
    now = datetime.now()

    # Calculate time range
    if period == "custom" and date:
        try:
            start = datetime.strptime(date, "%Y-%m-%d")
            end = start + timedelta(days=1)
        except ValueError:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
    elif period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:
        start = now - timedelta(days=365)
        end = now

    activities = await activity_watch_client.get_activities(start, end)

    # Filter activities for this website and group by page title
    from collections import defaultdict
    pages = defaultdict(lambda: {
        "total_time": 0,
        "visit_count": 0,
        "visits": []
    })

    total_time = 0
    total_visits = 0

    for event in activities:
        app_name = event.get("app_name", "")
        title = event.get("window_title", "")
        duration = event.get("duration", 0)
        timestamp = event.get("start_time", "")

        # Only process browser activities
        if not _is_browser_app(app_name):
            continue

        # Check if this activity belongs to the requested site
        extracted_site = _extract_site_from_window_title(title)
        if extracted_site != site:
            continue

        # Extract page title (remove browser and site suffix)
        page_title = title
        for browser in BROWSER_APPS:
            pattern = rf'\s*-\s*{re.escape(browser)}(\s*-\s*\w+)?$'
            page_title = re.sub(pattern, '', page_title, flags=re.IGNORECASE)
        page_title = page_title.strip()

        # For known sites, clean up further
        if site == "YouTube":
            page_title = page_title.replace(" - YouTube", "").strip()
        elif site == "Netflix":
            page_title = page_title.replace(" - Netflix", "").strip()
        elif site == "GitHub":
            page_title = page_title.replace(" · GitHub", "").strip()

        pages[page_title]["total_time"] += duration
        pages[page_title]["visit_count"] += 1
        pages[page_title]["visits"].append({
            "timestamp": timestamp,
            "duration": int(duration)
        })
        total_time += duration
        total_visits += 1

    # Convert to list
    page_list = []
    for page_title, stats in pages.items():
        page_list.append({
            "title": page_title,
            "total_time": int(stats["total_time"]),
            "visit_count": stats["visit_count"],
            "visits": sorted(stats["visits"], key=lambda x: x["timestamp"], reverse=True)[:30]
        })

    # Sort by total time
    page_list.sort(key=lambda x: x["total_time"], reverse=True)

    classification = classify_activity("Browser", site, "")

    return {
        "site": site,
        "total_time": int(total_time),
        "visit_count": total_visits,
        "productivity": _get_productivity_label(site),
        "category": classification.category,
        "pages": page_list
    }


@router.get("/platforms/{domain}")
async def get_platform_detail(
    domain: str,
    period: str = Query(default="today", regex="^(today|week|month|all|custom)$"),
    date: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed history for a specific platform/domain"""
    now = datetime.now()

    # Calculate time range
    if period == "custom" and date:
        try:
            start = datetime.strptime(date, "%Y-%m-%d")
            end = start + timedelta(days=1)
        except ValueError:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
    elif period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:
        start = now - timedelta(days=365)
        end = now

    activities = await activity_watch_client.get_activities(start, end)

    # Check if this is a browser app
    is_browser = _is_browser_app(domain)

    # Group activities by site (extracted from title for browsers) or by URL
    from collections import defaultdict
    sites = defaultdict(lambda: {
        "site_name": "",
        "total_time": 0,
        "visit_count": 0,
        "visits": [],
        "urls": set()
    })

    total_time = 0

    for event in activities:
        url = event.get("url", "")
        app_name = event.get("app_name", "")
        event_domain = _extract_domain(url) if url else app_name

        # For browsers, match by app name (so all Chrome activities go under Chrome)
        # For other apps, match by domain
        if is_browser:
            if app_name != domain:
                continue
        else:
            if event_domain != domain:
                continue

        duration = event.get("duration", 0)
        timestamp = event.get("start_time", "")
        title = event.get("window_title", "")

        # Determine grouping key - always extract from window title for browsers
        if is_browser:
            # Extract site name from window title (works with or without extension)
            site_key = _extract_site_from_window_title(title)
        else:
            # For non-browser apps (like VS Code), use URL or title
            site_key = url if url else title

        sites[site_key]["site_name"] = site_key
        sites[site_key]["total_time"] += duration
        sites[site_key]["visit_count"] += 1
        sites[site_key]["visits"].append({
            "timestamp": timestamp,
            "duration": int(duration),
            "title": title
        })
        if url:
            sites[site_key]["urls"].add(url)
        total_time += duration

    # Convert to list
    url_list = []
    for site_key, stats in sites.items():
        url_list.append({
            "url": site_key,
            "url_hash": _hash_url(site_key),
            "title": stats["site_name"],
            "total_time": int(stats["total_time"]),
            "visit_count": stats["visit_count"],
            "unique_urls": len(stats["urls"]),
            "visits": sorted(stats["visits"], key=lambda x: x["timestamp"], reverse=True)[:50]
        })

    url_list.sort(key=lambda x: x["total_time"], reverse=True)

    classification = classify_activity(domain, "", "")

    return {
        "domain": domain,
        "total_time": int(total_time),
        "unique_urls": len(url_list),
        "productivity": _get_productivity_label(domain),
        "category": classification.category,
        "is_productive": classification.productivity_type == "productive",
        "is_browser": is_browser,
        "urls": url_list
    }


@router.get("/urls/{url_hash}")
async def get_url_history(
    url_hash: str,
    db: AsyncSession = Depends(get_db),
):
    """Get history for a specific URL"""
    # Get recent activities
    now = datetime.now()
    start = now - timedelta(days=30)
    activities = await activity_watch_client.get_activities(start, now)

    # Find matching URL
    matching = []
    for event in activities:
        url = event.get("url", "")
        if url and _hash_url(url) == url_hash:
            matching.append({
                "timestamp": event.get("start_time", ""),
                "duration": int(event.get("duration", 0)),
                "title": event.get("window_title", ""),
                "url": url
            })

    if not matching:
        raise HTTPException(404, "URL not found")

    matching.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "url": matching[0]["url"] if matching else "",
        "visits": matching,
        "total_visits": len(matching),
        "total_time": sum(v["duration"] for v in matching)
    }


# ============== Real-Time Activity Endpoints ==============

# In-memory tracking state
_tracking_state = {"enabled": True}


@router.get("/current-realtime")
async def get_current_activity_realtime():
    """Get current activity and live stats for real-time display"""
    try:
        current = await aw_get_current_activity()
        now = datetime.now()
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get today's activities for quick stats
        today_activities = await activity_watch_client.get_activities(day_start, now)
        today_total = sum(a.get("duration", 0) for a in today_activities)
        today_productive = sum(
            a.get("duration", 0) for a in today_activities
            if classify_activity(a.get("app_name", ""), a.get("window_title", ""), a.get("url")).productivity_type == "productive"
        )
        productivity = round((today_productive / today_total * 100) if today_total > 0 else 0)

        # Get week total (cached calculation, less precise but fast)
        week_activities = await activity_watch_client.get_activities(week_start, now)
        week_total = sum(a.get("duration", 0) for a in week_activities)

        # Get month total
        month_activities = await activity_watch_client.get_activities(month_start, now)
        month_total = sum(a.get("duration", 0) for a in month_activities)

        current_activity = None
        if current:
            classification = classify_activity(
                current.app_name,
                current.window_title,
                current.url
            )
            current_activity = {
                "app_name": current.app_name,
                "title": current.window_title,
                "duration": current.duration,
                "start_time": current.start_time.isoformat() if current.start_time else now.isoformat(),
                "category": classification.category,
                "is_productive": classification.productivity_type == "productive"
            }

        return {
            "current_activity": current_activity,
            "stats": {
                "today_total": int(today_total),
                "today_productive": int(today_productive),
                "productivity": productivity,
                "week_total": int(week_total),
                "month_total": int(month_total)
            },
            "is_tracking": _tracking_state["enabled"],
            "timestamp": now.isoformat()
        }
    except Exception as e:
        print(f"Error getting current activity: {e}")
        return {
            "current_activity": None,
            "stats": {
                "today_total": 0,
                "today_productive": 0,
                "productivity": 0,
                "week_total": 0,
                "month_total": 0
            },
            "is_tracking": _tracking_state["enabled"],
            "timestamp": datetime.now().isoformat()
        }


@router.post("/toggle-tracking")
async def toggle_tracking(data: dict):
    """Toggle tracking on/off"""
    tracking = data.get("tracking", True)
    _tracking_state["enabled"] = tracking
    return {"tracking": tracking}


@router.get("/recent")
async def get_recent_activities(
    limit: int = Query(default=10, le=50),
):
    """Get recent activities - optimized for fast loading"""
    try:
        now = datetime.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        activities = await activity_watch_client.get_activities(start, now)

        result = []
        for event in activities[:limit]:
            app_name = event.get("app_name", "Unknown")
            window_title = event.get("window_title", "")
            url = event.get("url", "")

            classification = classify_activity(app_name, window_title, url)

            result.append({
                "id": hash(event.get("start_time", "")) % (10 ** 9),
                "app_name": app_name,
                "title": window_title,
                "duration": int(event.get("duration", 0)),
                "timestamp": event.get("start_time", ""),
                "category": classification.category,
                "is_productive": classification.productivity_type == "productive"
            })

        return result
    except Exception as e:
        print(f"Error getting recent activities: {e}")
        return []


@router.get("/diagnostics")
async def get_activity_diagnostics():
    """Get diagnostic information about activity tracking"""
    try:
        status = await check_activitywatch_status()
        now = datetime.now()
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Try to get current activity
        current = await aw_get_current_activity()

        # Try to get today's activities count
        try:
            activities = await activity_watch_client.get_activities(day_start, now)
            activity_count = len(activities)
        except Exception:
            activity_count = 0

        return {
            "timestamp": now.isoformat(),
            "activitywatch": {
                "available": status.get("available", False),
                "url": status.get("url", "http://localhost:5600"),
                "buckets": status.get("buckets", []),
                "error": status.get("error")
            },
            "tracking": {
                "enabled": _tracking_state["enabled"],
                "has_current_activity": current is not None,
                "current_app": current.app_name if current else None,
                "activities_today": activity_count
            },
            "system": {
                "backend_version": "0.1.0",
                "day_start": day_start.isoformat()
            }
        }
    except Exception as e:
        return {
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "activitywatch": {"available": False},
            "tracking": {"enabled": _tracking_state["enabled"]}
        }


# ============== Video Platform Details ==============

def _extract_video_info_from_title(title: str) -> dict:
    """
    Extract video platform info from WINDOW TITLE only (no URL needed).
    Works with ANY browser - Chrome, Firefox, Safari, Edge, etc.

    Examples:
    - "How to Code in Python - YouTube" → YouTube, "How to Code in Python"
    - "React Tutorial | Udemy" → Udemy, "React Tutorial"
    - "Stranger Things - Netflix" → Netflix, "Stranger Things"
    """
    info = {
        "platform": None,
        "video_id": None,
        "video_title": None,
        "channel": None,
        "is_video_platform": False,
        "detected_from": "window_title"
    }

    if not title:
        return info

    title_lower = title.lower()

    # YouTube - "Video Title - YouTube" or "(123) Video Title - YouTube"
    if " - youtube" in title_lower:
        info["platform"] = "YouTube"
        info["is_video_platform"] = True
        # Remove " - YouTube" suffix
        video_title = title.rsplit(" - YouTube", 1)[0].strip()
        # Remove notification count like "(5) " at start
        if video_title.startswith("(") and ") " in video_title:
            video_title = video_title.split(") ", 1)[1]
        info["video_title"] = video_title

    # Udemy - "Lecture Title | Udemy"
    elif " | udemy" in title_lower or "udemy" in title_lower:
        info["platform"] = "Udemy"
        info["is_video_platform"] = True
        if " | Udemy" in title:
            info["video_title"] = title.rsplit(" | Udemy", 1)[0].strip()
        elif " - Udemy" in title:
            info["video_title"] = title.rsplit(" - Udemy", 1)[0].strip()
        else:
            info["video_title"] = title

    # Netflix - "Show Name - Netflix"
    elif " - netflix" in title_lower:
        info["platform"] = "Netflix"
        info["is_video_platform"] = True
        info["video_title"] = title.rsplit(" - Netflix", 1)[0].strip()

    # Amazon Prime Video
    elif "prime video" in title_lower:
        info["platform"] = "Prime Video"
        info["is_video_platform"] = True
        if " - Prime Video" in title:
            info["video_title"] = title.rsplit(" - Prime Video", 1)[0].strip()
        else:
            info["video_title"] = title

    # Disney+
    elif "disney+" in title_lower or "disneyplus" in title_lower:
        info["platform"] = "Disney+"
        info["is_video_platform"] = True
        info["video_title"] = title.replace(" | Disney+", "").replace(" - Disney+", "").strip()

    # Coursera - "Course Name | Coursera"
    elif " | coursera" in title_lower or "coursera" in title_lower:
        info["platform"] = "Coursera"
        info["is_video_platform"] = True
        if " | Coursera" in title:
            info["video_title"] = title.rsplit(" | Coursera", 1)[0].strip()
        else:
            info["video_title"] = title

    # Pluralsight
    elif "pluralsight" in title_lower:
        info["platform"] = "Pluralsight"
        info["is_video_platform"] = True
        if " | Pluralsight" in title:
            info["video_title"] = title.rsplit(" | Pluralsight", 1)[0].strip()
        else:
            info["video_title"] = title

    # LinkedIn Learning
    elif "linkedin learning" in title_lower:
        info["platform"] = "LinkedIn Learning"
        info["is_video_platform"] = True
        info["video_title"] = title.replace(" | LinkedIn Learning", "").strip()

    # Skillshare
    elif "skillshare" in title_lower:
        info["platform"] = "Skillshare"
        info["is_video_platform"] = True
        info["video_title"] = title.replace(" | Skillshare", "").replace(" - Skillshare", "").strip()

    # Twitch - "ChannelName - Twitch"
    elif " - twitch" in title_lower:
        info["platform"] = "Twitch"
        info["is_video_platform"] = True
        parts = title.rsplit(" - Twitch", 1)[0].strip()
        info["video_title"] = parts
        # First part is usually channel name
        if " - " in parts:
            info["channel"] = parts.split(" - ")[0]

    # Vimeo
    elif "vimeo" in title_lower:
        info["platform"] = "Vimeo"
        info["is_video_platform"] = True
        if " on Vimeo" in title:
            info["video_title"] = title.rsplit(" on Vimeo", 1)[0].strip()
        else:
            info["video_title"] = title

    # Khan Academy
    elif "khan academy" in title_lower:
        info["platform"] = "Khan Academy"
        info["is_video_platform"] = True
        info["video_title"] = title.replace(" | Khan Academy", "").replace(" - Khan Academy", "").strip()

    # edX
    elif "edx" in title_lower:
        info["platform"] = "edX"
        info["is_video_platform"] = True
        info["video_title"] = title.replace(" | edX", "").strip()

    # Hulu
    elif "hulu" in title_lower:
        info["platform"] = "Hulu"
        info["is_video_platform"] = True
        info["video_title"] = title.replace(" - Hulu", "").strip()

    # HBO Max
    elif "hbo max" in title_lower or "max.com" in title_lower:
        info["platform"] = "HBO Max"
        info["is_video_platform"] = True
        info["video_title"] = title.replace(" | HBO Max", "").replace(" - HBO Max", "").strip()

    return info


def _extract_video_info(url: str, title: str) -> dict:
    """
    Extract video details from URL and/or window title.
    Works with or without URL - falls back to window title parsing.
    """
    from urllib.parse import urlparse, parse_qs

    # First, try to extract from window title (works without extension)
    info = _extract_video_info_from_title(title)

    # If we have a URL, enhance with URL-based info
    if url:
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower().replace("www.", "")

            # YouTube - get video ID from URL
            if "youtube.com" in domain or "youtu.be" in domain:
                info["platform"] = "YouTube"
                info["is_video_platform"] = True
                info["detected_from"] = "url"

                if "youtu.be" in domain:
                    info["video_id"] = parsed.path.strip("/")
                else:
                    params = parse_qs(parsed.query)
                    info["video_id"] = params.get("v", [None])[0]

                # Use title-extracted video title if available
                if not info["video_title"] and " - YouTube" in title:
                    info["video_title"] = title.rsplit(" - YouTube", 1)[0].strip()

            # Udemy - get lecture ID from URL
            elif "udemy.com" in domain:
                info["platform"] = "Udemy"
                info["is_video_platform"] = True
                info["detected_from"] = "url"

                if "/learn/lecture/" in parsed.path:
                    parts = parsed.path.split("/")
                    for i, part in enumerate(parts):
                        if part == "lecture" and i + 1 < len(parts):
                            info["video_id"] = parts[i + 1]
                        if part == "course" and i + 1 < len(parts):
                            info["channel"] = parts[i + 1].replace("-", " ").title()

            # Netflix
            elif "netflix.com" in domain:
                info["platform"] = "Netflix"
                info["is_video_platform"] = True
                info["detected_from"] = "url"
                # Netflix watch URL: /watch/12345678
                if "/watch/" in parsed.path:
                    info["video_id"] = parsed.path.split("/watch/")[1].split("?")[0]

            # Twitch
            elif "twitch.tv" in domain:
                info["platform"] = "Twitch"
                info["is_video_platform"] = True
                info["detected_from"] = "url"
                channel = parsed.path.strip("/").split("/")[0] if parsed.path else None
                info["channel"] = channel

            # Coursera
            elif "coursera.org" in domain:
                info["platform"] = "Coursera"
                info["is_video_platform"] = True
                info["detected_from"] = "url"

            # Vimeo
            elif "vimeo.com" in domain:
                info["platform"] = "Vimeo"
                info["is_video_platform"] = True
                info["detected_from"] = "url"
                # Vimeo URL: vimeo.com/123456789
                video_id = parsed.path.strip("/").split("/")[0]
                if video_id.isdigit():
                    info["video_id"] = video_id

        except Exception:
            pass

    return info


@router.get("/video-platforms")
async def get_video_platform_activity(
    period: str = Query(default="today", regex="^(today|week|month)$"),
):
    """Get detailed video platform activity (YouTube, Udemy, Netflix, etc.)"""
    now = datetime.now()

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    activities = await activity_watch_client.get_activities(start, now)

    # Filter and process video platform activities
    video_activities = []
    platforms_summary = {}
    videos_watched = {}

    for activity in activities:
        url = activity.get("url", "")
        title = activity.get("window_title", "")
        duration = activity.get("duration", 0)
        timestamp = activity.get("start_time", "")

        video_info = _extract_video_info(url, title)

        if video_info["is_video_platform"]:
            platform = video_info["platform"]
            video_title = video_info["video_title"]
            video_id = video_info["video_id"]

            # Platform summary
            if platform not in platforms_summary:
                platforms_summary[platform] = {
                    "total_time": 0,
                    "video_count": 0,
                    "videos": []
                }
            platforms_summary[platform]["total_time"] += duration

            # Track unique videos
            video_key = f"{platform}:{video_id or video_title}"
            if video_key not in videos_watched:
                videos_watched[video_key] = {
                    "platform": platform,
                    "video_id": video_id,
                    "title": video_title,
                    "channel": video_info["channel"],
                    "url": url,
                    "total_time": 0,
                    "watch_count": 0,
                    "sessions": []
                }

            videos_watched[video_key]["total_time"] += duration
            videos_watched[video_key]["watch_count"] += 1
            videos_watched[video_key]["sessions"].append({
                "timestamp": timestamp,
                "duration": duration
            })

            video_activities.append({
                "platform": platform,
                "video_title": video_title,
                "video_id": video_id,
                "channel": video_info["channel"],
                "url": url,
                "duration": duration,
                "timestamp": timestamp
            })

    # Process platform summaries
    for platform, data in platforms_summary.items():
        platform_videos = [v for v in videos_watched.values() if v["platform"] == platform]
        data["video_count"] = len(platform_videos)
        data["videos"] = sorted(platform_videos, key=lambda x: x["total_time"], reverse=True)[:10]

    return {
        "period": period,
        "total_video_time": sum(p["total_time"] for p in platforms_summary.values()),
        "platforms": platforms_summary,
        "recent_videos": sorted(video_activities, key=lambda x: x["timestamp"], reverse=True)[:20],
        "unique_videos_count": len(videos_watched)
    }


# ============== Browser Extension Endpoints ==============

# In-memory storage for extension data (replace with database in production)
_extension_data = {
    "browser_activities": [],
    "video_progress": [],
    "video_completed": [],
    "course_progress": [],
    "heartbeats": {}
}


@router.post("/browser")
async def receive_browser_activity(data: dict):
    """Receive browsing activity from extension"""
    activity = {
        **data,
        "received_at": datetime.now().isoformat(),
        "source": "extension"
    }

    _extension_data["browser_activities"].append(activity)

    # Keep only last 5000
    if len(_extension_data["browser_activities"]) > 5000:
        _extension_data["browser_activities"] = _extension_data["browser_activities"][-5000:]

    return {"success": True, "id": len(_extension_data["browser_activities"])}


@router.post("/heartbeat")
async def receive_heartbeat(data: dict):
    """Receive heartbeat from extension"""
    domain = data.get("domain", "unknown")
    _extension_data["heartbeats"][domain] = {
        **data,
        "last_seen": datetime.now().isoformat()
    }
    return {"success": True}


@router.post("/video-progress")
async def receive_video_progress(data: dict):
    """Receive video watching progress from extension"""
    progress = {
        **data,
        "received_at": datetime.now().isoformat()
    }

    _extension_data["video_progress"].append(progress)

    # Keep only last 1000
    if len(_extension_data["video_progress"]) > 1000:
        _extension_data["video_progress"] = _extension_data["video_progress"][-1000:]

    return {"success": True}


@router.post("/video-completed")
async def receive_video_completed(data: dict):
    """Receive video completion event from extension"""
    completed = {
        **data,
        "received_at": datetime.now().isoformat()
    }

    _extension_data["video_completed"].append(completed)

    return {"success": True}


@router.post("/course-progress")
async def receive_course_progress(data: dict):
    """Receive course progress from extension (Udemy, Coursera)"""
    progress = {
        **data,
        "received_at": datetime.now().isoformat()
    }

    _extension_data["course_progress"].append(progress)

    return {"success": True}


@router.get("/extension/stats")
async def get_extension_stats():
    """Get stats from browser extension data"""
    browser_activities = _extension_data["browser_activities"]
    video_progress = _extension_data["video_progress"]

    # Get today's data
    today = datetime.now().date().isoformat()

    today_activities = [
        a for a in browser_activities
        if a.get("timestamp", "").startswith(today)
    ]

    # Aggregate by domain
    domains = {}
    for a in today_activities:
        domain = a.get("domain", "unknown")
        if domain not in domains:
            domains[domain] = {"time": 0, "visits": 0}
        domains[domain]["time"] += a.get("duration", 0)
        domains[domain]["visits"] += 1

    # Get video watching stats
    today_videos = [
        v for v in video_progress
        if v.get("timestamp", "").startswith(today)
    ]

    videos_by_platform = {}
    for v in today_videos:
        platform = v.get("platform", "unknown")
        if platform not in videos_by_platform:
            videos_by_platform[platform] = {"count": 0, "videos": set()}
        videos_by_platform[platform]["count"] += 1
        if v.get("videoId"):
            videos_by_platform[platform]["videos"].add(v["videoId"])

    # Convert sets to counts
    for platform in videos_by_platform:
        videos_by_platform[platform]["unique_videos"] = len(videos_by_platform[platform]["videos"])
        del videos_by_platform[platform]["videos"]

    return {
        "today": {
            "total_browsing_time": sum(d["time"] for d in domains.values()),
            "total_sites_visited": len(domains),
            "top_domains": sorted(domains.items(), key=lambda x: x[1]["time"], reverse=True)[:10],
            "video_platforms": videos_by_platform
        },
        "totals": {
            "browser_activities": len(browser_activities),
            "video_progress_events": len(video_progress),
            "videos_completed": len(_extension_data["video_completed"]),
            "course_progress_events": len(_extension_data["course_progress"])
        }
    }


@router.get("/extension/videos")
async def get_extension_video_history(
    period: str = Query(default="today", regex="^(today|week|all)$"),
    limit: int = Query(default=50, le=200)
):
    """Get detailed video watching history from extension"""
    video_progress = _extension_data["video_progress"]
    video_completed = _extension_data["video_completed"]

    now = datetime.now()
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=7)
    else:
        start = datetime.min

    # Filter by period
    filtered = []
    for v in video_progress:
        try:
            ts = datetime.fromisoformat(v.get("timestamp", "").replace("Z", "+00:00"))
            if ts.replace(tzinfo=None) >= start:
                filtered.append(v)
        except:
            pass

    # Group by video
    videos = {}
    for v in filtered:
        key = f"{v.get('platform')}:{v.get('videoId') or v.get('videoTitle')}"
        if key not in videos:
            videos[key] = {
                "platform": v.get("platform"),
                "videoId": v.get("videoId"),
                "title": v.get("videoTitle"),
                "channel": v.get("channelName"),
                "duration": v.get("videoDuration"),
                "max_progress": 0,
                "watch_sessions": 0,
                "completed": False,
                "first_watched": v.get("timestamp"),
                "last_watched": v.get("timestamp")
            }

        videos[key]["max_progress"] = max(videos[key]["max_progress"], v.get("progress", 0))
        videos[key]["watch_sessions"] += 1
        videos[key]["last_watched"] = v.get("timestamp")

    # Mark completed videos
    completed_ids = {v.get("videoId") for v in video_completed}
    for key, video in videos.items():
        if video["videoId"] in completed_ids:
            video["completed"] = True

    # Sort by last watched
    sorted_videos = sorted(videos.values(), key=lambda x: x["last_watched"], reverse=True)

    return {
        "period": period,
        "videos": sorted_videos[:limit],
        "total_unique_videos": len(videos),
        "total_completed": sum(1 for v in videos.values() if v["completed"])
    }
