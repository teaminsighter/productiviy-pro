"""Add database indexes for common queries

Revision ID: 001_add_indexes
Revises:
Create Date: 2026-01-17 07:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_add_indexes'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add indexes for common query patterns."""
    # Activities indexes
    op.create_index(
        'ix_activities_user_time',
        'activities',
        ['user_id', 'start_time'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_activities_category',
        'activities',
        ['category'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_activities_user_productive',
        'activities',
        ['user_id', 'is_productive'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_activities_app_name',
        'activities',
        ['app_name'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_activities_domain',
        'activities',
        ['domain'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_activities_start_time',
        'activities',
        ['start_time'],
        unique=False,
        if_not_exists=True
    )

    # URL Activities indexes
    op.create_index(
        'ix_url_activities_user_time',
        'url_activities',
        ['user_id', 'timestamp'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_url_activities_domain',
        'url_activities',
        ['domain'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_url_activities_activity_id',
        'url_activities',
        ['activity_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_url_activities_timestamp',
        'url_activities',
        ['timestamp'],
        unique=False,
        if_not_exists=True
    )

    # YouTube Activities indexes
    op.create_index(
        'ix_youtube_activities_user_time',
        'youtube_activities',
        ['user_id', 'timestamp'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_youtube_activities_video',
        'youtube_activities',
        ['video_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_youtube_activities_activity_id',
        'youtube_activities',
        ['activity_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_youtube_activities_timestamp',
        'youtube_activities',
        ['timestamp'],
        unique=False,
        if_not_exists=True
    )

    # Screenshots indexes
    op.create_index(
        'ix_screenshots_user_time',
        'screenshots',
        ['user_id', 'timestamp'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_screenshots_user_deleted',
        'screenshots',
        ['user_id', 'is_deleted'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_screenshots_timestamp',
        'screenshots',
        ['timestamp'],
        unique=False,
        if_not_exists=True
    )

    # Goals indexes
    op.create_index(
        'ix_goals_user_active',
        'goals',
        ['user_id', 'is_active'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_goals_user_type',
        'goals',
        ['user_id', 'goal_type'],
        unique=False,
        if_not_exists=True
    )

    # Focus Sessions indexes
    op.create_index(
        'ix_focus_sessions_user_time',
        'focus_sessions',
        ['user_id', 'started_at'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_focus_sessions_user_completed',
        'focus_sessions',
        ['user_id', 'was_completed'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_focus_sessions_started_at',
        'focus_sessions',
        ['started_at'],
        unique=False,
        if_not_exists=True
    )

    # Work Sessions indexes
    op.create_index(
        'ix_work_sessions_user_time',
        'work_sessions',
        ['user_id', 'started_at'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_work_sessions_user_status',
        'work_sessions',
        ['user_id', 'status'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_work_sessions_user_project',
        'work_sessions',
        ['user_id', 'project_name'],
        unique=False,
        if_not_exists=True
    )


def downgrade() -> None:
    """Remove indexes."""
    # Activities
    op.drop_index('ix_activities_user_time', table_name='activities')
    op.drop_index('ix_activities_category', table_name='activities')
    op.drop_index('ix_activities_user_productive', table_name='activities')
    op.drop_index('ix_activities_app_name', table_name='activities')
    op.drop_index('ix_activities_domain', table_name='activities')
    op.drop_index('ix_activities_start_time', table_name='activities')

    # URL Activities
    op.drop_index('ix_url_activities_user_time', table_name='url_activities')
    op.drop_index('ix_url_activities_domain', table_name='url_activities')
    op.drop_index('ix_url_activities_activity_id', table_name='url_activities')
    op.drop_index('ix_url_activities_timestamp', table_name='url_activities')

    # YouTube Activities
    op.drop_index('ix_youtube_activities_user_time', table_name='youtube_activities')
    op.drop_index('ix_youtube_activities_video', table_name='youtube_activities')
    op.drop_index('ix_youtube_activities_activity_id', table_name='youtube_activities')
    op.drop_index('ix_youtube_activities_timestamp', table_name='youtube_activities')

    # Screenshots
    op.drop_index('ix_screenshots_user_time', table_name='screenshots')
    op.drop_index('ix_screenshots_user_deleted', table_name='screenshots')
    op.drop_index('ix_screenshots_timestamp', table_name='screenshots')

    # Goals
    op.drop_index('ix_goals_user_active', table_name='goals')
    op.drop_index('ix_goals_user_type', table_name='goals')

    # Focus Sessions
    op.drop_index('ix_focus_sessions_user_time', table_name='focus_sessions')
    op.drop_index('ix_focus_sessions_user_completed', table_name='focus_sessions')
    op.drop_index('ix_focus_sessions_started_at', table_name='focus_sessions')

    # Work Sessions
    op.drop_index('ix_work_sessions_user_time', table_name='work_sessions')
    op.drop_index('ix_work_sessions_user_status', table_name='work_sessions')
    op.drop_index('ix_work_sessions_user_project', table_name='work_sessions')
