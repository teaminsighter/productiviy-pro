from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os

router = APIRouter()

# Current version info - update this when releasing new versions
CURRENT_VERSION = "1.0.0"
UPDATE_NOTES = """
## What's New in v1.0.0

### Features
- AI-powered productivity insights
- Real-time activity tracking
- Smart app categorization
- Focus sessions with Pomodoro timer
- Team collaboration features
- Browser extension for URL tracking
- Customizable productivity goals
- Weekly and monthly reports

### Improvements
- Enhanced performance and stability
- Reduced memory footprint
- Better battery optimization

### Bug Fixes
- Fixed occasional sync issues
- Improved screenshot capture reliability
"""

# Store update files info (URLs point to your CDN/release server)
PLATFORMS = {
    "darwin-aarch64": {
        "url": "https://releases.productifypro.com/v{version}/Productify-Pro_{version}_aarch64.dmg",
        "signature": ""
    },
    "darwin-x86_64": {
        "url": "https://releases.productifypro.com/v{version}/Productify-Pro_{version}_x64.dmg",
        "signature": ""
    },
    "windows-x86_64": {
        "url": "https://releases.productifypro.com/v{version}/Productify-Pro_{version}_x64-setup.exe",
        "signature": ""
    },
    "linux-x86_64": {
        "url": "https://releases.productifypro.com/v{version}/Productify-Pro_{version}_amd64.deb",
        "signature": ""
    }
}


def compare_versions(v1: str, v2: str) -> int:
    """Compare two version strings. Returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2"""
    v1_parts = [int(x) for x in v1.split('.')]
    v2_parts = [int(x) for x in v2.split('.')]

    for i in range(max(len(v1_parts), len(v2_parts))):
        v1_val = v1_parts[i] if i < len(v1_parts) else 0
        v2_val = v2_parts[i] if i < len(v2_parts) else 0

        if v1_val < v2_val:
            return -1
        elif v1_val > v2_val:
            return 1

    return 0


@router.get("/{target}/{arch}/{current_version}")
async def check_for_updates(target: str, arch: str, current_version: str):
    """
    Check for updates - Tauri updater endpoint
    Returns update info if new version available

    Tauri will call this endpoint with:
    - target: darwin, windows, linux
    - arch: x86_64, aarch64
    - current_version: The currently installed version
    """
    # Compare versions
    if compare_versions(current_version, CURRENT_VERSION) >= 0:
        # No update available - return 204 No Content
        return JSONResponse(status_code=204, content=None)

    # Get platform-specific update info
    platform_key = f"{target.lower()}-{arch}"

    if platform_key not in PLATFORMS:
        # Try without arch for backwards compatibility
        platform_key = target.lower()
        if platform_key not in PLATFORMS:
            raise HTTPException(404, f"Platform {target}-{arch} not supported")

    platform_info = PLATFORMS[platform_key]

    # Return update info in Tauri updater format
    return {
        "version": CURRENT_VERSION,
        "notes": UPDATE_NOTES,
        "pub_date": datetime.utcnow().isoformat() + "Z",
        "platforms": {
            platform_key: {
                "url": platform_info["url"].format(version=CURRENT_VERSION),
                "signature": platform_info["signature"]
            }
        }
    }


@router.get("/latest")
async def get_latest_version():
    """Get latest version info for display on landing page"""
    return {
        "version": CURRENT_VERSION,
        "notes": UPDATE_NOTES,
        "release_date": "2024-01-01",
        "download_urls": {
            "windows": f"https://releases.productifypro.com/v{CURRENT_VERSION}/Productify-Pro_{CURRENT_VERSION}_x64-setup.exe",
            "macos_intel": f"https://releases.productifypro.com/v{CURRENT_VERSION}/Productify-Pro_{CURRENT_VERSION}_x64.dmg",
            "macos_arm": f"https://releases.productifypro.com/v{CURRENT_VERSION}/Productify-Pro_{CURRENT_VERSION}_aarch64.dmg",
            "linux_deb": f"https://releases.productifypro.com/v{CURRENT_VERSION}/Productify-Pro_{CURRENT_VERSION}_amd64.deb",
            "linux_appimage": f"https://releases.productifypro.com/v{CURRENT_VERSION}/Productify-Pro_{CURRENT_VERSION}_amd64.AppImage"
        }
    }


@router.get("/changelog")
async def get_changelog():
    """Get full changelog"""
    return {
        "versions": [
            {
                "version": "1.0.0",
                "date": "2024-01-01",
                "notes": UPDATE_NOTES
            }
        ]
    }


class ReleaseCreate(BaseModel):
    version: str
    notes: str
    platforms: dict


@router.post("/release")
async def create_release(release: ReleaseCreate):
    """
    Create a new release (admin endpoint)
    In production, this should be protected with admin auth
    """
    # This would typically update a database or config file
    # For now, just return success
    return {
        "status": "created",
        "version": release.version,
        "message": "Release created. Update CURRENT_VERSION in code for deployment."
    }
