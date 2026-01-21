"""
Pytest configuration and fixtures for testing Productify Pro backend.
Provides test database, authenticated clients, and common test utilities.
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import os

# Set test environment before importing app modules
os.environ["USE_SQLITE"] = "true"
os.environ["APP_ENV"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"

from httpx import AsyncClient, ASGITransport

# Disable rate limiting for tests
from app.core.rate_limiter import limiter
limiter.enabled = False
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, PlanType
from app.services.auth_service import get_password_hash, create_access_token


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_engine():
    """Create a test database engine (in-memory SQLite)."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client with overridden database dependency."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=True) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user in the database."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("TestPassword123!"),
        name="Test User",
        is_active=True,
        is_verified=True,
        plan=PlanType.FREE,
        trial_started_at=datetime.utcnow(),
        trial_ends_at=datetime.utcnow() + timedelta(days=7),
        auth_provider="email",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_user_premium(db_session: AsyncSession) -> User:
    """Create a premium test user (PRO plan, active subscription)."""
    user = User(
        email="premium@example.com",
        hashed_password=get_password_hash("PremiumPass123!"),
        name="Premium User",
        is_active=True,
        is_verified=True,
        plan=PlanType.PRO,
        subscription_status="active",
        stripe_customer_id="cus_test123",
        subscription_id="sub_test123",
        trial_started_at=datetime.utcnow() - timedelta(days=30),
        trial_ends_at=datetime.utcnow() - timedelta(days=23),
        auth_provider="email",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_user_admin(db_session: AsyncSession) -> User:
    """Create an admin test user."""
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("AdminPass123!"),
        name="Admin User",
        is_active=True,
        is_verified=True,
        is_admin=True,
        plan=PlanType.PRO,
        subscription_status="active",
        auth_provider="email",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_user_inactive(db_session: AsyncSession) -> User:
    """Create a deactivated test user."""
    user = User(
        email="inactive@example.com",
        hashed_password=get_password_hash("InactivePass123!"),
        name="Inactive User",
        is_active=False,
        is_verified=True,
        plan=PlanType.FREE,
        auth_provider="email",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_token(test_user: User) -> str:
    """Generate a valid JWT token for the test user."""
    return create_access_token(data={"sub": str(test_user.id)})


@pytest.fixture
def auth_token_premium(test_user_premium: User) -> str:
    """Generate a valid JWT token for the premium test user."""
    return create_access_token(data={"sub": str(test_user_premium.id)})


@pytest.fixture
def auth_token_admin(test_user_admin: User) -> str:
    """Generate a valid JWT token for the admin test user."""
    return create_access_token(data={"sub": str(test_user_admin.id)})


@pytest.fixture
async def authenticated_client(
    client: AsyncClient,
    auth_token: str
) -> AsyncClient:
    """Create an authenticated test client with Bearer token."""
    client.headers["Authorization"] = f"Bearer {auth_token}"
    return client


@pytest.fixture
async def admin_client(
    client: AsyncClient,
    auth_token_admin: str
) -> AsyncClient:
    """Create an admin-authenticated test client."""
    client.headers["Authorization"] = f"Bearer {auth_token_admin}"
    return client


# Mock fixtures for external services
@pytest.fixture
def mock_email_service():
    """Mock the email service to prevent actual emails during tests."""
    with patch("app.services.email_service.email_service") as mock:
        mock.send_welcome_email = AsyncMock(return_value=True)
        mock.send_password_reset = AsyncMock(return_value=True)
        mock.send_report = AsyncMock(return_value=True)
        yield mock


@pytest.fixture
def mock_stripe():
    """Mock Stripe API calls via the stripe_service."""
    with patch("app.services.stripe_service.stripe_service") as mock_service:
        # Mock checkout session creation
        mock_service.create_checkout_session = AsyncMock(return_value={
            "id": "cs_test123",
            "url": "https://checkout.stripe.com/test"
        })

        # Mock portal session creation
        mock_service.create_portal_session = AsyncMock(return_value={
            "url": "https://billing.stripe.com/test"
        })

        # Mock subscription status
        mock_service.get_subscription_status = MagicMock(return_value={
            "status": "active",
            "current_period_end": "2024-12-31",
            "cancel_at_period_end": False
        })

        # Mock cancel subscription
        mock_service.cancel_subscription = AsyncMock(return_value=True)

        # Mock reactivate subscription
        mock_service.reactivate_subscription = AsyncMock(return_value=True)

        yield mock_service


@pytest.fixture
def mock_openai():
    """Mock OpenAI API calls."""
    with patch("openai.AsyncOpenAI") as mock:
        mock_instance = MagicMock()
        mock.return_value = mock_instance

        # Mock chat completion
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content="Test AI response"))
        ]
        mock_instance.chat.completions.create = AsyncMock(return_value=mock_response)

        yield mock_instance


@pytest.fixture
def mock_google_oauth():
    """Mock Google OAuth verification."""
    with patch("app.services.google_oauth.google_oauth_service") as mock_service:
        mock_user = MagicMock()
        mock_user.id = "google_user_123"
        mock_user.email = "google@example.com"
        mock_user.name = "Google User"
        mock_user.picture = "https://example.com/avatar.jpg"
        mock_user.verified_email = True

        mock_service.verify_id_token = AsyncMock(return_value=mock_user)
        yield mock_service


# Utility functions for tests
class TestDataFactory:
    """Factory for creating test data."""

    @staticmethod
    def user_data(
        email: str = "newuser@example.com",
        password: str = "NewPassword123!",
        name: str = "New User"
    ) -> dict:
        return {
            "email": email,
            "password": password,
            "name": name,
        }

    @staticmethod
    def login_data(
        email: str = "test@example.com",
        password: str = "TestPassword123!"
    ) -> dict:
        return {
            "email": email,
            "password": password,
        }


@pytest.fixture
def test_data() -> TestDataFactory:
    """Provide test data factory."""
    return TestDataFactory()
