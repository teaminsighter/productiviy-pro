"""
Authentication endpoint tests for Productify Pro.
Tests cover: registration, login, token verification, password management, and OAuth flows.
"""
import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, PlanType
from app.services.auth_service import get_password_hash, verify_password


class TestUserRegistration:
    """Tests for user registration endpoint."""

    @pytest.mark.asyncio
    async def test_register_success(
        self,
        client: AsyncClient,
        mock_email_service,
        db_session: AsyncSession
    ):
        """Test successful user registration."""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePassword123!",
                "name": "New User"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["name"] == "New User"
        assert data["user"]["plan"] == "free"
        assert data["user"]["is_trial_active"] is True

    @pytest.mark.asyncio
    async def test_register_duplicate_email(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test registration fails with duplicate email."""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": test_user.email,
                "password": "AnotherPassword123!",
                "name": "Another User"
            }
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration fails with weak password (< 8 chars)."""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "weak@example.com",
                "password": "short",
                "name": "Weak Password User"
            }
        )

        # Pydantic validation returns 422 for invalid input
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration fails with invalid email format."""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "not-an-email",
                "password": "SecurePassword123!",
                "name": "Invalid Email User"
            }
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_register_no_name(
        self,
        client: AsyncClient,
        mock_email_service
    ):
        """Test registration succeeds without name (optional field)."""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "noname@example.com",
                "password": "SecurePassword123!"
            }
        )

        assert response.status_code == 200
        data = response.json()
        # Name can be None or derived from email prefix
        assert data["user"]["name"] is None or isinstance(data["user"]["name"], str)


class TestUserLogin:
    """Tests for user login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test successful login with valid credentials."""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_login_wrong_password(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test login fails with wrong password."""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "wrongpassword"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login fails for non-existent user."""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "somepassword123"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_inactive_user(
        self,
        client: AsyncClient,
        test_user_inactive: User
    ):
        """Test login fails for deactivated user."""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "InactivePass123!"
            }
        )

        assert response.status_code == 403
        assert "deactivated" in response.json()["detail"].lower()


class TestTokenVerification:
    """Tests for token verification and current user endpoints."""

    @pytest.mark.asyncio
    async def test_get_current_user(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test getting current user with valid token."""
        response = await authenticated_client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["id"] == test_user.id

    @pytest.mark.asyncio
    async def test_get_current_user_no_token(self, client: AsyncClient):
        """Test accessing protected endpoint without token."""
        response = await client.get("/api/auth/me")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test accessing protected endpoint with invalid token."""
        client.headers["Authorization"] = "Bearer invalid-token-here"
        response = await client.get("/api/auth/me")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_verify_token_valid(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test token verification endpoint with valid token."""
        response = await authenticated_client.post("/api/auth/verify-token")

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["user_id"] == test_user.id
        assert data["email"] == test_user.email

    @pytest.mark.asyncio
    async def test_auth_status_authenticated(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test auth status endpoint when authenticated."""
        response = await authenticated_client.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["user"]["email"] == test_user.email

    @pytest.mark.asyncio
    async def test_auth_status_not_authenticated(self, client: AsyncClient):
        """Test auth status endpoint when not authenticated."""
        response = await client.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False


class TestPasswordManagement:
    """Tests for password change and reset functionality."""

    @pytest.mark.asyncio
    async def test_change_password_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User,
        db_session: AsyncSession
    ):
        """Test successful password change."""
        response = await authenticated_client.post(
            "/api/auth/change-password",
            json={
                "current_password": "TestPassword123!",
                "new_password": "NewPassword456!"
            }
        )

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(
        self,
        authenticated_client: AsyncClient
    ):
        """Test password change fails with wrong current password."""
        response = await authenticated_client.post(
            "/api/auth/change-password",
            json={
                "current_password": "WrongPassword123!",
                "new_password": "NewPassword456!"
            }
        )

        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_change_password_weak_new(
        self,
        authenticated_client: AsyncClient
    ):
        """Test password change fails with weak new password."""
        response = await authenticated_client.post(
            "/api/auth/change-password",
            json={
                "current_password": "TestPassword123!",
                "new_password": "short"
            }
        )

        # Pydantic validation returns 422 for invalid input
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_forgot_password_existing_user(
        self,
        client: AsyncClient,
        test_user: User,
        mock_email_service
    ):
        """Test forgot password for existing user."""
        response = await client.post(
            "/api/auth/forgot-password",
            json={"email": test_user.email}
        )

        assert response.status_code == 200
        # Always returns same message to prevent email enumeration
        assert "reset link" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_forgot_password_nonexistent_user(
        self,
        client: AsyncClient
    ):
        """Test forgot password for non-existent user (should not reveal user existence)."""
        response = await client.post(
            "/api/auth/forgot-password",
            json={"email": "nonexistent@example.com"}
        )

        # Same response to prevent email enumeration
        assert response.status_code == 200
        assert "reset link" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, client: AsyncClient):
        """Test password reset with invalid token."""
        response = await client.post(
            "/api/auth/reset-password",
            json={
                "token": "invalid-reset-token",
                "new_password": "NewPassword456!"
            }
        )

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()


class TestProfileUpdate:
    """Tests for profile update functionality."""

    @pytest.mark.asyncio
    async def test_update_profile_name(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating user name."""
        response = await authenticated_client.patch(
            "/api/auth/me",
            json={"name": "Updated Name"}
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_profile_avatar(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating user avatar URL."""
        response = await authenticated_client.patch(
            "/api/auth/me",
            json={"avatar_url": "https://example.com/new-avatar.jpg"}
        )

        assert response.status_code == 200
        assert response.json()["avatar_url"] == "https://example.com/new-avatar.jpg"


class TestGoogleOAuth:
    """Tests for Google OAuth authentication."""

    @pytest.mark.asyncio
    async def test_google_auth_new_user(
        self,
        client: AsyncClient,
        mock_email_service,
        db_session: AsyncSession
    ):
        """Test Google OAuth creates new user."""
        from unittest.mock import patch, AsyncMock, MagicMock

        mock_user = MagicMock()
        mock_user.id = "google_user_123"
        mock_user.email = "google@example.com"
        mock_user.name = "Google User"
        mock_user.picture = "https://example.com/avatar.jpg"
        mock_user.verified_email = True

        with patch("app.services.google_oauth.google_oauth_service.verify_id_token",
                   new_callable=AsyncMock, return_value=mock_user):
            response = await client.post(
                "/api/auth/google",
                json={"token": "valid-google-token"}
            )

            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert data["user"]["email"] == "google@example.com"
            assert data["user"]["name"] == "Google User"

    @pytest.mark.asyncio
    async def test_google_auth_existing_user(
        self,
        client: AsyncClient,
        test_user: User,
        db_session: AsyncSession
    ):
        """Test Google OAuth links to existing email account."""
        from unittest.mock import patch, AsyncMock, MagicMock

        mock_user = MagicMock()
        mock_user.id = "google_123"
        mock_user.email = test_user.email
        mock_user.name = "Google Name"
        mock_user.picture = "https://example.com/pic.jpg"
        mock_user.verified_email = True

        with patch("app.services.google_oauth.google_oauth_service.verify_id_token",
                   new_callable=AsyncMock, return_value=mock_user):
            response = await client.post(
                "/api/auth/google",
                json={"token": "valid-google-token"}
            )

            assert response.status_code == 200
            assert response.json()["user"]["email"] == test_user.email


class TestLogout:
    """Tests for logout functionality."""

    @pytest.mark.asyncio
    async def test_logout(self, client: AsyncClient):
        """Test logout endpoint (stateless, just confirms)."""
        response = await client.post("/api/auth/logout")

        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()


class TestPremiumFeatures:
    """Tests for premium user features."""

    @pytest.mark.asyncio
    async def test_premium_user_has_access(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User
    ):
        """Test premium user has premium access flag."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"
        response = await client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["has_premium_access"] is True
        assert data["plan"] == "pro"

    @pytest.mark.asyncio
    async def test_trial_user_has_premium_access(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test trial user has premium access during trial."""
        response = await authenticated_client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        # Trial is active, so has premium access
        assert data["is_trial_active"] is True
        assert data["has_premium_access"] is True
