"""
Custom Productivity Rules API
Allows users to configure productivity rules for platforms and URLs
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.api.routes.auth import get_current_user_optional

router = APIRouter()

# In-memory storage for now (replace with database model later)
platform_rules: dict = {}
url_rules: dict = {}
custom_categories: dict = {}
user_settings: dict = {}


class PlatformRule(BaseModel):
    domain: str
    productivity: str  # productive, neutral, distracting
    category: Optional[str] = None


class URLRule(BaseModel):
    url_pattern: str  # Can be full URL or pattern like "youtube.com/playlist*"
    productivity: str
    category: Optional[str] = None
    override_platform: bool = True


class CustomCategory(BaseModel):
    name: str
    color: str
    icon: Optional[str] = None


class DayStartSetting(BaseModel):
    hour: int  # 0-23


# Default platform rules
DEFAULT_PLATFORM_RULES = {
    "github.com": {"productivity": "productive", "category": "Development"},
    "gitlab.com": {"productivity": "productive", "category": "Development"},
    "stackoverflow.com": {"productivity": "productive", "category": "Development"},
    "notion.so": {"productivity": "productive", "category": "Productivity"},
    "figma.com": {"productivity": "productive", "category": "Design"},
    "linear.app": {"productivity": "productive", "category": "Productivity"},
    "docs.google.com": {"productivity": "productive", "category": "Productivity"},
    "youtube.com": {"productivity": "distracting", "category": "Entertainment"},
    "twitter.com": {"productivity": "distracting", "category": "Social"},
    "x.com": {"productivity": "distracting", "category": "Social"},
    "facebook.com": {"productivity": "distracting", "category": "Social"},
    "instagram.com": {"productivity": "distracting", "category": "Social"},
    "reddit.com": {"productivity": "distracting", "category": "Social"},
    "netflix.com": {"productivity": "distracting", "category": "Entertainment"},
    "twitch.tv": {"productivity": "distracting", "category": "Entertainment"},
    "tiktok.com": {"productivity": "distracting", "category": "Social"},
}

# Default categories
DEFAULT_CATEGORIES = [
    {"name": "Development", "color": "#3B82F6", "icon": "code", "default": True},
    {"name": "Design", "color": "#8B5CF6", "icon": "palette", "default": True},
    {"name": "Communication", "color": "#10B981", "icon": "message-circle", "default": True},
    {"name": "Productivity", "color": "#6366F1", "icon": "briefcase", "default": True},
    {"name": "Entertainment", "color": "#EF4444", "icon": "play", "default": True},
    {"name": "Social", "color": "#F59E0B", "icon": "users", "default": True},
    {"name": "Learning", "color": "#14B8A6", "icon": "book-open", "default": True},
    {"name": "Other", "color": "#6B7280", "icon": "folder", "default": True},
]


def get_user_id(current_user=None) -> int:
    """Get user ID or return default for unauthenticated users"""
    if current_user and hasattr(current_user, 'id'):
        return current_user.id
    return 0  # Default user


# ============== Platform Rules ==============

@router.get("/platforms")
async def get_platform_rules(current_user=Depends(get_current_user_optional)):
    """Get all platform rules"""
    user_id = get_user_id(current_user)
    user_rules = platform_rules.get(user_id, {})

    # Merge user rules with defaults (user rules override)
    merged = {**DEFAULT_PLATFORM_RULES, **user_rules}

    return {
        "rules": [{"domain": k, **v} for k, v in merged.items()],
        "total": len(merged)
    }


@router.post("/platforms")
async def create_platform_rule(
    rule: PlatformRule,
    current_user=Depends(get_current_user_optional)
):
    """Create or update a platform rule"""
    user_id = get_user_id(current_user)

    if user_id not in platform_rules:
        platform_rules[user_id] = {}

    platform_rules[user_id][rule.domain] = {
        "productivity": rule.productivity,
        "category": rule.category
    }

    return {"message": "Rule saved", "rule": rule}


@router.delete("/platforms/{domain}")
async def delete_platform_rule(
    domain: str,
    current_user=Depends(get_current_user_optional)
):
    """Delete a platform rule"""
    user_id = get_user_id(current_user)

    if user_id in platform_rules and domain in platform_rules[user_id]:
        del platform_rules[user_id][domain]

    return {"message": "Rule deleted"}


# ============== URL Rules ==============

@router.get("/urls")
async def get_url_rules(current_user=Depends(get_current_user_optional)):
    """Get all URL-specific rules"""
    user_id = get_user_id(current_user)
    user_url_rules = url_rules.get(user_id, {})

    return {
        "rules": [{"url_pattern": k, **v} for k, v in user_url_rules.items()],
        "total": len(user_url_rules)
    }


@router.post("/urls")
async def create_url_rule(
    rule: URLRule,
    current_user=Depends(get_current_user_optional)
):
    """Create or update a URL rule"""
    user_id = get_user_id(current_user)

    if user_id not in url_rules:
        url_rules[user_id] = {}

    url_rules[user_id][rule.url_pattern] = {
        "productivity": rule.productivity,
        "category": rule.category,
        "override_platform": rule.override_platform
    }

    return {"message": "Rule saved", "rule": rule}


@router.delete("/urls/{url_pattern:path}")
async def delete_url_rule(
    url_pattern: str,
    current_user=Depends(get_current_user_optional)
):
    """Delete a URL rule"""
    user_id = get_user_id(current_user)

    if user_id in url_rules and url_pattern in url_rules[user_id]:
        del url_rules[user_id][url_pattern]

    return {"message": "Rule deleted"}


# ============== Custom Categories ==============

@router.get("/categories")
async def get_custom_categories(current_user=Depends(get_current_user_optional)):
    """Get all categories (default + custom)"""
    user_id = get_user_id(current_user)
    user_categories = custom_categories.get(user_id, [])

    return {
        "categories": DEFAULT_CATEGORIES + [{"default": False, **c} for c in user_categories]
    }


@router.post("/categories")
async def create_custom_category(
    category: CustomCategory,
    current_user=Depends(get_current_user_optional)
):
    """Create a custom category"""
    user_id = get_user_id(current_user)

    if user_id not in custom_categories:
        custom_categories[user_id] = []

    # Check if category already exists
    existing = [c for c in custom_categories[user_id] if c["name"] == category.name]
    if existing:
        raise HTTPException(400, "Category already exists")

    custom_categories[user_id].append({
        "name": category.name,
        "color": category.color,
        "icon": category.icon
    })

    return {"message": "Category created", "category": category}


@router.delete("/categories/{name}")
async def delete_custom_category(
    name: str,
    current_user=Depends(get_current_user_optional)
):
    """Delete a custom category"""
    user_id = get_user_id(current_user)

    # Check if it's a default category
    if any(c["name"] == name for c in DEFAULT_CATEGORIES):
        raise HTTPException(400, "Cannot delete default category")

    if user_id in custom_categories:
        custom_categories[user_id] = [
            c for c in custom_categories[user_id] if c["name"] != name
        ]

    return {"message": "Category deleted"}


# ============== Day Start Setting ==============

@router.get("/settings/day-start")
async def get_day_start(current_user=Depends(get_current_user_optional)):
    """Get day start hour setting"""
    user_id = get_user_id(current_user)
    settings = user_settings.get(user_id, {})

    return {"hour": settings.get("day_start_hour", 0)}


@router.post("/settings/day-start")
async def set_day_start(
    setting: DayStartSetting,
    current_user=Depends(get_current_user_optional)
):
    """Set day start hour"""
    if setting.hour < 0 or setting.hour > 23:
        raise HTTPException(400, "Hour must be between 0 and 23")

    user_id = get_user_id(current_user)

    if user_id not in user_settings:
        user_settings[user_id] = {}

    user_settings[user_id]["day_start_hour"] = setting.hour

    return {"message": "Day start updated", "hour": setting.hour}


# ============== Bulk Operations ==============

@router.post("/platforms/bulk")
async def bulk_update_platform_rules(
    rules: List[PlatformRule],
    current_user=Depends(get_current_user_optional)
):
    """Bulk update platform rules"""
    user_id = get_user_id(current_user)

    if user_id not in platform_rules:
        platform_rules[user_id] = {}

    for rule in rules:
        platform_rules[user_id][rule.domain] = {
            "productivity": rule.productivity,
            "category": rule.category
        }

    return {"message": f"Updated {len(rules)} rules"}


@router.post("/reset")
async def reset_rules(current_user=Depends(get_current_user_optional)):
    """Reset all rules to defaults"""
    user_id = get_user_id(current_user)

    if user_id in platform_rules:
        del platform_rules[user_id]
    if user_id in url_rules:
        del url_rules[user_id]
    if user_id in custom_categories:
        del custom_categories[user_id]
    if user_id in user_settings:
        del user_settings[user_id]

    return {"message": "All rules reset to defaults"}
