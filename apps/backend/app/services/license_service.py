from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.user import User, PlanType
import hashlib
import hmac
import os

LICENSE_SECRET = os.getenv("LICENSE_SECRET_KEY", "your-license-secret-key")


class LicenseService:
    @staticmethod
    def generate_license_key(user_id: int, plan: str, expires_at: datetime) -> str:
        """Generate a license key for a user"""
        data = f"{user_id}:{plan}:{expires_at.isoformat()}"
        signature = hmac.new(
            LICENSE_SECRET.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        return f"PP-{user_id}-{signature.upper()}"

    @staticmethod
    async def validate_license(db: AsyncSession, user_id: int, device_id: str = None) -> Dict[str, Any]:
        """Validate user's license and return status"""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return {
                "valid": False,
                "error": "User not found",
                "should_logout": True
            }

        # Check device limit (1 device per user for now)
        if device_id and user.device_id and user.device_id != device_id:
            return {
                "valid": False,
                "error": "License in use on another device",
                "current_device": user.device_name,
                "should_logout": False,
                "can_deactivate": True
            }

        # Update device if not set
        if device_id and not user.device_id:
            user.device_id = device_id
            await db.commit()

        # Check subscription status
        now = datetime.utcnow()

        # Trial check
        if user.is_trial_active:
            return {
                "valid": True,
                "plan": user.plan.value,
                "status": "trialing",
                "trial_ends_at": user.trial_ends_at.isoformat() if user.trial_ends_at else None,
                "days_left": user.days_left_trial,
                "features": LicenseService.get_plan_features(user.plan)
            }

        # Active subscription check
        if user.subscription_status == "active" and user.plan != PlanType.FREE:
            return {
                "valid": True,
                "plan": user.plan.value,
                "status": "active",
                "features": LicenseService.get_plan_features(user.plan)
            }

        # Expired trial, no subscription
        if user.plan == PlanType.FREE:
            return {
                "valid": True,  # Can still use free features
                "plan": "free",
                "status": "free",
                "limited": True,
                "features": LicenseService.get_plan_features(PlanType.FREE),
                "upgrade_prompt": True
            }

        # Expired subscription
        return {
            "valid": True,
            "plan": "free",
            "status": "expired",
            "limited": True,
            "features": LicenseService.get_plan_features(PlanType.FREE),
            "upgrade_prompt": True,
            "message": "Your subscription has expired"
        }

    @staticmethod
    def get_plan_features(plan: PlanType) -> Dict[str, Any]:
        """Get features available for a plan"""
        features = {
            PlanType.FREE: {
                "time_tracking": True,
                "history_days": 7,
                "screenshots": False,
                "ai_insights": False,
                "reports": False,
                "goals": False,
                "website_blocking": False,
                "team_dashboard": False,
                "api_access": False,
            },
            PlanType.PERSONAL: {
                "time_tracking": True,
                "history_days": -1,  # Unlimited
                "screenshots": True,
                "ai_insights": True,
                "reports": True,
                "goals": True,
                "website_blocking": False,
                "team_dashboard": False,
                "api_access": False,
            },
            PlanType.PRO: {
                "time_tracking": True,
                "history_days": -1,
                "screenshots": True,
                "ai_insights": True,
                "reports": True,
                "goals": True,
                "website_blocking": True,
                "team_dashboard": False,
                "api_access": True,
            },
            PlanType.TEAM: {
                "time_tracking": True,
                "history_days": -1,
                "screenshots": True,
                "ai_insights": True,
                "reports": True,
                "goals": True,
                "website_blocking": True,
                "team_dashboard": True,
                "api_access": True,
            },
            PlanType.ENTERPRISE: {
                "time_tracking": True,
                "history_days": -1,
                "screenshots": True,
                "ai_insights": True,
                "reports": True,
                "goals": True,
                "website_blocking": True,
                "team_dashboard": True,
                "api_access": True,
                "sso": True,
                "dedicated_support": True,
            },
        }
        return features.get(plan, features[PlanType.FREE])

    @staticmethod
    async def deactivate_device(db: AsyncSession, user_id: int) -> bool:
        """Deactivate current device to allow login on new device"""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if user:
            user.device_id = None
            user.device_name = None
            await db.commit()
            return True
        return False

    @staticmethod
    async def activate_device(db: AsyncSession, user_id: int, device_id: str, device_name: str) -> bool:
        """Activate a device for user"""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if user:
            user.device_id = device_id
            user.device_name = device_name
            await db.commit()
            return True
        return False


license_service = LicenseService()
