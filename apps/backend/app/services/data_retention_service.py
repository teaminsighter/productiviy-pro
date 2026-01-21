"""
Data Retention Service

Handles automatic deletion of old user data based on retention settings.
GDPR-compliant data lifecycle management.
"""
from datetime import datetime, timedelta
from sqlalchemy import select, delete as sql_delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db, async_session
from app.models import Activity, URLActivity, Screenshot, UserSettings, FocusSession
from app.models.calendar import FocusBlock


class DataRetentionService:
    """Service to manage data retention and automatic cleanup"""

    # Minimum retention period (7 days) to prevent accidental data loss
    MIN_RETENTION_DAYS = 7

    # Maximum retention period (365 days) - 1 year
    MAX_RETENTION_DAYS = 365

    # Default retention period
    DEFAULT_RETENTION_DAYS = 90

    async def cleanup_user_data(
        self,
        db: AsyncSession,
        user_id: int,
        retention_days: Optional[int] = None
    ) -> dict:
        """
        Delete data older than the retention period for a specific user.

        Args:
            db: Database session
            user_id: User ID to cleanup data for
            retention_days: Override retention period (uses user settings if not provided)

        Returns:
            Dict with counts of deleted records
        """
        # Get user's retention setting if not overridden
        if retention_days is None:
            settings_result = await db.execute(
                select(UserSettings).where(UserSettings.user_id == user_id)
            )
            settings = settings_result.scalar_one_or_none()
            retention_days = settings.data_retention_days if settings else self.DEFAULT_RETENTION_DAYS

        # Ensure retention is within valid bounds
        retention_days = max(self.MIN_RETENTION_DAYS, min(self.MAX_RETENTION_DAYS, retention_days))

        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        deleted_counts = {
            "activities": 0,
            "url_activities": 0,
            "screenshots": 0,
            "focus_sessions": 0,
            "retention_days": retention_days,
            "cutoff_date": cutoff_date.isoformat(),
        }

        # Delete old activities
        result = await db.execute(
            sql_delete(Activity).where(
                and_(
                    Activity.user_id == user_id,
                    Activity.start_time < cutoff_date
                )
            )
        )
        deleted_counts["activities"] = result.rowcount

        # Delete old URL activities
        result = await db.execute(
            sql_delete(URLActivity).where(
                and_(
                    URLActivity.user_id == user_id,
                    URLActivity.timestamp < cutoff_date
                )
            )
        )
        deleted_counts["url_activities"] = result.rowcount

        # Get screenshots to delete (for cloud cleanup)
        screenshots_result = await db.execute(
            select(Screenshot).where(
                and_(
                    Screenshot.user_id == user_id,
                    Screenshot.timestamp < cutoff_date
                )
            )
        )
        screenshots = screenshots_result.scalars().all()
        screenshot_paths = [s.storage_path for s in screenshots if s.storage_path]

        # Delete screenshot records
        result = await db.execute(
            sql_delete(Screenshot).where(
                and_(
                    Screenshot.user_id == user_id,
                    Screenshot.timestamp < cutoff_date
                )
            )
        )
        deleted_counts["screenshots"] = result.rowcount

        # Delete old focus sessions (but keep blocks as they're scheduled items)
        result = await db.execute(
            sql_delete(FocusSession).where(
                and_(
                    FocusSession.user_id == user_id,
                    FocusSession.started_at < cutoff_date
                )
            )
        )
        deleted_counts["focus_sessions"] = result.rowcount

        await db.commit()

        # Clean up cloud storage (best effort)
        if screenshot_paths:
            try:
                from app.services.screenshot_service import firebase_storage
                if firebase_storage and firebase_storage.is_available:
                    for path in screenshot_paths:
                        try:
                            await firebase_storage.delete_file(path)
                        except Exception:
                            pass  # Best effort
            except Exception:
                pass

        return deleted_counts

    async def run_cleanup_for_all_users(self) -> dict:
        """
        Run data retention cleanup for all users.
        Should be called by a scheduled task (e.g., daily cron).

        Returns:
            Summary of cleanup results
        """
        async with async_session() as db:
            # Get all users with their settings
            result = await db.execute(
                select(UserSettings.user_id, UserSettings.data_retention_days)
            )
            user_settings = result.all()

            total_deleted = {
                "users_processed": 0,
                "total_activities": 0,
                "total_url_activities": 0,
                "total_screenshots": 0,
                "total_focus_sessions": 0,
                "errors": [],
            }

            for user_id, retention_days in user_settings:
                try:
                    counts = await self.cleanup_user_data(
                        db, user_id, retention_days
                    )
                    total_deleted["users_processed"] += 1
                    total_deleted["total_activities"] += counts["activities"]
                    total_deleted["total_url_activities"] += counts["url_activities"]
                    total_deleted["total_screenshots"] += counts["screenshots"]
                    total_deleted["total_focus_sessions"] += counts["focus_sessions"]
                except Exception as e:
                    total_deleted["errors"].append({
                        "user_id": user_id,
                        "error": str(e)
                    })

            return total_deleted

    async def get_user_data_stats(
        self,
        db: AsyncSession,
        user_id: int
    ) -> dict:
        """
        Get statistics about user's stored data.

        Returns:
            Dict with counts and date ranges
        """
        from sqlalchemy import func

        # Activity stats
        activity_result = await db.execute(
            select(
                func.count(Activity.id),
                func.min(Activity.start_time),
                func.max(Activity.start_time)
            ).where(Activity.user_id == user_id)
        )
        activity_row = activity_result.first()

        # Screenshot stats
        screenshot_result = await db.execute(
            select(
                func.count(Screenshot.id),
                func.min(Screenshot.timestamp),
                func.max(Screenshot.timestamp)
            ).where(
                Screenshot.user_id == user_id,
                Screenshot.is_deleted == False
            )
        )
        screenshot_row = screenshot_result.first()

        # URL activity stats
        url_result = await db.execute(
            select(
                func.count(URLActivity.id),
                func.min(URLActivity.timestamp),
                func.max(URLActivity.timestamp)
            ).where(URLActivity.user_id == user_id)
        )
        url_row = url_result.first()

        # Get user's retention setting
        settings_result = await db.execute(
            select(UserSettings.data_retention_days).where(
                UserSettings.user_id == user_id
            )
        )
        retention_days = settings_result.scalar() or self.DEFAULT_RETENTION_DAYS

        return {
            "activities": {
                "count": activity_row[0] or 0,
                "oldest": activity_row[1].isoformat() if activity_row[1] else None,
                "newest": activity_row[2].isoformat() if activity_row[2] else None,
            },
            "screenshots": {
                "count": screenshot_row[0] or 0,
                "oldest": screenshot_row[1].isoformat() if screenshot_row[1] else None,
                "newest": screenshot_row[2].isoformat() if screenshot_row[2] else None,
            },
            "url_activities": {
                "count": url_row[0] or 0,
                "oldest": url_row[1].isoformat() if url_row[1] else None,
                "newest": url_row[2].isoformat() if url_row[2] else None,
            },
            "retention_settings": {
                "retention_days": retention_days,
                "cutoff_date": (datetime.utcnow() - timedelta(days=retention_days)).isoformat(),
            },
        }


# Singleton instance
data_retention_service = DataRetentionService()
