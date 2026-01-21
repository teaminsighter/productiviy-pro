"""
Alembic Async Environment Configuration
"""
import asyncio
import sys
from pathlib import Path
from logging.config import fileConfig

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import your models and database configuration
from app.core.database import Base, DATABASE_URL

# Import all models to ensure they are registered with Base.metadata
from app.models.user import User, UserSettingsNew
from app.models.activity import Activity, URLActivity, YouTubeActivity
from app.models.screenshot import Screenshot
from app.models.settings import UserSettings, CustomList
from app.models.goals import Goal, Streak, Achievement, FocusSession, DailyGoalProgress
from app.models.notifications import Notification
from app.models.team import Team, TeamMember, TeamInvite
from app.models.calendar import (
    CalendarConnection, CalendarEvent, MeetingTranscript,
    MeetingAnalysis, MeetingCostSettings, DeepWorkScore,
    FocusBlock, FocusSettings
)
from app.models.work_session import WorkSession
from app.models.integrations import IntegrationConnection

# this is the Alembic Config object
config = context.config

# Set the database URL from our config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Model metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well. By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with the given connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
