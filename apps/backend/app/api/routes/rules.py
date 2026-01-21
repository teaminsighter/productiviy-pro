"""
Custom Productivity Rules API
Allows users to configure productivity rules for platforms and URLs.
Now uses database for persistence.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, distinct
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from urllib.parse import urlparse

from app.core.database import get_db
from app.api.routes.auth import get_current_user_optional
from app.models.rules import (
    PlatformRule,
    URLRule,
    CustomCategory,
    WorkSchedule,
    DEFAULT_PLATFORM_RULES,
    DEFAULT_CATEGORIES,
)
from app.models.activity import Activity
from app.services.classification import refresh_classification_rules
from app.services.activity_tracker import activity_watch_client

router = APIRouter()


# ============== Pydantic Models ==============

class PlatformRuleCreate(BaseModel):
    domain: str
    productivity: str  # productive, neutral, distracting
    category: Optional[str] = None


class PlatformRuleResponse(BaseModel):
    domain: str
    productivity: str
    category: Optional[str]
    is_custom: bool = False
    total_time: int = 0
    today_time: int = 0
    is_new: bool = False
    last_seen: Optional[str] = None


class URLRuleCreate(BaseModel):
    url_pattern: str
    productivity: str
    category: Optional[str] = None
    override_platform: bool = True


class URLRuleResponse(BaseModel):
    url_pattern: str
    productivity: str
    category: Optional[str]
    override_platform: bool = True
    total_time: int = 0
    today_time: int = 0
    is_new: bool = False
    is_custom: bool = False


class CustomCategoryCreate(BaseModel):
    name: str
    color: str
    icon: Optional[str] = None


class WorkScheduleUpdate(BaseModel):
    work_days: Optional[List[str]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    day_start_hour: Optional[int] = None


class DayStartSetting(BaseModel):
    hour: int


def get_user_id(current_user=None) -> int:
    """Get user ID or return default for unauthenticated users"""
    if current_user and hasattr(current_user, 'id'):
        return current_user.id
    return 1  # Default user


def extract_domain(url_or_title: str) -> Optional[str]:
    """Extract domain from URL or window title"""
    if not url_or_title:
        return None

    # Try to parse as URL
    if url_or_title.startswith(('http://', 'https://')):
        try:
            parsed = urlparse(url_or_title)
            return parsed.netloc.lower().replace('www.', '')
        except:
            pass

    # Try to extract domain from title (common format: "Page Title - domain.com")
    parts = url_or_title.split(' - ')
    for part in reversed(parts):
        part = part.strip().lower()
        if '.' in part and ' ' not in part:
            return part.replace('www.', '')

    return None


# ============== Platform Rules ==============

@router.get("/platforms/tracked")
async def get_tracked_platforms(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """
    Get ALL platforms that have been tracked, with their rules.
    Uses ActivityWatch data. Includes: usage time, new platforms today, sorted by most used.
    """
    user_id = get_user_id(current_user)
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Get activities from ActivityWatch for the past week
    activities = await activity_watch_client.get_activities(week_ago, now)

    # Get today's activities
    today_activities = await activity_watch_client.get_activities(today, now)

    # Get user's custom platform rules from database
    rules_result = await db.execute(
        select(PlatformRule).where(PlatformRule.user_id == user_id)
    )
    user_rules = {r.domain.lower(): r for r in rules_result.scalars().all()}

    # Process and deduplicate platforms
    platforms_dict = {}

    # Process all activities (week data for total time)
    for activity in activities:
        app_name = activity.get("app_name", "")
        window_title = activity.get("window_title", "")
        duration = activity.get("duration", 0)
        start_time = activity.get("start_time")

        # Extract domain from title or use app name
        domain = extract_domain(window_title)
        if not domain:
            # Skip system apps
            if app_name.lower() in ['finder', 'loginwindow', 'systemuiserver', 'screensaverengine']:
                continue
            domain = app_name.lower()

        if not domain:
            continue

        # Aggregate time for this domain
        if domain not in platforms_dict:
            platforms_dict[domain] = {
                'total_time': 0,
                'today_time': 0,
                'last_seen': None,
                'first_seen': None,
            }

        platforms_dict[domain]['total_time'] += duration

        # Parse start_time for first/last seen
        if start_time:
            if isinstance(start_time, str):
                try:
                    ts = datetime.fromisoformat(start_time.replace("Z", "+00:00")).replace(tzinfo=None)
                except:
                    ts = None
            else:
                ts = start_time

            if ts:
                if not platforms_dict[domain]['last_seen'] or ts > platforms_dict[domain]['last_seen']:
                    platforms_dict[domain]['last_seen'] = ts
                if not platforms_dict[domain]['first_seen'] or ts < platforms_dict[domain]['first_seen']:
                    platforms_dict[domain]['first_seen'] = ts

    # Process today's activities for today_time
    for activity in today_activities:
        app_name = activity.get("app_name", "")
        window_title = activity.get("window_title", "")
        duration = activity.get("duration", 0)

        domain = extract_domain(window_title)
        if not domain:
            if app_name.lower() in ['finder', 'loginwindow', 'systemuiserver', 'screensaverengine']:
                continue
            domain = app_name.lower()

        if domain and domain in platforms_dict:
            platforms_dict[domain]['today_time'] += duration

    # Build response with rules applied
    platforms = []
    for domain, data in platforms_dict.items():
        domain_lower = domain.lower()

        # Check for user custom rule first
        if domain_lower in user_rules:
            rule = user_rules[domain_lower]
            productivity = rule.productivity
            category = rule.category
            is_custom = True
        # Then check defaults
        elif domain_lower in DEFAULT_PLATFORM_RULES:
            default = DEFAULT_PLATFORM_RULES[domain_lower]
            productivity = default['productivity']
            category = default['category']
            is_custom = False
        else:
            productivity = 'neutral'
            category = None
            is_custom = False

        # Check if new (first seen today)
        is_new = data['first_seen'] and data['first_seen'] >= today if data['first_seen'] else False

        platforms.append(PlatformRuleResponse(
            domain=domain,
            productivity=productivity,
            category=category,
            is_custom=is_custom,
            total_time=int(data['total_time']),
            today_time=int(data['today_time']),
            is_new=is_new,
            last_seen=data['last_seen'].isoformat() if data['last_seen'] else None
        ))

    # Sort: new items first, then by total_time descending
    platforms.sort(key=lambda x: (not x.is_new, -x.total_time))

    return {
        "platforms": [p.model_dump() for p in platforms],
        "total": len(platforms)
    }


@router.get("/platforms")
async def get_platform_rules(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Get all platform rules (custom + defaults)"""
    user_id = get_user_id(current_user)

    # Get user's custom rules
    result = await db.execute(
        select(PlatformRule).where(PlatformRule.user_id == user_id)
    )
    custom_rules = {r.domain: r for r in result.scalars().all()}

    # Merge with defaults (custom rules override)
    all_rules = []

    # Add defaults first
    for domain, data in DEFAULT_PLATFORM_RULES.items():
        if domain not in custom_rules:
            all_rules.append({
                "domain": domain,
                "productivity": data["productivity"],
                "category": data["category"],
                "is_custom": False
            })

    # Add custom rules
    for domain, rule in custom_rules.items():
        all_rules.append({
            "domain": domain,
            "productivity": rule.productivity,
            "category": rule.category,
            "is_custom": True
        })

    return {"rules": all_rules, "total": len(all_rules)}


@router.post("/platforms")
async def create_platform_rule(
    rule: PlatformRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Create or update a platform rule"""
    user_id = get_user_id(current_user)

    # Check if rule exists
    result = await db.execute(
        select(PlatformRule)
        .where(PlatformRule.user_id == user_id)
        .where(PlatformRule.domain == rule.domain)
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing
        existing.productivity = rule.productivity
        existing.category = rule.category
        existing.updated_at = datetime.utcnow()
    else:
        # Create new
        new_rule = PlatformRule(
            user_id=user_id,
            domain=rule.domain,
            productivity=rule.productivity,
            category=rule.category,
            is_custom=True
        )
        db.add(new_rule)

    await db.commit()

    # Refresh classification cache
    await refresh_classification_rules(db, user_id)

    return {"message": "Rule saved", "rule": rule.model_dump()}


@router.delete("/platforms/{domain}")
async def delete_platform_rule(
    domain: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Delete a platform rule (reverts to default if exists)"""
    user_id = get_user_id(current_user)

    await db.execute(
        delete(PlatformRule)
        .where(PlatformRule.user_id == user_id)
        .where(PlatformRule.domain == domain)
    )
    await db.commit()

    # Refresh classification cache
    await refresh_classification_rules(db, user_id)

    return {"message": "Rule deleted"}


# ============== URL Rules ==============

@router.get("/urls/tracked")
async def get_tracked_urls(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """
    Get all unique URL patterns that have been tracked.
    Uses ActivityWatch data filtered to browser apps only.
    """
    user_id = get_user_id(current_user)
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    BROWSER_APPS = ['safari', 'google chrome', 'firefox', 'arc', 'brave browser', 'microsoft edge', 'chrome']

    # Get activities from ActivityWatch for the past week
    activities = await activity_watch_client.get_activities(week_ago, now)

    # Get today's activities
    today_activities_list = await activity_watch_client.get_activities(today, now)

    # Get user's URL rules from database
    rules_result = await db.execute(
        select(URLRule).where(URLRule.user_id == user_id)
    )
    user_rules = {r.url_pattern.lower(): r for r in rules_result.scalars().all()}

    # Process and deduplicate URLs
    urls_dict = {}

    # Process all activities (week data for total time)
    for activity in activities:
        app_name = activity.get("app_name", "").lower()
        window_title = activity.get("window_title", "")
        duration = activity.get("duration", 0)
        start_time = activity.get("start_time")

        # Only process browser activities
        if app_name not in BROWSER_APPS:
            continue

        # Extract domain from title
        domain = extract_domain(window_title)
        if not domain:
            continue

        # Aggregate time for this domain
        if domain not in urls_dict:
            urls_dict[domain] = {
                'total_time': 0,
                'today_time': 0,
                'first_seen': None,
            }

        urls_dict[domain]['total_time'] += duration

        # Parse start_time for first seen
        if start_time:
            if isinstance(start_time, str):
                try:
                    ts = datetime.fromisoformat(start_time.replace("Z", "+00:00")).replace(tzinfo=None)
                except:
                    ts = None
            else:
                ts = start_time

            if ts:
                if not urls_dict[domain]['first_seen'] or ts < urls_dict[domain]['first_seen']:
                    urls_dict[domain]['first_seen'] = ts

    # Process today's activities for today_time
    for activity in today_activities_list:
        app_name = activity.get("app_name", "").lower()
        window_title = activity.get("window_title", "")
        duration = activity.get("duration", 0)

        if app_name not in BROWSER_APPS:
            continue

        domain = extract_domain(window_title)
        if domain and domain in urls_dict:
            urls_dict[domain]['today_time'] += duration

    # Build response with rules applied
    urls = []
    matched_user_rules = set()  # Track which user rules have been matched

    for domain, data in urls_dict.items():
        domain_lower = domain.lower()

        # Check for user rule
        matching_rule = None
        for pattern, rule in user_rules.items():
            if pattern in domain_lower or domain_lower in pattern:
                matching_rule = rule
                matched_user_rules.add(pattern)
                break

        if matching_rule:
            productivity = matching_rule.productivity
            category = matching_rule.category
            is_custom = True
        elif domain_lower in DEFAULT_PLATFORM_RULES:
            default = DEFAULT_PLATFORM_RULES[domain_lower]
            productivity = default['productivity']
            category = default['category']
            is_custom = False
        else:
            productivity = 'neutral'
            category = None
            is_custom = False

        is_new = data['first_seen'] and data['first_seen'] >= today if data['first_seen'] else False

        urls.append(URLRuleResponse(
            url_pattern=domain,
            productivity=productivity,
            category=category,
            total_time=int(data['total_time']),
            today_time=int(data['today_time']),
            is_new=is_new,
            is_custom=is_custom
        ))

    # Add user-created URL rules that haven't been tracked yet
    for pattern, rule in user_rules.items():
        if pattern not in matched_user_rules:
            urls.append(URLRuleResponse(
                url_pattern=rule.url_pattern,
                productivity=rule.productivity,
                category=rule.category,
                override_platform=rule.override_platform,
                total_time=0,
                today_time=0,
                is_new=False,
                is_custom=True
            ))

    # Sort: custom rules first, then new, then by total_time
    urls.sort(key=lambda x: (not x.is_custom, not x.is_new, -x.total_time))

    return {
        "urls": [u.model_dump() for u in urls],
        "total": len(urls)
    }


@router.get("/urls")
async def get_url_rules(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Get all URL-specific rules"""
    user_id = get_user_id(current_user)

    result = await db.execute(
        select(URLRule).where(URLRule.user_id == user_id)
    )
    rules = result.scalars().all()

    return {
        "rules": [
            {
                "url_pattern": r.url_pattern,
                "productivity": r.productivity,
                "category": r.category,
                "override_platform": r.override_platform
            }
            for r in rules
        ],
        "total": len(rules)
    }


@router.post("/urls")
async def create_url_rule(
    rule: URLRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Create or update a URL rule"""
    user_id = get_user_id(current_user)

    # Check if rule exists
    result = await db.execute(
        select(URLRule)
        .where(URLRule.user_id == user_id)
        .where(URLRule.url_pattern == rule.url_pattern)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.productivity = rule.productivity
        existing.category = rule.category
        existing.override_platform = rule.override_platform
        existing.updated_at = datetime.utcnow()
    else:
        new_rule = URLRule(
            user_id=user_id,
            url_pattern=rule.url_pattern,
            productivity=rule.productivity,
            category=rule.category,
            override_platform=rule.override_platform
        )
        db.add(new_rule)

    await db.commit()

    # Refresh classification cache
    await refresh_classification_rules(db, user_id)

    return {"message": "Rule saved", "rule": rule.model_dump()}


@router.delete("/urls/{url_pattern:path}")
async def delete_url_rule(
    url_pattern: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Delete a URL rule"""
    user_id = get_user_id(current_user)

    await db.execute(
        delete(URLRule)
        .where(URLRule.user_id == user_id)
        .where(URLRule.url_pattern == url_pattern)
    )
    await db.commit()

    # Refresh classification cache
    await refresh_classification_rules(db, user_id)

    return {"message": "Rule deleted"}


# ============== Categories ==============

@router.get("/categories")
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Get all categories (default + custom)"""
    user_id = get_user_id(current_user)

    result = await db.execute(
        select(CustomCategory).where(CustomCategory.user_id == user_id)
    )
    custom = result.scalars().all()

    all_categories = [
        {**c, "default": True} for c in DEFAULT_CATEGORIES
    ] + [
        {"name": c.name, "color": c.color, "icon": c.icon, "default": False}
        for c in custom
    ]

    return {"categories": all_categories}


@router.post("/categories")
async def create_category(
    category: CustomCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Create a custom category"""
    user_id = get_user_id(current_user)

    # Check if exists
    result = await db.execute(
        select(CustomCategory)
        .where(CustomCategory.user_id == user_id)
        .where(CustomCategory.name == category.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Category already exists")

    new_cat = CustomCategory(
        user_id=user_id,
        name=category.name,
        color=category.color,
        icon=category.icon
    )
    db.add(new_cat)
    await db.commit()

    return {"message": "Category created", "category": category.model_dump()}


@router.delete("/categories/{name}")
async def delete_category(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Delete a custom category"""
    user_id = get_user_id(current_user)

    # Check if it's a default
    if any(c["name"] == name for c in DEFAULT_CATEGORIES):
        raise HTTPException(400, "Cannot delete default category")

    await db.execute(
        delete(CustomCategory)
        .where(CustomCategory.user_id == user_id)
        .where(CustomCategory.name == name)
    )
    await db.commit()

    return {"message": "Category deleted"}


# ============== Work Schedule & Settings ==============

@router.get("/settings/schedule")
async def get_work_schedule(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Get work schedule settings"""
    user_id = get_user_id(current_user)

    result = await db.execute(
        select(WorkSchedule).where(WorkSchedule.user_id == user_id)
    )
    schedule = result.scalar_one_or_none()

    if schedule:
        return {
            "work_days": schedule.work_days,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "day_start_hour": schedule.day_start_hour
        }

    # Return defaults
    return {
        "work_days": ["mon", "tue", "wed", "thu", "fri"],
        "start_time": "09:00",
        "end_time": "17:00",
        "day_start_hour": 0
    }


@router.post("/settings/schedule")
async def update_work_schedule(
    schedule: WorkScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Update work schedule settings"""
    user_id = get_user_id(current_user)

    result = await db.execute(
        select(WorkSchedule).where(WorkSchedule.user_id == user_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        if schedule.work_days is not None:
            existing.work_days = schedule.work_days
        if schedule.start_time is not None:
            existing.start_time = schedule.start_time
        if schedule.end_time is not None:
            existing.end_time = schedule.end_time
        if schedule.day_start_hour is not None:
            existing.day_start_hour = schedule.day_start_hour
        existing.updated_at = datetime.utcnow()
    else:
        new_schedule = WorkSchedule(
            user_id=user_id,
            work_days=schedule.work_days or ["mon", "tue", "wed", "thu", "fri"],
            start_time=schedule.start_time or "09:00",
            end_time=schedule.end_time or "17:00",
            day_start_hour=schedule.day_start_hour or 0
        )
        db.add(new_schedule)

    await db.commit()
    return {"message": "Schedule updated"}


@router.get("/settings/day-start")
async def get_day_start(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Get day start hour setting"""
    user_id = get_user_id(current_user)

    result = await db.execute(
        select(WorkSchedule).where(WorkSchedule.user_id == user_id)
    )
    schedule = result.scalar_one_or_none()

    return {"hour": schedule.day_start_hour if schedule else 0}


@router.post("/settings/day-start")
async def set_day_start(
    setting: DayStartSetting,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Set day start hour"""
    if setting.hour < 0 or setting.hour > 23:
        raise HTTPException(400, "Hour must be between 0 and 23")

    user_id = get_user_id(current_user)

    result = await db.execute(
        select(WorkSchedule).where(WorkSchedule.user_id == user_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.day_start_hour = setting.hour
        existing.updated_at = datetime.utcnow()
    else:
        new_schedule = WorkSchedule(
            user_id=user_id,
            day_start_hour=setting.hour
        )
        db.add(new_schedule)

    await db.commit()
    return {"message": "Day start updated", "hour": setting.hour}


# ============== Reset ==============

@router.post("/reset")
async def reset_rules(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user_optional)
):
    """Reset all rules to defaults"""
    user_id = get_user_id(current_user)

    await db.execute(delete(PlatformRule).where(PlatformRule.user_id == user_id))
    await db.execute(delete(URLRule).where(URLRule.user_id == user_id))
    await db.execute(delete(CustomCategory).where(CustomCategory.user_id == user_id))
    await db.execute(delete(WorkSchedule).where(WorkSchedule.user_id == user_id))

    await db.commit()

    # Refresh classification cache
    await refresh_classification_rules(db, user_id)

    return {"message": "All rules reset to defaults"}
