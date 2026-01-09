import mss
from PIL import Image
import io
from pathlib import Path
from datetime import datetime, timedelta
import uuid
from typing import Optional
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
import random

from app.core.config import settings
from app.core.database import async_session, USE_CLOUD_DB
from app.services.firebase_storage import firebase_storage


class ScreenshotService:
    """Service for capturing and managing screenshots"""

    def __init__(self):
        # Expand ~ to actual home directory
        self.screenshots_path = Path(settings.screenshots_path).expanduser()
        self.screenshots_path.mkdir(parents=True, exist_ok=True)
        self.scheduler = AsyncIOScheduler()
        self.enabled = True
        self.min_interval = 7   # minutes (minimum)
        self.max_interval = 13  # minutes (maximum, under 15 as requested)
        self.excluded_apps = []
        self.blur_mode = "never"
        self.quality = 70
        self.current_user_id: Optional[int] = None  # Set by auth context

    def start_scheduler(self):
        """Start the screenshot scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
        self._schedule_next_capture()

    def stop_scheduler(self):
        """Stop the screenshot scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def _schedule_next_capture(self):
        """Schedule the next screenshot capture at a random interval"""
        if not self.enabled:
            return

        # Random interval between min and max (in minutes)
        interval_minutes = random.randint(self.min_interval, self.max_interval)
        next_run_time = datetime.now() + timedelta(minutes=interval_minutes)

        # Remove existing job if any
        try:
            self.scheduler.remove_job('screenshot_capture')
        except Exception:
            pass

        # Schedule one-shot capture at the random future time
        self.scheduler.add_job(
            self._capture_and_reschedule,
            trigger=DateTrigger(run_date=next_run_time),
            id='screenshot_capture',
            replace_existing=True,
        )
        print(f"📸 Next screenshot scheduled in {interval_minutes} minutes (at {next_run_time.strftime('%H:%M:%S')})")

    async def _capture_and_reschedule(self):
        """Capture screenshot and schedule next one"""
        print(f"📸 Capturing screenshot at {datetime.now().strftime('%H:%M:%S')}")
        await self.capture_screenshot()
        # Schedule the next capture with a new random interval
        self._schedule_next_capture()

    async def capture_screenshot(self, user_id: Optional[int] = None) -> Optional[dict]:
        """Capture a screenshot of the primary monitor"""
        if not self.enabled:
            return None

        # Use provided user_id or fall back to current_user_id
        effective_user_id = user_id or self.current_user_id

        try:
            with mss.mss() as sct:
                # Capture primary monitor
                monitor = sct.monitors[1]
                screenshot = sct.grab(monitor)

                # Convert to PIL Image
                img = Image.frombytes(
                    'RGB',
                    screenshot.size,
                    screenshot.bgra,
                    'raw',
                    'BGRX'
                )

                # Generate identifiers
                timestamp = datetime.now()
                screenshot_id = str(uuid.uuid4())

                # Result dict
                result = {
                    'id': screenshot_id,
                    'timestamp': timestamp.isoformat(),
                    'user_id': effective_user_id,
                }

                # Try cloud upload first if available and user is authenticated
                if effective_user_id and firebase_storage.is_available:
                    # Convert image to bytes
                    img_buffer = io.BytesIO()
                    img.save(img_buffer, format='JPEG', quality=self.quality)
                    img_bytes = img_buffer.getvalue()

                    # Upload to Firebase
                    upload_result = await firebase_storage.upload_screenshot(
                        user_id=effective_user_id,
                        image_bytes=img_bytes,
                        create_thumbnail=True,
                        quality=self.quality
                    )

                    if "error" not in upload_result:
                        result.update({
                            'storage_url': upload_result.get('storage_url'),
                            'thumbnail_url': upload_result.get('thumbnail_url'),
                            'storage_path': upload_result.get('storage_path'),
                            'image_path': None,  # No local file
                            'thumbnail_path': None,
                        })
                        print(f"☁️  Screenshot uploaded to Firebase: {upload_result.get('storage_path')}")
                    else:
                        # Fall back to local storage on upload failure
                        print(f"Firebase upload failed, using local storage: {upload_result.get('error')}")
                        result = await self._save_locally(img, timestamp, screenshot_id, effective_user_id)
                else:
                    # Local storage (development or unauthenticated)
                    result = await self._save_locally(img, timestamp, screenshot_id, effective_user_id)

                # Save to database
                await self._save_to_database(result)

                return result

        except Exception as e:
            print(f"Failed to capture screenshot: {e}")
            return None

    async def _save_locally(self, img: Image.Image, timestamp: datetime, screenshot_id: str, user_id: Optional[int]) -> dict:
        """Save screenshot to local filesystem"""
        filename = f"{timestamp.strftime('%Y%m%d_%H%M%S')}_{screenshot_id}.jpg"
        thumbnail_filename = f"{timestamp.strftime('%Y%m%d_%H%M%S')}_{screenshot_id}_thumb.jpg"

        # Save full image
        image_path = self.screenshots_path / filename
        img.save(str(image_path), 'JPEG', quality=self.quality)

        # Create and save thumbnail
        thumbnail = img.copy()
        thumbnail.thumbnail((320, 180))
        thumbnail_path = self.screenshots_path / thumbnail_filename
        thumbnail.save(str(thumbnail_path), 'JPEG', quality=60)

        return {
            'id': screenshot_id,
            'timestamp': timestamp.isoformat(),
            'user_id': user_id,
            'image_path': str(image_path),
            'thumbnail_path': str(thumbnail_path),
            'storage_url': None,
            'thumbnail_url': None,
            'storage_path': None,
        }

    async def _save_to_database(self, screenshot_data: dict):
        """Save screenshot metadata to database"""
        try:
            from app.models.screenshot import Screenshot

            async with async_session() as session:
                screenshot = Screenshot(
                    id=screenshot_data['id'],
                    user_id=screenshot_data.get('user_id'),
                    timestamp=datetime.fromisoformat(screenshot_data['timestamp']),
                    image_path=screenshot_data.get('image_path'),
                    thumbnail_path=screenshot_data.get('thumbnail_path'),
                    storage_url=screenshot_data.get('storage_url'),
                    thumbnail_url=screenshot_data.get('thumbnail_url'),
                    storage_path=screenshot_data.get('storage_path'),
                )
                session.add(screenshot)
                await session.commit()
        except Exception as e:
            print(f"Failed to save screenshot to database: {e}")

    def update_settings(
        self,
        enabled: Optional[bool] = None,
        min_interval: Optional[int] = None,
        max_interval: Optional[int] = None,
        excluded_apps: Optional[list] = None,
        blur_mode: Optional[str] = None,
        quality: Optional[int] = None,
    ):
        """Update screenshot settings"""
        if enabled is not None:
            self.enabled = enabled
        if min_interval is not None:
            self.min_interval = min_interval
        if max_interval is not None:
            self.max_interval = max_interval
        if excluded_apps is not None:
            self.excluded_apps = excluded_apps
        if blur_mode is not None:
            self.blur_mode = blur_mode
        if quality is not None:
            self.quality = quality

        # Reschedule with new settings
        self._schedule_next_capture()


# Singleton instance
screenshot_service = ScreenshotService()
