"""
Integration Models
Models for third-party service integrations (GitHub, Slack, etc.)
"""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class IntegrationType(str, enum.Enum):
    """Supported integration types"""
    GITHUB = "github"
    GITLAB = "gitlab"
    SLACK = "slack"
    LINEAR = "linear"
    JIRA = "jira"
    VSCODE = "vscode"
    NOTION = "notion"


class IntegrationStatus(str, enum.Enum):
    """Connection status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"


class IntegrationConnection(Base):
    """
    Stores OAuth connections and API keys for third-party integrations
    """
    __tablename__ = "integration_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Integration type
    integration_type = Column(Enum(IntegrationType), nullable=False)
    status = Column(Enum(IntegrationStatus), default=IntegrationStatus.PENDING)

    # OAuth tokens (encrypted in production)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)

    # API key (alternative to OAuth)
    api_key = Column(Text, nullable=True)

    # Integration-specific data
    external_user_id = Column(String(255), nullable=True)  # e.g., GitHub user ID
    external_username = Column(String(255), nullable=True)  # e.g., GitHub username
    workspace_id = Column(String(255), nullable=True)  # e.g., Slack workspace
    workspace_name = Column(String(255), nullable=True)

    # Scopes and permissions
    scopes = Column(JSON, nullable=True)  # List of granted scopes

    # Sync settings
    sync_enabled = Column(Boolean, default=True)
    last_sync_at = Column(DateTime, nullable=True)
    sync_error = Column(Text, nullable=True)

    # Metadata
    settings = Column(JSON, nullable=True)  # Integration-specific settings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="integrations")


class GitHubActivity(Base):
    """
    Stores GitHub activity (commits, PRs, issues) for correlation with focus time
    """
    __tablename__ = "github_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    connection_id = Column(Integer, ForeignKey("integration_connections.id"), nullable=False)

    # Activity type
    activity_type = Column(String(50), nullable=False)  # commit, pull_request, issue, review

    # GitHub data
    github_id = Column(String(255), nullable=False)  # Unique ID from GitHub
    repo_name = Column(String(255), nullable=False)
    repo_full_name = Column(String(500), nullable=True)

    # Activity details
    title = Column(String(500), nullable=True)  # PR/Issue title
    message = Column(Text, nullable=True)  # Commit message
    url = Column(String(1000), nullable=True)  # Link to GitHub

    # Metrics
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    changed_files = Column(Integer, default=0)

    # Timing
    occurred_at = Column(DateTime, nullable=False)

    # Correlation with focus
    during_focus_session = Column(Boolean, default=False)
    deep_work_score_at_time = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class SlackActivity(Base):
    """
    Stores Slack activity for correlation with productivity
    """
    __tablename__ = "slack_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    connection_id = Column(Integer, ForeignKey("integration_connections.id"), nullable=False)

    # Activity type
    activity_type = Column(String(50), nullable=False)  # message, reaction, call, status_change

    # Slack data
    channel_id = Column(String(255), nullable=True)
    channel_name = Column(String(255), nullable=True)
    is_dm = Column(Boolean, default=False)

    # Timing
    occurred_at = Column(DateTime, nullable=False)

    # For status changes
    status_text = Column(String(255), nullable=True)
    status_emoji = Column(String(50), nullable=True)

    # For messages (aggregated, not content)
    message_count = Column(Integer, default=1)  # We aggregate per hour

    created_at = Column(DateTime, default=datetime.utcnow)


class DeveloperMetrics(Base):
    """
    Daily aggregated developer metrics from integrations
    """
    __tablename__ = "developer_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)

    # GitHub metrics
    commits_count = Column(Integer, default=0)
    prs_opened = Column(Integer, default=0)
    prs_merged = Column(Integer, default=0)
    prs_reviewed = Column(Integer, default=0)
    issues_opened = Column(Integer, default=0)
    issues_closed = Column(Integer, default=0)
    lines_added = Column(Integer, default=0)
    lines_deleted = Column(Integer, default=0)

    # Coding time (from VS Code or similar)
    coding_minutes = Column(Integer, default=0)
    active_coding_minutes = Column(Integer, default=0)  # Actual typing/editing

    # Languages used
    languages = Column(JSON, nullable=True)  # {"python": 120, "typescript": 60} in minutes

    # Slack metrics
    messages_sent = Column(Integer, default=0)
    messages_in_dms = Column(Integer, default=0)
    channels_active = Column(Integer, default=0)

    # Correlation with productivity
    focus_correlation = Column(Integer, nullable=True)  # -100 to 100, how much focus affects output

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IntegrationWebhook(Base):
    """
    Stores webhook configurations for real-time integration updates
    """
    __tablename__ = "integration_webhooks"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("integration_connections.id"), nullable=False)

    # Webhook config
    webhook_id = Column(String(255), nullable=False)  # External webhook ID
    webhook_secret = Column(String(255), nullable=True)  # For validation
    events = Column(JSON, nullable=True)  # Events subscribed to

    # Status
    is_active = Column(Boolean, default=True)
    last_received_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
