"""
Firebase Storage Service
Handles screenshot and file uploads to Firebase Cloud Storage.
"""

import io
from uuid import uuid4
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from PIL import Image

from app.core.config import settings


class FirebaseStorageService:
    """Service for uploading and managing files in Firebase Storage"""

    def __init__(self):
        self._bucket = None
        self._initialized = False

    def _initialize(self):
        """Lazy initialization of Firebase Admin SDK"""
        if self._initialized:
            return

        if not settings.firebase_credentials_path or not settings.firebase_storage_bucket:
            print("Firebase not configured - using local storage fallback")
            return

        try:
            import firebase_admin
            from firebase_admin import credentials, storage

            # Check if already initialized
            try:
                firebase_admin.get_app()
            except ValueError:
                # Initialize Firebase Admin
                cred = credentials.Certificate(settings.firebase_credentials_path)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': settings.firebase_storage_bucket
                })

            self._bucket = storage.bucket()
            self._initialized = True
            print(f"Firebase Storage initialized: {settings.firebase_storage_bucket}")

        except ImportError:
            print("firebase-admin not installed - run: pip install firebase-admin")
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")

    @property
    def is_available(self) -> bool:
        """Check if Firebase Storage is available"""
        self._initialize()
        return self._bucket is not None

    async def upload_screenshot(
        self,
        user_id: int,
        image_bytes: bytes,
        create_thumbnail: bool = True,
        quality: int = 85
    ) -> Dict[str, Any]:
        """
        Upload screenshot to Firebase Storage

        Args:
            user_id: User ID for path organization
            image_bytes: Raw image bytes
            create_thumbnail: Whether to create a thumbnail
            quality: JPEG quality (1-100)

        Returns:
            Dict with storage_path, storage_url, thumbnail_url
        """
        self._initialize()

        if not self._bucket:
            return {"error": "Firebase not available"}

        try:
            from firebase_admin import storage

            # Generate unique filename
            file_id = str(uuid4())
            timestamp = datetime.now().strftime("%Y%m%d")
            storage_path = f"users/{user_id}/screenshots/{timestamp}/{file_id}.jpg"

            # Process image
            image = Image.open(io.BytesIO(image_bytes))

            # Convert to RGB if necessary (for JPEG)
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')

            # Compress and save to buffer
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='JPEG', quality=quality)
            img_buffer.seek(0)

            # Upload main image
            blob = self._bucket.blob(storage_path)
            blob.upload_from_file(img_buffer, content_type='image/jpeg')
            blob.make_public()
            storage_url = blob.public_url

            # Create and upload thumbnail
            thumbnail_url = None
            thumbnail_path = None
            if create_thumbnail:
                thumbnail_path = f"users/{user_id}/screenshots/{timestamp}/{file_id}_thumb.jpg"
                thumb_size = (320, 180)  # 16:9 thumbnail
                image.thumbnail(thumb_size, Image.Resampling.LANCZOS)

                thumb_buffer = io.BytesIO()
                image.save(thumb_buffer, format='JPEG', quality=75)
                thumb_buffer.seek(0)

                thumb_blob = self._bucket.blob(thumbnail_path)
                thumb_blob.upload_from_file(thumb_buffer, content_type='image/jpeg')
                thumb_blob.make_public()
                thumbnail_url = thumb_blob.public_url

            return {
                "storage_path": storage_path,
                "storage_url": storage_url,
                "thumbnail_path": thumbnail_path,
                "thumbnail_url": thumbnail_url,
            }

        except Exception as e:
            print(f"Error uploading to Firebase: {e}")
            return {"error": str(e)}

    async def get_signed_url(
        self,
        storage_path: str,
        expiry_minutes: int = 60
    ) -> Optional[str]:
        """
        Generate a temporary signed URL for private file access

        Args:
            storage_path: Path to file in Firebase Storage
            expiry_minutes: URL expiration time in minutes

        Returns:
            Signed URL string or None if failed
        """
        self._initialize()

        if not self._bucket:
            return None

        try:
            blob = self._bucket.blob(storage_path)
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiry_minutes),
                method="GET"
            )
            return url
        except Exception as e:
            print(f"Error generating signed URL: {e}")
            return None

    async def delete_file(self, storage_path: str) -> bool:
        """
        Delete a file from Firebase Storage

        Args:
            storage_path: Path to file in Firebase Storage

        Returns:
            True if successful, False otherwise
        """
        self._initialize()

        if not self._bucket:
            return False

        try:
            blob = self._bucket.blob(storage_path)
            blob.delete()
            return True
        except Exception as e:
            print(f"Error deleting from Firebase: {e}")
            return False

    async def delete_user_screenshots(self, user_id: int) -> int:
        """
        Delete all screenshots for a user

        Args:
            user_id: User ID

        Returns:
            Number of files deleted
        """
        self._initialize()

        if not self._bucket:
            return 0

        try:
            prefix = f"users/{user_id}/screenshots/"
            blobs = self._bucket.list_blobs(prefix=prefix)
            count = 0
            for blob in blobs:
                blob.delete()
                count += 1
            return count
        except Exception as e:
            print(f"Error deleting user screenshots: {e}")
            return 0

    async def get_user_storage_usage(self, user_id: int) -> int:
        """
        Calculate total storage used by a user (for quotas)

        Args:
            user_id: User ID

        Returns:
            Total bytes used
        """
        self._initialize()

        if not self._bucket:
            return 0

        try:
            prefix = f"users/{user_id}/"
            blobs = self._bucket.list_blobs(prefix=prefix)
            total_bytes = sum(blob.size or 0 for blob in blobs)
            return total_bytes
        except Exception as e:
            print(f"Error calculating storage usage: {e}")
            return 0


# Singleton instance
firebase_storage = FirebaseStorageService()
