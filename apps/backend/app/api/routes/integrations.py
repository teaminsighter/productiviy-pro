"""
Integrations API Routes
Endpoints for managing third-party integrations (GitHub, Slack, etc.)
"""
import secrets
import hashlib
import hmac
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.secure_storage import secure_state_storage
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.integrations import IntegrationType, IntegrationConnection, IntegrationWebhook
from app.services.integrations_service import IntegrationsService


router = APIRouter(tags=["Integrations"])


# ============================================================================
# Request/Response Models
# ============================================================================


class IntegrationResponse(BaseModel):
    id: int
    type: str
    status: str
    external_username: Optional[str]
    workspace_name: Optional[str]
    sync_enabled: bool
    last_sync_at: Optional[str]
    created_at: str


class ToggleSyncRequest(BaseModel):
    enabled: bool


class SlackStatusRequest(BaseModel):
    status_text: str
    status_emoji: str = ":computer:"
    expiration_minutes: int = 0


class GitHubActivityResponse(BaseModel):
    period_days: int
    total_activities: int
    commits: int
    pull_requests: int
    issues: int
    reviews: int
    daily_activity: list
    top_repos: list


class DeveloperMetricsResponse(BaseModel):
    period_days: int
    total_commits: int
    total_prs: int
    total_reviews: int
    total_lines_changed: int
    avg_commits_per_day: float
    daily_metrics: list


# ============================================================================
# General Endpoints
# ============================================================================


@router.get("/")
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all integrations for the current user"""
    service = IntegrationsService(db)
    integrations = await service.get_user_integrations(current_user.id)
    return {"integrations": integrations}


@router.get("/available")
async def list_available_integrations():
    """List all available integration types"""
    return {
        "integrations": [
            {
                "type": "github",
                "name": "GitHub",
                "description": "Track commits, PRs, and code reviews",
                "icon": "github",
                "features": ["Commit tracking", "PR analytics", "Code review metrics"],
            },
            {
                "type": "slack",
                "name": "Slack",
                "description": "Sync focus status and get notifications",
                "icon": "slack",
                "features": ["Focus status sync", "Break notifications", "Daily summaries"],
            },
            {
                "type": "gitlab",
                "name": "GitLab",
                "description": "Track commits and merge requests",
                "icon": "gitlab",
                "features": ["Commit tracking", "MR analytics"],
                "coming_soon": True,
            },
            {
                "type": "linear",
                "name": "Linear",
                "description": "Track issue completion vs focus time",
                "icon": "linear",
                "features": ["Issue tracking", "Focus correlation"],
                "coming_soon": True,
            },
            {
                "type": "notion",
                "name": "Notion",
                "description": "Sync tasks and time tracking",
                "icon": "notion",
                "features": ["Task tracking", "Time logs"],
                "coming_soon": True,
            },
        ]
    }


@router.delete("/{integration_type}")
async def disconnect_integration(
    integration_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect an integration"""
    try:
        int_type = IntegrationType(integration_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown integration type: {integration_type}")

    service = IntegrationsService(db)
    success = await service.disconnect_integration(current_user.id, int_type)

    if not success:
        raise HTTPException(status_code=404, detail="Integration not found")

    return {"status": "disconnected", "type": integration_type}


@router.post("/{integration_type}/toggle-sync")
async def toggle_integration_sync(
    integration_type: str,
    request: ToggleSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enable or disable sync for an integration"""
    try:
        int_type = IntegrationType(integration_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown integration type: {integration_type}")

    service = IntegrationsService(db)
    connection = await service.toggle_sync(current_user.id, int_type, request.enabled)

    if not connection:
        raise HTTPException(status_code=404, detail="Integration not found")

    return {
        "status": "updated",
        "sync_enabled": connection.sync_enabled,
    }


# ============================================================================
# GitHub Endpoints
# ============================================================================


@router.get("/github/connect")
async def github_connect_start(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start GitHub OAuth flow"""
    # Create secure state token with 10 minute expiry
    state = await secure_state_storage.create_state(
        user_id=current_user.id,
        extra_data={"provider": "github"},
        ttl=600
    )

    service = IntegrationsService(db)
    auth_url = service.get_github_auth_url(state)

    return {"auth_url": auth_url}


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle GitHub OAuth callback"""
    # Verify and consume state token
    state_data = await secure_state_storage.verify_state(state)
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    user_id = state_data["user_id"]

    service = IntegrationsService(db)
    try:
        connection = await service.connect_github(user_id, code)

        # Redirect to frontend settings page
        return RedirectResponse(
            url=f"http://localhost:5173/settings/integrations?github=connected"
        )
    except Exception as e:
        return RedirectResponse(
            url=f"http://localhost:5173/settings/integrations?github=error&message={str(e)}"
        )


@router.post("/github/sync")
async def sync_github(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger GitHub sync"""
    service = IntegrationsService(db)
    try:
        stats = await service.sync_github_activity(current_user.id, days)
        return {
            "status": "synced",
            "stats": stats,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/github/activity")
async def get_github_activity(
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GitHubActivityResponse:
    """Get GitHub activity summary"""
    service = IntegrationsService(db)
    try:
        summary = await service.get_github_activity_summary(current_user.id, days)
        return GitHubActivityResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Slack Endpoints
# ============================================================================


@router.get("/slack/connect")
async def slack_connect_start(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start Slack OAuth flow"""
    # Create secure state token with 10 minute expiry
    state = await secure_state_storage.create_state(
        user_id=current_user.id,
        extra_data={"provider": "slack"},
        ttl=600
    )

    service = IntegrationsService(db)
    auth_url = service.get_slack_auth_url(state)

    return {"auth_url": auth_url}


@router.get("/slack/callback")
async def slack_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle Slack OAuth callback"""
    # Verify and consume state token
    state_data = await secure_state_storage.verify_state(state)
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    user_id = state_data["user_id"]

    service = IntegrationsService(db)
    try:
        connection = await service.connect_slack(user_id, code)

        return RedirectResponse(
            url=f"http://localhost:5173/settings/integrations?slack=connected"
        )
    except Exception as e:
        return RedirectResponse(
            url=f"http://localhost:5173/settings/integrations?slack=error&message={str(e)}"
        )


@router.post("/slack/status")
async def set_slack_status(
    request: SlackStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set Slack status (for focus mode integration)"""
    service = IntegrationsService(db)

    expiration = 0
    if request.expiration_minutes > 0:
        expiration = int(datetime.utcnow().timestamp()) + (request.expiration_minutes * 60)

    success = await service.set_slack_status(
        current_user.id,
        request.status_text,
        request.status_emoji,
        expiration,
    )

    if not success:
        raise HTTPException(status_code=400, detail="Failed to set Slack status. Is Slack connected?")

    return {"status": "updated"}


@router.delete("/slack/status")
async def clear_slack_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear Slack status"""
    service = IntegrationsService(db)
    success = await service.clear_slack_status(current_user.id)

    if not success:
        raise HTTPException(status_code=400, detail="Failed to clear Slack status")

    return {"status": "cleared"}


# ============================================================================
# Developer Metrics Endpoints
# ============================================================================


@router.get("/metrics/developer")
async def get_developer_metrics(
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeveloperMetricsResponse:
    """Get aggregated developer metrics"""
    service = IntegrationsService(db)
    metrics = await service.get_developer_metrics(current_user.id, days)
    return DeveloperMetricsResponse(**metrics)


@router.post("/metrics/calculate")
async def calculate_metrics(
    date: str = Query(default=None, description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate developer metrics for a specific date"""
    if date:
        calc_date = datetime.fromisoformat(date)
    else:
        calc_date = datetime.utcnow()

    service = IntegrationsService(db)
    metrics = await service.calculate_developer_metrics(current_user.id, calc_date)

    return {
        "status": "calculated",
        "date": metrics.date.isoformat(),
        "commits": metrics.commits_count,
        "prs_opened": metrics.prs_opened,
    }


# ============================================================================
# Webhook Endpoints
# ============================================================================


async def process_github_webhook(
    payload: dict,
    event_type: str,
    connection_id: int,
    db: AsyncSession,
):
    """Background task to process GitHub webhook events"""
    from app.models.integrations import GitHubActivity

    connection_result = await db.execute(
        select(IntegrationConnection).where(IntegrationConnection.id == connection_id)
    )
    connection = connection_result.scalar_one_or_none()
    if not connection:
        return

    user_id = connection.user_id
    now = datetime.utcnow()

    if event_type == "push":
        # Process commits
        for commit in payload.get("commits", []):
            activity = GitHubActivity(
                user_id=user_id,
                connection_id=connection_id,
                activity_type="commit",
                github_id=commit["id"],
                repo_name=payload["repository"]["name"],
                repo_full_name=payload["repository"]["full_name"],
                message=commit.get("message", "")[:500],
                url=commit.get("url"),
                occurred_at=now,
            )
            db.add(activity)

    elif event_type == "pull_request":
        pr = payload.get("pull_request", {})
        activity = GitHubActivity(
            user_id=user_id,
            connection_id=connection_id,
            activity_type="pull_request",
            github_id=str(pr.get("id")),
            repo_name=payload["repository"]["name"],
            repo_full_name=payload["repository"]["full_name"],
            title=pr.get("title", "")[:500],
            url=pr.get("html_url"),
            additions=pr.get("additions", 0),
            deletions=pr.get("deletions", 0),
            changed_files=pr.get("changed_files", 0),
            occurred_at=now,
        )
        db.add(activity)

    elif event_type == "pull_request_review":
        review = payload.get("review", {})
        activity = GitHubActivity(
            user_id=user_id,
            connection_id=connection_id,
            activity_type="review",
            github_id=str(review.get("id")),
            repo_name=payload["repository"]["name"],
            repo_full_name=payload["repository"]["full_name"],
            url=review.get("html_url"),
            occurred_at=now,
        )
        db.add(activity)

    await db.commit()


@router.post("/webhooks/github/{webhook_id}")
async def github_webhook(
    webhook_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None, alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    db: AsyncSession = Depends(get_db),
):
    """
    Receive GitHub webhook events
    This endpoint is called by GitHub when events occur
    """
    # Get webhook config
    webhook_result = await db.execute(
        select(IntegrationWebhook).where(IntegrationWebhook.webhook_id == webhook_id)
    )
    webhook = webhook_result.scalar_one_or_none()

    if not webhook or not webhook.is_active:
        raise HTTPException(status_code=404, detail="Webhook not found")

    # Verify signature if secret is set
    if webhook.webhook_secret and x_hub_signature_256:
        body = await request.body()
        expected_signature = "sha256=" + hmac.new(
            webhook.webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse payload
    payload = await request.json()

    # Update last received timestamp
    webhook.last_received_at = datetime.utcnow()
    await db.commit()

    # Process event in background
    if x_github_event in ["push", "pull_request", "pull_request_review"]:
        background_tasks.add_task(
            process_github_webhook,
            payload,
            x_github_event,
            webhook.connection_id,
            db,
        )

    return {"status": "received", "event": x_github_event}


@router.post("/webhooks/github/setup")
async def setup_github_webhook(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Setup a GitHub webhook for the user's repositories
    Returns the webhook URL and secret to configure in GitHub
    """
    # Get GitHub connection
    connection_result = await db.execute(
        select(IntegrationConnection).where(
            and_(
                IntegrationConnection.user_id == current_user.id,
                IntegrationConnection.integration_type == IntegrationType.GITHUB,
            )
        )
    )
    connection = connection_result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=400, detail="GitHub not connected")

    # Generate webhook ID and secret
    webhook_id = secrets.token_urlsafe(16)
    webhook_secret = secrets.token_urlsafe(32)

    # Check for existing webhook
    existing_result = await db.execute(
        select(IntegrationWebhook).where(
            IntegrationWebhook.connection_id == connection.id
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        # Update existing webhook
        existing.webhook_id = webhook_id
        existing.webhook_secret = webhook_secret
        existing.is_active = True
        webhook = existing
    else:
        # Create new webhook config
        webhook = IntegrationWebhook(
            connection_id=connection.id,
            webhook_id=webhook_id,
            webhook_secret=webhook_secret,
            events=["push", "pull_request", "pull_request_review"],
            is_active=True,
        )
        db.add(webhook)

    await db.commit()

    # Return webhook URL for GitHub configuration
    base_url = "http://localhost:8000"  # Use env var in production
    webhook_url = f"{base_url}/api/integrations/webhooks/github/{webhook_id}"

    return {
        "webhook_url": webhook_url,
        "webhook_secret": webhook_secret,
        "events": ["push", "pull_request", "pull_request_review"],
        "instructions": [
            "1. Go to your GitHub repository Settings > Webhooks",
            "2. Click 'Add webhook'",
            "3. Set Payload URL to the webhook_url above",
            "4. Set Content type to 'application/json'",
            "5. Set Secret to the webhook_secret above",
            "6. Select events: 'Push', 'Pull requests'",
            "7. Click 'Add webhook'",
        ],
    }


# ============================================================================
# Team GitHub Activity Endpoints
# ============================================================================


class TeamMemberGitHubStats(BaseModel):
    user_id: int
    name: str
    avatar_url: Optional[str]
    commits: int
    pull_requests: int
    reviews: int
    lines_changed: int


class TeamGitHubActivityResponse(BaseModel):
    period_days: int
    total_commits: int
    total_prs: int
    total_reviews: int
    members: list[TeamMemberGitHubStats]
    daily_activity: list


@router.get("/github/team/{team_id}")
async def get_team_github_activity(
    team_id: int,
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamGitHubActivityResponse:
    """Get GitHub activity for all team members"""
    from app.models.team import Team, TeamMember
    from app.models.integrations import GitHubActivity, IntegrationConnection
    from sqlalchemy import func
    from datetime import timedelta

    # Verify user is in team
    member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user.id,
            )
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    # Get all team members with GitHub connections
    team_members_result = await db.execute(
        select(TeamMember, User, IntegrationConnection)
        .join(User, TeamMember.user_id == User.id)
        .outerjoin(
            IntegrationConnection,
            and_(
                IntegrationConnection.user_id == User.id,
                IntegrationConnection.integration_type == IntegrationType.GITHUB,
            )
        )
        .where(TeamMember.team_id == team_id)
    )
    team_members = team_members_result.all()

    since_date = datetime.utcnow() - timedelta(days=days)
    members_stats = []
    total_commits = 0
    total_prs = 0
    total_reviews = 0
    daily_data = {}

    for tm, user, connection in team_members:
        member_commits = 0
        member_prs = 0
        member_reviews = 0
        member_lines = 0

        if connection:
            # Get GitHub activity for this member
            activity_result = await db.execute(
                select(
                    GitHubActivity.activity_type,
                    func.count().label("count"),
                    func.sum(GitHubActivity.additions + GitHubActivity.deletions).label("lines")
                )
                .where(
                    and_(
                        GitHubActivity.user_id == user.id,
                        GitHubActivity.occurred_at >= since_date,
                    )
                )
                .group_by(GitHubActivity.activity_type)
            )

            for row in activity_result:
                if row.activity_type == "commit":
                    member_commits = row.count
                elif row.activity_type == "pull_request":
                    member_prs = row.count
                    member_lines = row.lines or 0
                elif row.activity_type == "review":
                    member_reviews = row.count

            # Get daily activity for chart
            daily_result = await db.execute(
                select(
                    func.date(GitHubActivity.occurred_at).label("date"),
                    func.count().label("count")
                )
                .where(
                    and_(
                        GitHubActivity.user_id == user.id,
                        GitHubActivity.occurred_at >= since_date,
                    )
                )
                .group_by(func.date(GitHubActivity.occurred_at))
            )

            for row in daily_result:
                date_str = str(row.date)
                if date_str not in daily_data:
                    daily_data[date_str] = 0
                daily_data[date_str] += row.count

        members_stats.append(TeamMemberGitHubStats(
            user_id=user.id,
            name=user.name,
            avatar_url=user.avatar_url,
            commits=member_commits,
            pull_requests=member_prs,
            reviews=member_reviews,
            lines_changed=int(member_lines) if member_lines else 0,
        ))

        total_commits += member_commits
        total_prs += member_prs
        total_reviews += member_reviews

    # Sort members by total activity
    members_stats.sort(key=lambda m: m.commits + m.pull_requests + m.reviews, reverse=True)

    # Convert daily data to list
    daily_activity = [{"date": k, "count": v} for k, v in sorted(daily_data.items())]

    return TeamGitHubActivityResponse(
        period_days=days,
        total_commits=total_commits,
        total_prs=total_prs,
        total_reviews=total_reviews,
        members=members_stats,
        daily_activity=daily_activity,
    )


@router.delete("/webhooks/github")
async def delete_github_webhook(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete GitHub webhook configuration"""
    connection_result = await db.execute(
        select(IntegrationConnection).where(
            and_(
                IntegrationConnection.user_id == current_user.id,
                IntegrationConnection.integration_type == IntegrationType.GITHUB,
            )
        )
    )
    connection = connection_result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=400, detail="GitHub not connected")

    webhook_result = await db.execute(
        select(IntegrationWebhook).where(
            IntegrationWebhook.connection_id == connection.id
        )
    )
    webhook = webhook_result.scalar_one_or_none()

    if webhook:
        await db.delete(webhook)
        await db.commit()

    return {"status": "deleted"}
