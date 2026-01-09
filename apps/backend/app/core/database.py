from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text, JSON, select
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import os
import uuid

from app.core.config import settings

# Database URL configuration
# Priority: SUPABASE_DB_URL > DATABASE_URL env var > config.database_url > SQLite fallback
if settings.supabase_db_url:
    # Production: Use Supabase PostgreSQL
    DATABASE_URL = settings.supabase_db_url
    # Ensure async driver is used
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    USE_CLOUD_DB = True
elif settings.database_url:
    DATABASE_URL = settings.database_url
    USE_CLOUD_DB = not settings.database_url.startswith("sqlite")
elif settings.use_sqlite or os.getenv("USE_SQLITE", "true").lower() == "true":
    DATABASE_URL = f"sqlite+aiosqlite:///{settings.database_path}"
    USE_CLOUD_DB = False
else:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:password@localhost:5432/productify"
    )
    USE_CLOUD_DB = True

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency to get database session"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    # Import models to register them with Base
    from app.models.activity import Activity, URLActivity, YouTubeActivity
    from app.models.screenshot import Screenshot
    from app.models.settings import UserSettings, CustomList
    from app.models.goals import Goal, FocusSession
    from app.models.notifications import Notification

    # Import new auth models
    try:
        from app.models.user import User, UserSettingsNew
    except ImportError:
        pass

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed sample data for development (SQLite only, not cloud databases)
    if not USE_CLOUD_DB and settings.use_sqlite:
        await seed_data()


async def seed_data():
    """Add sample data for testing (SQLite development only)"""
    from app.models.activity import Activity
    from app.models.settings import UserSettings as LegacyUserSettings, CustomList

    async with async_session() as session:
        # Check if we already have activities
        result = await session.execute(select(Activity).limit(1))
        if result.scalar_one_or_none():
            return  # Already seeded

        print("📊 Seeding sample data...")

        # Sample activities for today
        now = datetime.now()
        base_time = now.replace(hour=9, minute=0, second=0, microsecond=0)

        sample_activities = [
            ("VS Code", "productify-pro - main.py", None, "development", 0.95, 3600),
            ("Chrome", "GitHub - Pull Request #42", "https://github.com/user/repo/pull/42", "development", 0.90, 1800),
            ("Slack", "Team Chat - #engineering", None, "communication", 0.50, 900),
            ("Chrome", "Stack Overflow - Python async", "https://stackoverflow.com/questions/123", "development", 0.85, 1200),
            ("Notion", "Sprint Planning Doc", None, "productivity", 0.80, 1500),
            ("Chrome", "YouTube - TypeScript Tutorial", "https://youtube.com/watch?v=abc123", "video", 0.40, 1800),
            ("Terminal", "zsh - npm run dev", None, "development", 0.90, 600),
            ("Figma", "Dashboard Mockups", None, "design", 0.85, 2400),
            ("Chrome", "Twitter - Home", "https://twitter.com", "social_media", 0.15, 600),
            ("VS Code", "productify-pro - Dashboard.tsx", None, "development", 0.95, 2700),
        ]

        current_time = base_time
        for app_name, title, url, category, score, duration in sample_activities:
            activity = Activity(
                id=str(uuid.uuid4()),
                app_name=app_name,
                window_title=title,
                url=url,
                domain=url.split("/")[2] if url and "/" in url else None,
                start_time=current_time,
                end_time=current_time + timedelta(seconds=duration),
                duration=duration,
                category=category,
                productivity_score=score,
                is_productive=score >= 0.6,
            )
            session.add(activity)
            current_time += timedelta(seconds=duration + 60)

        # Add default settings
        default_settings = [
            ("theme", {"value": "dark"}),
            ("launch_on_startup", {"value": False}),
            ("screenshot_enabled", {"value": True}),
            ("screenshot_interval", {"min": 10, "max": 15}),
            ("ai_enabled", {"value": False}),
        ]

        for key, value in default_settings:
            setting = LegacyUserSettings(
                id=str(uuid.uuid4()),
                key=key,
                value=value,
            )
            session.add(setting)

        # Add default custom lists
        default_lists = [
            ("productive", "github.com", "Code hosting"),
            ("productive", "stackoverflow.com", "Q&A"),
            ("productive", "notion.so", "Documentation"),
            ("distracting", "twitter.com", "Social media"),
            ("distracting", "reddit.com", "Social media"),
            ("distracting", "facebook.com", "Social media"),
            ("neutral", "gmail.com", "Email"),
            ("neutral", "slack.com", "Communication"),
        ]

        for list_type, pattern, note in default_lists:
            custom_list = CustomList(
                id=str(uuid.uuid4()),
                list_type=list_type,
                pattern=pattern,
                note=note,
            )
            session.add(custom_list)

        await session.commit()
        print("✅ Sample data seeded successfully")
