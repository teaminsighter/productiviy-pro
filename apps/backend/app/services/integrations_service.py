"""
Integrations Service
Handles third-party integrations (GitHub, Slack, etc.)
"""
import os
import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integrations import (
    IntegrationConnection,
    IntegrationType,
    IntegrationStatus,
    GitHubActivity,
    SlackActivity,
    DeveloperMetrics,
)
from app.core.config import settings


# OAuth Configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/api/integrations/github/callback")

SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")
SLACK_REDIRECT_URI = os.getenv("SLACK_REDIRECT_URI", "http://localhost:8000/api/integrations/slack/callback")


class IntegrationsService:
    """Service for managing third-party integrations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # Connection Management
    # =========================================================================

    async def get_user_integrations(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all integrations for a user"""
        result = await self.db.execute(
            select(IntegrationConnection).where(IntegrationConnection.user_id == user_id)
        )
        connections = result.scalars().all()

        return [
            {
                "id": c.id,
                "type": c.integration_type.value,
                "status": c.status.value,
                "external_username": c.external_username,
                "workspace_name": c.workspace_name,
                "sync_enabled": c.sync_enabled,
                "last_sync_at": c.last_sync_at.isoformat() if c.last_sync_at else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in connections
        ]

    async def get_connection(
        self, user_id: int, integration_type: IntegrationType
    ) -> Optional[IntegrationConnection]:
        """Get a specific integration connection"""
        result = await self.db.execute(
            select(IntegrationConnection).where(
                and_(
                    IntegrationConnection.user_id == user_id,
                    IntegrationConnection.integration_type == integration_type,
                )
            )
        )
        return result.scalar_one_or_none()

    async def disconnect_integration(
        self, user_id: int, integration_type: IntegrationType
    ) -> bool:
        """Disconnect an integration"""
        connection = await self.get_connection(user_id, integration_type)
        if not connection:
            return False

        await self.db.delete(connection)
        await self.db.commit()
        return True

    async def toggle_sync(
        self, user_id: int, integration_type: IntegrationType, enabled: bool
    ) -> Optional[IntegrationConnection]:
        """Enable or disable sync for an integration"""
        connection = await self.get_connection(user_id, integration_type)
        if not connection:
            return None

        connection.sync_enabled = enabled
        await self.db.commit()
        await self.db.refresh(connection)
        return connection

    # =========================================================================
    # GitHub Integration
    # =========================================================================

    def get_github_auth_url(self, state: str) -> str:
        """Generate GitHub OAuth authorization URL"""
        scopes = "repo,read:user,read:org"
        return (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={GITHUB_CLIENT_ID}"
            f"&redirect_uri={GITHUB_REDIRECT_URI}"
            f"&scope={scopes}"
            f"&state={state}"
        )

    async def connect_github(self, user_id: int, code: str) -> IntegrationConnection:
        """Complete GitHub OAuth flow and create connection"""
        async with httpx.AsyncClient() as client:
            # Exchange code for token
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GITHUB_REDIRECT_URI,
                },
            )
            token_data = token_response.json()

            if "error" in token_data:
                raise Exception(f"GitHub OAuth error: {token_data.get('error_description', token_data['error'])}")

            access_token = token_data["access_token"]
            scopes = token_data.get("scope", "").split(",")

            # Get user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
            )
            github_user = user_response.json()

        # Check for existing connection
        existing = await self.get_connection(user_id, IntegrationType.GITHUB)
        if existing:
            # Update existing connection
            existing.access_token = access_token
            existing.external_user_id = str(github_user["id"])
            existing.external_username = github_user["login"]
            existing.scopes = scopes
            existing.status = IntegrationStatus.ACTIVE
            existing.updated_at = datetime.utcnow()
            connection = existing
        else:
            # Create new connection
            connection = IntegrationConnection(
                user_id=user_id,
                integration_type=IntegrationType.GITHUB,
                status=IntegrationStatus.ACTIVE,
                access_token=access_token,
                external_user_id=str(github_user["id"]),
                external_username=github_user["login"],
                scopes=scopes,
            )
            self.db.add(connection)

        await self.db.commit()
        await self.db.refresh(connection)
        return connection

    async def sync_github_activity(
        self, user_id: int, days: int = 7
    ) -> Dict[str, Any]:
        """Sync recent GitHub activity for a user"""
        connection = await self.get_connection(user_id, IntegrationType.GITHUB)
        if not connection or connection.status != IntegrationStatus.ACTIVE:
            raise Exception("GitHub not connected")

        since = datetime.utcnow() - timedelta(days=days)
        stats = {"commits": 0, "prs": 0, "issues": 0, "reviews": 0}

        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {connection.access_token}",
                "Accept": "application/vnd.github.v3+json",
            }

            # Get user's events
            events_response = await client.get(
                f"https://api.github.com/users/{connection.external_username}/events",
                headers=headers,
                params={"per_page": 100},
            )

            if events_response.status_code != 200:
                connection.status = IntegrationStatus.ERROR
                connection.sync_error = f"API error: {events_response.status_code}"
                await self.db.commit()
                raise Exception(f"GitHub API error: {events_response.status_code}")

            events = events_response.json()

            for event in events:
                event_time = datetime.fromisoformat(event["created_at"].replace("Z", "+00:00"))
                if event_time < since:
                    continue

                # Check if we already have this event
                existing = await self.db.execute(
                    select(GitHubActivity).where(
                        and_(
                            GitHubActivity.user_id == user_id,
                            GitHubActivity.github_id == str(event["id"]),
                        )
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                activity = None
                if event["type"] == "PushEvent":
                    for commit in event["payload"].get("commits", []):
                        activity = GitHubActivity(
                            user_id=user_id,
                            connection_id=connection.id,
                            activity_type="commit",
                            github_id=commit["sha"],
                            repo_name=event["repo"]["name"].split("/")[-1],
                            repo_full_name=event["repo"]["name"],
                            message=commit.get("message", "")[:500],
                            occurred_at=event_time,
                        )
                        stats["commits"] += 1

                elif event["type"] == "PullRequestEvent":
                    pr = event["payload"]["pull_request"]
                    activity = GitHubActivity(
                        user_id=user_id,
                        connection_id=connection.id,
                        activity_type="pull_request",
                        github_id=str(pr["id"]),
                        repo_name=event["repo"]["name"].split("/")[-1],
                        repo_full_name=event["repo"]["name"],
                        title=pr.get("title", "")[:500],
                        url=pr.get("html_url"),
                        additions=pr.get("additions", 0),
                        deletions=pr.get("deletions", 0),
                        changed_files=pr.get("changed_files", 0),
                        occurred_at=event_time,
                    )
                    stats["prs"] += 1

                elif event["type"] == "IssuesEvent":
                    issue = event["payload"]["issue"]
                    activity = GitHubActivity(
                        user_id=user_id,
                        connection_id=connection.id,
                        activity_type="issue",
                        github_id=str(issue["id"]),
                        repo_name=event["repo"]["name"].split("/")[-1],
                        repo_full_name=event["repo"]["name"],
                        title=issue.get("title", "")[:500],
                        url=issue.get("html_url"),
                        occurred_at=event_time,
                    )
                    stats["issues"] += 1

                elif event["type"] == "PullRequestReviewEvent":
                    review = event["payload"]["review"]
                    activity = GitHubActivity(
                        user_id=user_id,
                        connection_id=connection.id,
                        activity_type="review",
                        github_id=str(review["id"]),
                        repo_name=event["repo"]["name"].split("/")[-1],
                        repo_full_name=event["repo"]["name"],
                        url=review.get("html_url"),
                        occurred_at=event_time,
                    )
                    stats["reviews"] += 1

                if activity:
                    self.db.add(activity)

        connection.last_sync_at = datetime.utcnow()
        connection.sync_error = None
        await self.db.commit()

        return stats

    async def get_github_activity_summary(
        self, user_id: int, days: int = 7
    ) -> Dict[str, Any]:
        """Get GitHub activity summary for a user"""
        since = datetime.utcnow() - timedelta(days=days)

        result = await self.db.execute(
            select(
                GitHubActivity.activity_type,
                func.count(GitHubActivity.id).label("count"),
                func.sum(GitHubActivity.additions).label("additions"),
                func.sum(GitHubActivity.deletions).label("deletions"),
            )
            .where(
                and_(
                    GitHubActivity.user_id == user_id,
                    GitHubActivity.occurred_at >= since,
                )
            )
            .group_by(GitHubActivity.activity_type)
        )
        type_stats = {row.activity_type: row.count for row in result}

        # Get daily breakdown
        daily_result = await self.db.execute(
            select(
                func.date(GitHubActivity.occurred_at).label("date"),
                func.count(GitHubActivity.id).label("count"),
            )
            .where(
                and_(
                    GitHubActivity.user_id == user_id,
                    GitHubActivity.occurred_at >= since,
                )
            )
            .group_by(func.date(GitHubActivity.occurred_at))
            .order_by(func.date(GitHubActivity.occurred_at))
        )
        daily_activity = [
            {"date": row.date.isoformat(), "count": row.count}
            for row in daily_result
        ]

        # Get top repos
        repo_result = await self.db.execute(
            select(
                GitHubActivity.repo_name,
                func.count(GitHubActivity.id).label("count"),
            )
            .where(
                and_(
                    GitHubActivity.user_id == user_id,
                    GitHubActivity.occurred_at >= since,
                )
            )
            .group_by(GitHubActivity.repo_name)
            .order_by(func.count(GitHubActivity.id).desc())
            .limit(5)
        )
        top_repos = [{"name": row.repo_name, "count": row.count} for row in repo_result]

        return {
            "period_days": days,
            "total_activities": sum(type_stats.values()),
            "commits": type_stats.get("commit", 0),
            "pull_requests": type_stats.get("pull_request", 0),
            "issues": type_stats.get("issue", 0),
            "reviews": type_stats.get("review", 0),
            "daily_activity": daily_activity,
            "top_repos": top_repos,
        }

    # =========================================================================
    # Slack Integration
    # =========================================================================

    def get_slack_auth_url(self, state: str) -> str:
        """Generate Slack OAuth authorization URL"""
        scopes = "users:read,users.profile:read,users.profile:write"
        return (
            f"https://slack.com/oauth/v2/authorize"
            f"?client_id={SLACK_CLIENT_ID}"
            f"&redirect_uri={SLACK_REDIRECT_URI}"
            f"&scope={scopes}"
            f"&state={state}"
        )

    async def connect_slack(self, user_id: int, code: str) -> IntegrationConnection:
        """Complete Slack OAuth flow and create connection"""
        async with httpx.AsyncClient() as client:
            # Exchange code for token
            token_response = await client.post(
                "https://slack.com/api/oauth.v2.access",
                data={
                    "client_id": SLACK_CLIENT_ID,
                    "client_secret": SLACK_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": SLACK_REDIRECT_URI,
                },
            )
            token_data = token_response.json()

            if not token_data.get("ok"):
                raise Exception(f"Slack OAuth error: {token_data.get('error')}")

            access_token = token_data["access_token"]
            authed_user = token_data.get("authed_user", {})
            team = token_data.get("team", {})

        # Check for existing connection
        existing = await self.get_connection(user_id, IntegrationType.SLACK)
        if existing:
            existing.access_token = access_token
            existing.external_user_id = authed_user.get("id")
            existing.workspace_id = team.get("id")
            existing.workspace_name = team.get("name")
            existing.scopes = token_data.get("scope", "").split(",")
            existing.status = IntegrationStatus.ACTIVE
            existing.updated_at = datetime.utcnow()
            connection = existing
        else:
            connection = IntegrationConnection(
                user_id=user_id,
                integration_type=IntegrationType.SLACK,
                status=IntegrationStatus.ACTIVE,
                access_token=access_token,
                external_user_id=authed_user.get("id"),
                workspace_id=team.get("id"),
                workspace_name=team.get("name"),
                scopes=token_data.get("scope", "").split(","),
            )
            self.db.add(connection)

        await self.db.commit()
        await self.db.refresh(connection)
        return connection

    async def set_slack_status(
        self,
        user_id: int,
        status_text: str,
        status_emoji: str = ":computer:",
        expiration: int = 0,
    ) -> bool:
        """Set user's Slack status (for focus mode integration)"""
        connection = await self.get_connection(user_id, IntegrationType.SLACK)
        if not connection or connection.status != IntegrationStatus.ACTIVE:
            return False

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/users.profile.set",
                headers={"Authorization": f"Bearer {connection.access_token}"},
                json={
                    "profile": {
                        "status_text": status_text,
                        "status_emoji": status_emoji,
                        "status_expiration": expiration,
                    }
                },
            )
            result = response.json()
            return result.get("ok", False)

    async def clear_slack_status(self, user_id: int) -> bool:
        """Clear user's Slack status"""
        return await self.set_slack_status(user_id, "", "")

    # =========================================================================
    # Developer Metrics
    # =========================================================================

    async def calculate_developer_metrics(
        self, user_id: int, date: datetime
    ) -> DeveloperMetrics:
        """Calculate aggregated developer metrics for a day"""
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # Check if metrics already exist
        result = await self.db.execute(
            select(DeveloperMetrics).where(
                and_(
                    DeveloperMetrics.user_id == user_id,
                    DeveloperMetrics.date == start_of_day,
                )
            )
        )
        metrics = result.scalar_one_or_none()

        if not metrics:
            metrics = DeveloperMetrics(user_id=user_id, date=start_of_day)
            self.db.add(metrics)

        # Calculate GitHub metrics
        github_result = await self.db.execute(
            select(
                GitHubActivity.activity_type,
                func.count(GitHubActivity.id).label("count"),
                func.sum(GitHubActivity.additions).label("additions"),
                func.sum(GitHubActivity.deletions).label("deletions"),
            )
            .where(
                and_(
                    GitHubActivity.user_id == user_id,
                    GitHubActivity.occurred_at >= start_of_day,
                    GitHubActivity.occurred_at < end_of_day,
                )
            )
            .group_by(GitHubActivity.activity_type)
        )

        for row in github_result:
            if row.activity_type == "commit":
                metrics.commits_count = row.count
                metrics.lines_added = row.additions or 0
                metrics.lines_deleted = row.deletions or 0
            elif row.activity_type == "pull_request":
                metrics.prs_opened = row.count
            elif row.activity_type == "review":
                metrics.prs_reviewed = row.count
            elif row.activity_type == "issue":
                metrics.issues_opened = row.count

        metrics.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(metrics)
        return metrics

    async def get_developer_metrics(
        self, user_id: int, days: int = 7
    ) -> Dict[str, Any]:
        """Get developer metrics for a period"""
        since = datetime.utcnow() - timedelta(days=days)
        since = since.replace(hour=0, minute=0, second=0, microsecond=0)

        result = await self.db.execute(
            select(DeveloperMetrics)
            .where(
                and_(
                    DeveloperMetrics.user_id == user_id,
                    DeveloperMetrics.date >= since,
                )
            )
            .order_by(DeveloperMetrics.date)
        )
        metrics_list = result.scalars().all()

        if not metrics_list:
            return {
                "period_days": days,
                "total_commits": 0,
                "total_prs": 0,
                "total_reviews": 0,
                "total_lines_changed": 0,
                "avg_commits_per_day": 0,
                "daily_metrics": [],
            }

        total_commits = sum(m.commits_count for m in metrics_list)
        total_prs = sum(m.prs_opened for m in metrics_list)
        total_reviews = sum(m.prs_reviewed for m in metrics_list)
        total_lines = sum(m.lines_added + m.lines_deleted for m in metrics_list)

        return {
            "period_days": days,
            "total_commits": total_commits,
            "total_prs": total_prs,
            "total_reviews": total_reviews,
            "total_lines_changed": total_lines,
            "avg_commits_per_day": total_commits / len(metrics_list) if metrics_list else 0,
            "daily_metrics": [
                {
                    "date": m.date.isoformat(),
                    "commits": m.commits_count,
                    "prs_opened": m.prs_opened,
                    "prs_reviewed": m.prs_reviewed,
                    "lines_added": m.lines_added,
                    "lines_deleted": m.lines_deleted,
                }
                for m in metrics_list
            ],
        }
