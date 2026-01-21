"""
Billing and Stripe integration tests for Productify Pro.
Tests cover: checkout sessions, subscriptions, license validation, and webhooks.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, PlanType


class TestCheckoutSession:
    """Tests for Stripe checkout session creation."""

    @pytest.mark.asyncio
    async def test_create_checkout_session_personal(
        self,
        authenticated_client: AsyncClient
    ):
        """Test creating checkout session for personal plan."""
        from unittest.mock import patch, AsyncMock

        with patch("app.api.routes.billing.stripe_service") as mock_service:
            mock_service.create_checkout_session = AsyncMock(return_value={
                "id": "cs_test123",
                "url": "https://checkout.stripe.com/test"
            })

            response = await authenticated_client.post(
                "/api/billing/create-checkout-session",
                json={
                    "plan": "personal",
                    "billing_cycle": "monthly"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "url" in data
            assert "id" in data

    @pytest.mark.asyncio
    async def test_create_checkout_session_pro(
        self,
        authenticated_client: AsyncClient
    ):
        """Test creating checkout session for pro plan."""
        from unittest.mock import patch, AsyncMock

        with patch("app.api.routes.billing.stripe_service") as mock_service:
            mock_service.create_checkout_session = AsyncMock(return_value={
                "id": "cs_test_pro",
                "url": "https://checkout.stripe.com/pro"
            })

            response = await authenticated_client.post(
                "/api/billing/create-checkout-session",
                json={
                    "plan": "pro",
                    "billing_cycle": "yearly"
                }
            )

            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_checkout_session_unauthenticated(
        self,
        client: AsyncClient
    ):
        """Test checkout session fails without authentication."""
        response = await client.post(
            "/api/billing/create-checkout-session",
            json={
                "plan": "personal",
                "billing_cycle": "monthly"
            }
        )

        assert response.status_code == 401


class TestPortalSession:
    """Tests for Stripe customer portal."""

    @pytest.mark.asyncio
    async def test_create_portal_session(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User
    ):
        """Test creating customer portal session for premium user."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"

        with patch("app.services.stripe_service.stripe_service.create_portal_session") as mock_portal:
            mock_portal.return_value = {
                "url": "https://billing.stripe.com/session/test"
            }

            response = await client.post("/api/billing/create-portal-session")

            assert response.status_code == 200
            assert "url" in response.json()


class TestSubscriptionStatus:
    """Tests for subscription status endpoint."""

    @pytest.mark.asyncio
    async def test_get_subscription_free_user(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test getting subscription status for free user with trial."""
        response = await authenticated_client.get("/api/billing/subscription")

        assert response.status_code == 200
        data = response.json()
        assert data["has_subscription"] is False
        assert data["plan"] == "free"
        assert data["is_trial"] is True
        assert "days_left" in data

    @pytest.mark.asyncio
    async def test_get_subscription_premium_user(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User
    ):
        """Test getting subscription status for premium user."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"

        with patch("app.services.stripe_service.stripe_service.get_subscription_status") as mock_status:
            mock_status.return_value = {
                "status": "active",
                "current_period_end": "2024-12-31",
                "cancel_at_period_end": False
            }

            response = await client.get("/api/billing/subscription")

            assert response.status_code == 200
            data = response.json()
            assert data["has_subscription"] is True
            assert data["plan"] == "pro"


class TestSubscriptionCancellation:
    """Tests for subscription cancellation and reactivation."""

    @pytest.mark.asyncio
    async def test_cancel_subscription_success(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User,
        db_session: AsyncSession
    ):
        """Test canceling an active subscription."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"

        with patch("app.services.stripe_service.stripe_service.cancel_subscription") as mock_cancel:
            mock_cancel.return_value = True

            response = await client.post("/api/billing/cancel")

            assert response.status_code == 200
            assert "canceled" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_cancel_subscription_no_subscription(
        self,
        authenticated_client: AsyncClient
    ):
        """Test canceling fails when no subscription exists."""
        response = await authenticated_client.post("/api/billing/cancel")

        assert response.status_code == 400
        assert "no active subscription" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_reactivate_subscription_success(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User,
        db_session: AsyncSession
    ):
        """Test reactivating a canceled subscription."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"

        with patch("app.services.stripe_service.stripe_service.reactivate_subscription") as mock_reactivate:
            mock_reactivate.return_value = True

            response = await client.post("/api/billing/reactivate")

            assert response.status_code == 200
            assert "reactivated" in response.json()["message"].lower()


class TestLicenseValidation:
    """Tests for license validation and device activation."""

    @pytest.mark.asyncio
    async def test_validate_license_active_subscription(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User
    ):
        """Test license validation for user with active subscription."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"

        with patch("app.services.license_service.license_service.validate_license") as mock_validate:
            mock_validate.return_value = {
                "valid": True,
                "plan": "pro",
                "features": ["ai_insights", "team_features", "unlimited_screenshots"]
            }

            response = await client.post(
                "/api/billing/validate-license",
                json={
                    "device_id": "device_123",
                    "device_name": "MacBook Pro"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is True

    @pytest.mark.asyncio
    async def test_validate_license_trial_user(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test license validation for trial user."""
        with patch("app.services.license_service.license_service.validate_license") as mock_validate:
            mock_validate.return_value = {
                "valid": True,
                "plan": "free",
                "trial_active": True,
                "trial_days_left": 7,
                "features": ["ai_insights", "basic_tracking"]
            }

            response = await authenticated_client.post("/api/billing/validate-license")

            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is True
            assert data["trial_active"] is True

    @pytest.mark.asyncio
    async def test_activate_device_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test device activation."""
        with patch("app.services.license_service.license_service.activate_device") as mock_activate:
            mock_activate.return_value = True

            response = await authenticated_client.post(
                "/api/billing/activate-device",
                json={
                    "device_id": "device_abc123",
                    "device_name": "Work Laptop"
                }
            )

            assert response.status_code == 200
            assert "activated" in response.json()["message"].lower()


class TestPlanFeatures:
    """Tests for plan-based feature access."""

    @pytest.mark.asyncio
    async def test_free_plan_features(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test that free plan user gets correct feature flags."""
        response = await authenticated_client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "free"
        # During trial, should have premium access
        assert data["has_premium_access"] is True

    @pytest.mark.asyncio
    async def test_pro_plan_features(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User
    ):
        """Test that pro plan user has premium access."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"
        response = await client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "pro"
        assert data["has_premium_access"] is True


class TestTrialExpiry:
    """Tests for trial expiry handling."""

    @pytest.mark.asyncio
    async def test_expired_trial_no_premium_access(
        self,
        db_session: AsyncSession,
        client: AsyncClient
    ):
        """Test that expired trial user loses premium access."""
        from app.services.auth_service import get_password_hash, create_access_token

        # Create user with expired trial
        expired_user = User(
            email="expired@example.com",
            hashed_password=get_password_hash("expiredpass123"),
            name="Expired Trial User",
            is_active=True,
            is_verified=True,
            plan=PlanType.FREE,
            trial_started_at=datetime.utcnow() - timedelta(days=14),
            trial_ends_at=datetime.utcnow() - timedelta(days=7),  # Expired 7 days ago
            subscription_status="expired",
            auth_provider="email",
        )
        db_session.add(expired_user)
        await db_session.commit()
        await db_session.refresh(expired_user)

        # Generate token for expired user
        token = create_access_token(data={"sub": str(expired_user.id)})
        client.headers["Authorization"] = f"Bearer {token}"

        response = await client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["is_trial_active"] is False
        assert data["has_premium_access"] is False
        assert data["days_left_trial"] == 0


class TestWebhooks:
    """Tests for Stripe webhook handling."""

    @pytest.mark.asyncio
    async def test_webhook_signature_validation(
        self,
        client: AsyncClient
    ):
        """Test that webhook rejects invalid signatures."""
        # Webhook endpoint should validate Stripe signature
        response = await client.post(
            "/api/billing/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"stripe-signature": "invalid_signature"}
        )

        # Should fail signature verification
        assert response.status_code in [400, 401, 500]


class TestBillingEdgeCases:
    """Tests for edge cases in billing."""

    @pytest.mark.asyncio
    async def test_checkout_invalid_plan(
        self,
        authenticated_client: AsyncClient
    ):
        """Test checkout fails with invalid plan."""
        with patch("app.services.stripe_service.stripe_service.create_checkout_session") as mock_create:
            mock_create.side_effect = Exception("Invalid plan")

            response = await authenticated_client.post(
                "/api/billing/create-checkout-session",
                json={
                    "plan": "invalid_plan",
                    "billing_cycle": "monthly"
                }
            )

            assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_subscription_status_stripe_error(
        self,
        client: AsyncClient,
        auth_token_premium: str,
        test_user_premium: User
    ):
        """Test graceful handling of Stripe API errors."""
        client.headers["Authorization"] = f"Bearer {auth_token_premium}"

        with patch("app.services.stripe_service.stripe_service.get_subscription_status") as mock_status:
            mock_status.return_value = None  # Stripe error

            response = await client.get("/api/billing/subscription")

            # Should return a valid response even if Stripe fails
            assert response.status_code == 200
