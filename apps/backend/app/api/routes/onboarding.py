"""
Onboarding API Routes
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

# In-memory storage (replace with database later)
onboarding_data = {
    "completed": False,
    "step": 0,
    "steps": {},
    "profile": None
}


# ============================================================================
# Pydantic Models
# ============================================================================

class OnboardingStatus(BaseModel):
    completed: bool
    step: int = 0
    profile_exists: bool = False


class StepData(BaseModel):
    step: int
    data: Dict[str, Any]


class ProfileData(BaseModel):
    profile_type: str = "other"
    work_apps: List[str] = []
    daily_productive_hours: float = 6.0
    max_distraction_hours: float = 1.0
    ai_enabled: bool = False
    openai_api_key: Optional[str] = None
    accessibility_granted: bool = False
    screen_recording_granted: bool = False
    launch_on_startup: bool = True


class CommonApp(BaseModel):
    name: str
    icon: str
    category: str


# Common apps list
COMMON_APPS = [
    {"name": "VS Code", "icon": "code", "category": "development"},
    {"name": "Cursor", "icon": "code", "category": "development"},
    {"name": "WebStorm", "icon": "code", "category": "development"},
    {"name": "PyCharm", "icon": "code", "category": "development"},
    {"name": "Xcode", "icon": "code", "category": "development"},
    {"name": "Terminal", "icon": "terminal", "category": "development"},
    {"name": "iTerm", "icon": "terminal", "category": "development"},
    {"name": "Figma", "icon": "design", "category": "design"},
    {"name": "Sketch", "icon": "design", "category": "design"},
    {"name": "Adobe Photoshop", "icon": "design", "category": "design"},
    {"name": "Adobe Illustrator", "icon": "design", "category": "design"},
    {"name": "Slack", "icon": "message", "category": "communication"},
    {"name": "Discord", "icon": "message", "category": "communication"},
    {"name": "Microsoft Teams", "icon": "message", "category": "communication"},
    {"name": "Zoom", "icon": "video", "category": "communication"},
    {"name": "Google Chrome", "icon": "browser", "category": "browser"},
    {"name": "Firefox", "icon": "browser", "category": "browser"},
    {"name": "Safari", "icon": "browser", "category": "browser"},
    {"name": "Arc", "icon": "browser", "category": "browser"},
    {"name": "Notion", "icon": "document", "category": "productivity"},
    {"name": "Obsidian", "icon": "document", "category": "productivity"},
    {"name": "Microsoft Word", "icon": "document", "category": "productivity"},
    {"name": "Google Docs", "icon": "document", "category": "productivity"},
    {"name": "Microsoft Excel", "icon": "spreadsheet", "category": "productivity"},
    {"name": "Google Sheets", "icon": "spreadsheet", "category": "productivity"},
    {"name": "Linear", "icon": "task", "category": "productivity"},
    {"name": "Jira", "icon": "task", "category": "productivity"},
    {"name": "Asana", "icon": "task", "category": "productivity"},
    {"name": "Trello", "icon": "task", "category": "productivity"},
    {"name": "Spotify", "icon": "music", "category": "entertainment"},
    {"name": "YouTube", "icon": "video", "category": "entertainment"},
]

PROFILE_TYPES = [
    {"value": "developer", "label": "Developer", "emoji": "👨‍💻", "description": "Software development & coding"},
    {"value": "designer", "label": "Designer", "emoji": "🎨", "description": "UI/UX & graphic design"},
    {"value": "writer", "label": "Writer", "emoji": "✍️", "description": "Content creation & writing"},
    {"value": "manager", "label": "Manager", "emoji": "📊", "description": "Team & project management"},
    {"value": "student", "label": "Student", "emoji": "📚", "description": "Learning & studying"},
    {"value": "freelancer", "label": "Freelancer", "emoji": "🚀", "description": "Independent work"},
    {"value": "other", "label": "Other", "emoji": "💼", "description": "Other profession"},
]


# ============================================================================
# Routes
# ============================================================================

@router.get("/status")
async def get_onboarding_status():
    """Check if onboarding is completed"""
    return {
        "completed": onboarding_data["completed"],
        "step": onboarding_data["step"],
        "profile_exists": onboarding_data["profile"] is not None
    }


@router.post("/status")
async def update_onboarding_status(completed: bool = False):
    """Update onboarding status"""
    onboarding_data["completed"] = completed
    return {"success": True, "completed": completed}


@router.get("/step/{step}")
async def get_step_data(step: int):
    """Get saved data for a specific step"""
    step_key = f"step_{step}"
    return {
        "step": step,
        "data": onboarding_data["steps"].get(step_key, {})
    }


@router.post("/step")
async def save_step_data(step_data: StepData):
    """Save data for a specific onboarding step"""
    step_key = f"step_{step_data.step}"
    onboarding_data["steps"][step_key] = step_data.data
    onboarding_data["step"] = max(onboarding_data["step"], step_data.step)

    # Also update profile data based on step
    if onboarding_data["profile"] is None:
        onboarding_data["profile"] = {}

    # Map step data to profile fields
    data = step_data.data
    if step_data.step == 2 and "profile_type" in data:
        onboarding_data["profile"]["profile_type"] = data["profile_type"]
    elif step_data.step == 3 and "work_apps" in data:
        onboarding_data["profile"]["work_apps"] = data["work_apps"]
    elif step_data.step == 4:
        if "daily_productive_hours" in data:
            onboarding_data["profile"]["daily_productive_hours"] = data["daily_productive_hours"]
        if "max_distraction_hours" in data:
            onboarding_data["profile"]["max_distraction_hours"] = data["max_distraction_hours"]
    elif step_data.step == 5:
        if "ai_enabled" in data:
            onboarding_data["profile"]["ai_enabled"] = data["ai_enabled"]
        if "openai_api_key" in data:
            onboarding_data["profile"]["openai_api_key"] = data["openai_api_key"]
    elif step_data.step == 6:
        if "accessibility_granted" in data:
            onboarding_data["profile"]["accessibility_granted"] = data["accessibility_granted"]
        if "screen_recording_granted" in data:
            onboarding_data["profile"]["screen_recording_granted"] = data["screen_recording_granted"]
        if "launch_on_startup" in data:
            onboarding_data["profile"]["launch_on_startup"] = data["launch_on_startup"]

    return {"success": True, "step": step_data.step}


@router.get("/common-apps")
async def get_common_apps():
    """Get list of common work apps for onboarding"""
    return {"apps": COMMON_APPS}


@router.get("/profile-types")
async def get_profile_types():
    """Get available profile types"""
    return {"types": PROFILE_TYPES}


@router.post("/complete")
async def complete_onboarding():
    """Mark onboarding as complete"""
    onboarding_data["completed"] = True
    onboarding_data["step"] = 7

    return {
        "success": True,
        "message": "Onboarding completed successfully",
        "profile": onboarding_data["profile"]
    }


@router.get("/profile")
async def get_profile():
    """Get user profile from onboarding"""
    if onboarding_data["profile"] is None:
        # Return default profile
        return {
            "id": 1,
            "onboarding_completed": onboarding_data["completed"],
            "onboarding_completed_at": None,
            "onboarding_step": onboarding_data["step"],
            "profile_type": "other",
            "work_apps": [],
            "daily_productive_hours": 6.0,
            "max_distraction_hours": 1.0,
            "ai_enabled": False,
            "accessibility_granted": False,
            "screen_recording_granted": False,
            "launch_on_startup": True,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }

    return {
        "id": 1,
        "onboarding_completed": onboarding_data["completed"],
        "onboarding_completed_at": None,
        "onboarding_step": onboarding_data["step"],
        **onboarding_data["profile"],
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }


@router.put("/profile")
async def update_profile(profile: ProfileData):
    """Update user profile"""
    onboarding_data["profile"] = profile.dict()
    return {
        "id": 1,
        "onboarding_completed": onboarding_data["completed"],
        **onboarding_data["profile"],
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }


@router.post("/reset")
async def reset_onboarding():
    """Reset onboarding (for testing)"""
    onboarding_data["completed"] = False
    onboarding_data["step"] = 0
    onboarding_data["steps"] = {}
    onboarding_data["profile"] = None
    return {"success": True, "message": "Onboarding reset"}
