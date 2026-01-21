"""
GDPR Compliance endpoint tests for Productify Pro.
Tests cover: data export, account deletion, data retention, and user rights.
"""
import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.activity import Activity
from app.models.settings import UserSettings


class TestDataExport:
    """Tests for GDPR data export endpoint (Article 20 - Right to Data Portability)."""

    @pytest.mark.asyncio
    async def test_export_data_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test successful data export."""
        response = await authenticated_client.get("/api/auth/me/export")

        assert response.status_code == 200
        data = response.json()

        # Check export structure
        assert "export_info" in data
        assert "profile" in data
        assert "settings" in data
        assert "activities" in data
        assert "screenshots" in data
        assert "goals" in data

        # Check export metadata
        assert "exported_at" in data["export_info"]
        assert data["export_info"]["user_id"] == test_user.id

        # Check profile data
        assert data["profile"]["email"] == test_user.email
        assert data["profile"]["id"] == test_user.id

    @pytest.mark.asyncio
    async def test_export_data_unauthenticated(self, client: AsyncClient):
        """Test that export requires authentication."""
        response = await client.get("/api/auth/me/export")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_includes_activities(
        self,
        authenticated_client: AsyncClient,
        test_user: User,
        db_session: AsyncSession
    ):
        """Test that export includes user activities."""
        # Create test activity
        activity = Activity(
            id="test-activity-1",
            user_id=test_user.id,
            app_name="VS Code",
            window_title="test.py",
            start_time=datetime.utcnow() - timedelta(hours=1),
            end_time=datetime.utcnow(),
            duration=3600,
            category="development",
            productivity_score=0.9,
            is_productive=True
        )
        db_session.add(activity)
        await db_session.commit()

        response = await authenticated_client.get("/api/auth/me/export")

        assert response.status_code == 200
        data = response.json()

        # Should include the activity
        assert len(data["activities"]) >= 1
        activity_apps = [a["app_name"] for a in data["activities"]]
        assert "VS Code" in activity_apps


class TestAccountDeletion:
    """Tests for GDPR account deletion endpoint (Article 17 - Right to Erasure)."""

    @pytest.mark.asyncio
    async def test_delete_account_requires_confirmation(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that account deletion requires confirmation."""
        response = await authenticated_client.request(
            "DELETE",
            "/api/auth/me",
            json={"confirm": False, "password": "TestPassword123!"}
        )

        assert response.status_code == 400
        assert "confirm" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_account_requires_password(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that account deletion requires password for email auth users."""
        response = await authenticated_client.request(
            "DELETE",
            "/api/auth/me",
            json={"confirm": True}  # No password
        )

        assert response.status_code == 400
        assert "password" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_account_wrong_password(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that account deletion fails with wrong password."""
        response = await authenticated_client.request(
            "DELETE",
            "/api/auth/me",
            json={"confirm": True, "password": "WrongPassword123!"}
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_account_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        mock_email_service
    ):
        """Test successful account deletion."""
        from app.models.user import User, PlanType
        from app.services.auth_service import get_password_hash, create_access_token

        # Create a user specifically for deletion
        user = User(
            email="deleteme@example.com",
            hashed_password=get_password_hash("DeletePassword123!"),
            name="Delete Me",
            is_active=True,
            is_verified=True,
            plan=PlanType.FREE,
            auth_provider="email",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        token = create_access_token(data={"sub": str(user.id)})
        user_id = user.id

        # Delete the account
        client.headers["Authorization"] = f"Bearer {token}"
        response = await client.request(
            "DELETE",
            "/api/auth/me",
            json={"confirm": True, "password": "DeletePassword123!"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Account deleted successfully"
        assert data["deleted_data"]["activities"] is True
        assert data["deleted_data"]["screenshots"] is True

        # Verify user is deleted
        result = await db_session.execute(
            select(User).where(User.id == user_id)
        )
        deleted_user = result.scalar_one_or_none()
        assert deleted_user is None

    @pytest.mark.asyncio
    async def test_delete_account_unauthenticated(self, client: AsyncClient):
        """Test that account deletion requires authentication."""
        response = await client.request(
            "DELETE",
            "/api/auth/me",
            json={"confirm": True, "password": "somepassword"}
        )

        assert response.status_code == 401


class TestDataCleanup:
    """Tests for data cleanup and retention endpoints."""

    @pytest.mark.asyncio
    async def test_cleanup_preview(
        self,
        authenticated_client: AsyncClient
    ):
        """Test cleanup preview (without confirmation)."""
        response = await authenticated_client.post(
            "/api/settings/cleanup-old-data"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "preview"
        assert "data_stats" in data
        assert "warning" in data

    @pytest.mark.asyncio
    async def test_cleanup_with_confirmation(
        self,
        authenticated_client: AsyncClient
    ):
        """Test cleanup with confirmation."""
        response = await authenticated_client.post(
            "/api/settings/cleanup-old-data",
            params={"confirm": True}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "deleted" in data


class TestUserDataRights:
    """Tests for general user data rights."""

    @pytest.mark.asyncio
    async def test_user_can_view_all_data(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test that user can view all their data through various endpoints."""
        # Profile
        profile_response = await authenticated_client.get("/api/auth/me")
        assert profile_response.status_code == 200

        # Settings
        settings_response = await authenticated_client.get("/api/settings")
        assert settings_response.status_code == 200

        # Data stats
        stats_response = await authenticated_client.get("/api/settings/data-stats")
        assert stats_response.status_code == 200

        # Export
        export_response = await authenticated_client.get("/api/auth/me/export")
        assert export_response.status_code == 200

    @pytest.mark.asyncio
    async def test_user_can_modify_data(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that user can modify their data (Right to Rectification)."""
        # Update profile
        profile_response = await authenticated_client.patch(
            "/api/auth/me",
            json={"name": "Updated Name"}
        )
        assert profile_response.status_code == 200
        assert profile_response.json()["name"] == "Updated Name"

        # Update privacy settings
        settings_response = await authenticated_client.patch(
            "/api/settings/privacy",
            json={"incognitoMode": True}
        )
        assert settings_response.status_code == 200

    @pytest.mark.asyncio
    async def test_user_can_control_data_collection(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that user can control what data is collected (Right to Object)."""
        # Disable tracking
        tracking_response = await authenticated_client.patch(
            "/api/settings/tracking",
            json={"trackingEnabled": False}
        )
        assert tracking_response.status_code == 200
        assert tracking_response.json()["tracking"]["trackingEnabled"] is False

        # Disable screenshots
        screenshots_response = await authenticated_client.patch(
            "/api/settings/screenshots",
            json={"screenshotsEnabled": False}
        )
        assert screenshots_response.status_code == 200
        assert screenshots_response.json()["screenshots"]["screenshotsEnabled"] is False

    @pytest.mark.asyncio
    async def test_user_can_set_data_retention(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that user can set their data retention period."""
        # Set retention to minimum
        response = await authenticated_client.put(
            "/api/settings/data-retention",
            json={"retention_days": 7}
        )

        assert response.status_code == 200
        assert response.json()["retention_days"] == 7


class TestDataIsolation:
    """Tests for data isolation between users."""

    @pytest.mark.asyncio
    async def test_user_cannot_access_other_user_data(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_premium: User,
        db_session: AsyncSession
    ):
        """Test that users cannot access each other's data."""
        from app.services.auth_service import create_access_token

        # Create activity for premium user
        activity = Activity(
            id="premium-activity-1",
            user_id=test_user_premium.id,
            app_name="Premium App",
            window_title="Premium Work",
            start_time=datetime.utcnow() - timedelta(hours=1),
            end_time=datetime.utcnow(),
            duration=3600,
            category="development",
            productivity_score=0.9,
            is_productive=True
        )
        db_session.add(activity)
        await db_session.commit()

        # Login as regular user
        token = create_access_token(data={"sub": str(test_user.id)})
        client.headers["Authorization"] = f"Bearer {token}"

        # Export data (should not include premium user's activity)
        response = await client.get("/api/auth/me/export")
        assert response.status_code == 200

        data = response.json()
        activity_apps = [a["app_name"] for a in data["activities"]]
        assert "Premium App" not in activity_apps
