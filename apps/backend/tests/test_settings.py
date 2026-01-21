"""
Settings endpoint tests for Productify Pro.
Tests cover: user settings CRUD, API key management, custom lists, and data management.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.settings import UserSettings


class TestSettingsGet:
    """Tests for getting user settings."""

    @pytest.mark.asyncio
    async def test_get_settings_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test getting user settings."""
        response = await authenticated_client.get("/api/settings")

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "general" in data
        assert "tracking" in data
        assert "screenshots" in data
        assert "ai" in data
        assert "privacy" in data
        assert "notifications" in data

        # Check defaults
        assert data["general"]["theme"] == "dark"
        assert data["tracking"]["trackingEnabled"] is True
        assert data["privacy"]["dataRetentionDays"] == 90

    @pytest.mark.asyncio
    async def test_get_settings_unauthenticated(self, client: AsyncClient):
        """Test getting settings without authentication fails."""
        response = await client.get("/api/settings")
        assert response.status_code == 401


class TestSettingsUpdate:
    """Tests for updating user settings."""

    @pytest.mark.asyncio
    async def test_update_general_settings(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating general settings."""
        response = await authenticated_client.patch(
            "/api/settings/general",
            json={
                "theme": "light",
                "language": "es",
                "startOnBoot": False
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["general"]["theme"] == "light"
        assert data["general"]["language"] == "es"
        assert data["general"]["startOnBoot"] is False

    @pytest.mark.asyncio
    async def test_update_tracking_settings(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating tracking settings."""
        response = await authenticated_client.patch(
            "/api/settings/tracking",
            json={
                "trackingEnabled": False,
                "workStartTime": "08:00",
                "workEndTime": "18:00",
                "idleTimeout": 600
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["tracking"]["trackingEnabled"] is False
        assert data["tracking"]["workStartTime"] == "08:00"
        assert data["tracking"]["workEndTime"] == "18:00"
        assert data["tracking"]["idleTimeout"] == 600

    @pytest.mark.asyncio
    async def test_update_privacy_settings(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating privacy settings."""
        response = await authenticated_client.patch(
            "/api/settings/privacy",
            json={
                "incognitoMode": True,
                "dataRetentionDays": 30
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["privacy"]["incognitoMode"] is True
        assert data["privacy"]["dataRetentionDays"] == 30

    @pytest.mark.asyncio
    async def test_update_screenshot_settings(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating screenshot settings."""
        response = await authenticated_client.patch(
            "/api/settings/screenshots",
            json={
                "screenshotsEnabled": False,
                "screenshotInterval": 600,
                "blurScreenshots": True,
                "autoDeleteAfter": 7
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["screenshots"]["screenshotsEnabled"] is False
        assert data["screenshots"]["screenshotInterval"] == 600
        assert data["screenshots"]["blurScreenshots"] is True
        assert data["screenshots"]["autoDeleteAfter"] == 7


class TestSettingsValidation:
    """Tests for settings input validation."""

    @pytest.mark.asyncio
    async def test_invalid_time_format(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that invalid time format is rejected."""
        response = await authenticated_client.patch(
            "/api/settings/tracking",
            json={
                "workStartTime": "invalid"
            }
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_idle_timeout_too_low(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that idle timeout below minimum is rejected."""
        response = await authenticated_client.patch(
            "/api/settings/tracking",
            json={
                "idleTimeout": 30  # Below 60 second minimum
            }
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_idle_timeout_too_high(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that idle timeout above maximum is rejected."""
        response = await authenticated_client.patch(
            "/api/settings/tracking",
            json={
                "idleTimeout": 5000  # Above 3600 second maximum
            }
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_screenshot_quality(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that invalid screenshot quality is rejected."""
        response = await authenticated_client.patch(
            "/api/settings/screenshots",
            json={
                "screenshotQuality": "ultra"  # Invalid value
            }
        )

        assert response.status_code == 422


class TestDataRetention:
    """Tests for data retention settings endpoints."""

    @pytest.mark.asyncio
    async def test_get_data_retention(
        self,
        authenticated_client: AsyncClient
    ):
        """Test getting data retention settings."""
        response = await authenticated_client.get("/api/settings/data-retention")

        assert response.status_code == 200
        data = response.json()
        assert "retention_days" in data
        assert "cutoff_date" in data
        assert data["retention_days"] == 90  # Default

    @pytest.mark.asyncio
    async def test_update_data_retention(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating data retention period."""
        response = await authenticated_client.put(
            "/api/settings/data-retention",
            json={"retention_days": 30}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["retention_days"] == 30

    @pytest.mark.asyncio
    async def test_update_data_retention_below_minimum(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that retention below 7 days is rejected."""
        response = await authenticated_client.put(
            "/api/settings/data-retention",
            json={"retention_days": 3}
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_data_retention_above_maximum(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that retention above 365 days is rejected."""
        response = await authenticated_client.put(
            "/api/settings/data-retention",
            json={"retention_days": 500}
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_data_stats(
        self,
        authenticated_client: AsyncClient
    ):
        """Test getting data statistics."""
        response = await authenticated_client.get("/api/settings/data-stats")

        assert response.status_code == 200
        data = response.json()
        assert "activities" in data
        assert "screenshots" in data
        assert "retention_settings" in data


class TestCustomLists:
    """Tests for custom classification lists."""

    @pytest.mark.asyncio
    async def test_get_custom_lists(
        self,
        authenticated_client: AsyncClient
    ):
        """Test getting custom lists."""
        response = await authenticated_client.get("/api/settings/lists")

        assert response.status_code == 200
        data = response.json()
        assert "productive" in data
        assert "distracting" in data
        assert "neutral" in data
        assert "excluded" in data

    @pytest.mark.asyncio
    async def test_add_to_productive_list(
        self,
        authenticated_client: AsyncClient
    ):
        """Test adding an item to productive list."""
        response = await authenticated_client.post(
            "/api/settings/lists/productive",
            json={
                "pattern": "mywork.com",
                "note": "Internal work tool"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "added"
        assert data["list"] == "productive"

    @pytest.mark.asyncio
    async def test_add_to_distracting_list(
        self,
        authenticated_client: AsyncClient
    ):
        """Test adding an item to distracting list."""
        response = await authenticated_client.post(
            "/api/settings/lists/distracting",
            json={
                "pattern": "timewaster.com",
                "note": "Social media"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "added"
        assert data["list"] == "distracting"

    @pytest.mark.asyncio
    async def test_add_to_invalid_list(
        self,
        authenticated_client: AsyncClient
    ):
        """Test adding to invalid list type fails."""
        response = await authenticated_client.post(
            "/api/settings/lists/invalid",
            json={
                "pattern": "example.com",
                "note": "Test"
            }
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_update_custom_lists(
        self,
        authenticated_client: AsyncClient
    ):
        """Test bulk updating custom lists."""
        response = await authenticated_client.put(
            "/api/settings/lists",
            json={
                "productive": [
                    {"pattern": "github.com", "note": "Code hosting"},
                    {"pattern": "stackoverflow.com", "note": "Q&A"}
                ],
                "distracting": [
                    {"pattern": "twitter.com", "note": "Social"}
                ],
                "neutral": [],
                "excluded": []
            }
        )

        assert response.status_code == 200


class TestSettingsReset:
    """Tests for resetting settings."""

    @pytest.mark.asyncio
    async def test_reset_settings_requires_confirm(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that reset requires confirmation."""
        response = await authenticated_client.post(
            "/api/settings/reset",
            params={"confirm": False}
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_reset_settings_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test resetting settings to defaults."""
        # First modify a setting
        await authenticated_client.patch(
            "/api/settings",
            json={"general": {"theme": "light"}}
        )

        # Then reset
        response = await authenticated_client.post(
            "/api/settings/reset",
            params={"confirm": True}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["settings"]["general"]["theme"] == "dark"  # Back to default


class TestStorageInfo:
    """Tests for storage information endpoint."""

    @pytest.mark.asyncio
    async def test_get_storage_info(
        self,
        authenticated_client: AsyncClient
    ):
        """Test getting storage information."""
        response = await authenticated_client.get("/api/settings/storage")

        assert response.status_code == 200
        data = response.json()
        assert "activity_data_mb" in data
        assert "screenshots_mb" in data
        assert "total_mb" in data
        assert "limit_mb" in data
        assert "usage_percent" in data
        assert "activity_count" in data
        assert "screenshot_count" in data
