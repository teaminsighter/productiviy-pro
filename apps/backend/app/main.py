from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
from typing import List
from datetime import datetime

# Initialize logging first
from app.core.logging import setup_logging, get_logger
from app.core.config import settings as app_settings

# Setup logging based on environment
logger = setup_logging(
    level=app_settings.log_level,
    json_logs=app_settings.app_env == "production",
)
app_logger = get_logger(__name__)

# Initialize Sentry after logging
import sentry_sdk

# Security imports
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.security_middleware import SecurityHeadersMiddleware, CSRFMiddleware
from app.core.logging_middleware import RequestLoggingMiddleware, PerformanceMonitoringMiddleware

if app_settings.sentry_dsn:
    sentry_sdk.init(
        dsn=app_settings.sentry_dsn,
        traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
        profiles_sample_rate=0.1,  # 10% of sampled transactions for profiling
        environment=app_settings.app_env,
        release=f"productify-pro@0.1.0",
    )
    app_logger.info("Sentry error tracking initialized")

from app.api.routes import activities, analytics, screenshots, ai_insights, settings, goals, notifications, onboarding, system, reports, auth, billing, teams, updates, rules, calendar, deepwork, focus, team_deepwork, integrations, meeting_intelligence, admin, work_sessions
from app.core.database import init_db
from app.services.activity_tracker import get_current_activity, check_activitywatch_status
from app.services.classification import classify_activity

# Optional: Real-time transcription (requires deepgram)
try:
    from app.services.realtime_transcription import realtime_manager
    REALTIME_TRANSCRIPTION_AVAILABLE = True
except ImportError:
    realtime_manager = None
    REALTIME_TRANSCRIPTION_AVAILABLE = False
    app_logger.warning("Real-time transcription not available (deepgram not installed)")


class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._logger = get_logger("websocket.manager")

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self._logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self._logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


async def activity_broadcaster():
    """Background task to broadcast current activity"""
    while True:
        try:
            if manager.active_connections:
                # Get current activity
                current = await get_current_activity()
                status = await check_activitywatch_status()

                if current:
                    # Classify the activity
                    classification = classify_activity(
                        current.app_name,
                        current.window_title,
                        current.url
                    )

                    message = {
                        "type": "current_activity",
                        "timestamp": datetime.now().isoformat(),
                        "data": {
                            "app_name": current.app_name,
                            "window_title": current.window_title,
                            "url": current.url,
                            "duration": current.duration,
                            "start_time": current.start_time.isoformat() if current.start_time else None,
                            "is_afk": current.is_afk,
                            "category": classification.category,
                            "productivity_score": classification.productivity_score,
                            "productivity_type": classification.productivity_type,
                        },
                        "activitywatch_available": status.get("available", False),
                    }
                    await manager.broadcast(message)

        except Exception as e:
            app_logger.error(f"Error in activity broadcaster: {e}", exc_info=True)

        # Wait before next update
        await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    app_logger.info("Starting Productify Pro Backend...")
    await init_db()
    app_logger.info("Database initialized")

    # Check ActivityWatch status
    status = await check_activitywatch_status()
    if status.get("available"):
        app_logger.info(f"ActivityWatch connected at {status.get('url')}")
        app_logger.info(f"ActivityWatch buckets: {', '.join(status.get('buckets', []))}")
    else:
        app_logger.warning("ActivityWatch not available - using mock data")

    # Start screenshot scheduler
    from app.services.screenshot_service import screenshot_service
    screenshot_service.start_scheduler()
    app_logger.info(f"Screenshot scheduler started (interval: {screenshot_service.min_interval}-{screenshot_service.max_interval} min)")

    # Start goal sync service
    from app.services.goal_sync_service import goal_sync_service
    goal_syncer_task = asyncio.create_task(goal_sync_service.start())
    app_logger.info(f"Goal sync service started (interval: {goal_sync_service.sync_interval}s)")

    # Start background broadcaster
    broadcaster_task = asyncio.create_task(activity_broadcaster())

    yield

    # Shutdown
    broadcaster_task.cancel()
    try:
        await broadcaster_task
    except asyncio.CancelledError:
        pass

    # Stop goal sync service
    goal_sync_service.stop()
    goal_syncer_task.cancel()
    try:
        await goal_syncer_task
    except asyncio.CancelledError:
        pass

    # Stop screenshot scheduler
    try:
        screenshot_service.stop_scheduler()
    except Exception:
        pass

    app_logger.info("Shutting down Productify Pro Backend...")


app = FastAPI(
    title="Productify Pro API",
    description="AI-powered productivity tracking backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter

# Custom rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Middleware order: LAST added = FIRST to process incoming requests
# So we add in reverse order of desired execution

# 1. Logging (processes last, after everything else)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(PerformanceMonitoringMiddleware)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. CSRF Protection (disabled for JWT-based auth)
app.add_middleware(CSRFMiddleware, enabled=False)

# 4. CORS - added LAST so it processes FIRST
# This ensures CORS preflight and headers are handled before any auth/security checks
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",   # Vite dev server
        "http://localhost:3000",   # Next.js landing page
        "http://127.0.0.1:1420",
        "http://127.0.0.1:3000",
        "tauri://localhost",       # Tauri app
        "https://tauri.localhost", # Tauri app (https)
        "*",                       # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(activities.router, prefix="/api/activities", tags=["Activities"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(screenshots.router, prefix="/api/screenshots", tags=["Screenshots"])
app.include_router(ai_insights.router, prefix="/api/ai", tags=["AI Insights"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals & Focus"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(system.router, prefix="/api/system", tags=["System"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"])
app.include_router(updates.router, prefix="/api/updates", tags=["Updates"])
app.include_router(rules.router, prefix="/api/rules", tags=["Rules"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(deepwork.router, prefix="/api/deepwork", tags=["Deep Work"])
app.include_router(focus.router, prefix="/api/focus", tags=["Focus Mode"])
app.include_router(team_deepwork.router, prefix="/api", tags=["Team Deep Work"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])
app.include_router(meeting_intelligence.router, prefix="/api/meetings", tags=["Meeting Intelligence"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(work_sessions.router, prefix="/api/work-sessions", tags=["Work Sessions"])


@app.websocket("/ws/activities")
async def activity_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time activity updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Handle client messages if needed
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        app_logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket)


@app.websocket("/ws/transcribe")
async def realtime_transcription_websocket(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time meeting transcription

    Protocol:
    1. Client connects with ?token=<jwt_token> query parameter
    2. Client sends: {"type": "start", "meeting_title": "Optional Title"}
    3. Server responds: {"type": "session_started", "session_id": "..."}
    4. Client sends audio chunks as binary data
    5. Server sends: {"type": "transcript", "text": "...", "is_final": bool, ...}
    6. Client sends: {"type": "stop"} to end session
    7. Server responds: {"type": "session_ended", "result": {...}}
    """
    # Authenticate user from token
    authenticated_user_id = None
    if token:
        from app.services.auth_service import verify_token, get_user_by_id
        from app.core.database import async_session_maker

        payload = verify_token(token)
        if payload:
            user_id_str = payload.get("sub")
            if user_id_str:
                try:
                    authenticated_user_id = int(user_id_str)
                except (ValueError, TypeError):
                    pass

    # Check if real-time transcription is available
    if not REALTIME_TRANSCRIPTION_AVAILABLE or realtime_manager is None:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "error": "Real-time transcription is not available. Please install deepgram-sdk.",
        })
        await websocket.close()
        return

    await websocket.accept()
    session_id = None

    async def on_transcript(data: dict):
        """Callback to send transcript updates to client"""
        try:
            await websocket.send_json(data)
        except Exception:
            pass

    async def on_error(data: dict):
        """Callback to send error updates to client"""
        try:
            await websocket.send_json({"type": "error", **data})
        except Exception:
            pass

    try:
        while True:
            # Receive message (can be text or binary)
            message = await websocket.receive()

            if "text" in message:
                # Text message - control commands
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")

                    if msg_type == "start":
                        # Start new transcription session
                        # Use authenticated user ID, fall back to 1 for backwards compatibility
                        user_id = authenticated_user_id or data.get("user_id", 1)
                        meeting_title = data.get("meeting_title")

                        session_id = realtime_manager.create_session(
                            user_id=user_id,
                            meeting_title=meeting_title,
                            on_transcript=on_transcript,
                            on_error=on_error,
                        )

                        started = await realtime_manager.start_session(session_id)
                        if started:
                            await websocket.send_json({
                                "type": "session_started",
                                "session_id": session_id,
                                "meeting_title": meeting_title,
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "error": "Failed to start transcription session",
                            })

                    elif msg_type == "stop":
                        # Stop transcription and get results
                        if session_id:
                            result = await realtime_manager.stop_session(session_id)
                            await websocket.send_json({
                                "type": "session_ended",
                                "result": result,
                            })
                            realtime_manager.remove_session(session_id)
                            session_id = None
                        break

                    elif msg_type == "ping":
                        await websocket.send_json({
                            "type": "pong",
                            "timestamp": datetime.now().isoformat(),
                        })

                except json.JSONDecodeError:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Invalid JSON message",
                    })

            elif "bytes" in message:
                # Binary message - audio data
                if session_id:
                    audio_data = message["bytes"]
                    await realtime_manager.send_audio(session_id, audio_data)

    except WebSocketDisconnect:
        # Clean up session on disconnect
        if session_id:
            await realtime_manager.stop_session(session_id)
            realtime_manager.remove_session(session_id)
    except Exception as e:
        app_logger.error(f"Realtime transcription WebSocket error: {e}", exc_info=True)
        if session_id:
            await realtime_manager.stop_session(session_id)
            realtime_manager.remove_session(session_id)


@app.get("/")
async def root():
    return {
        "message": "Productify Pro API",
        "status": "running",
        "version": "0.1.0",
        "docs_url": "/docs",
    }


@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    status = await check_activitywatch_status()
    return {
        "status": "healthy",
        "version": "0.1.0",
        "activitywatch": status.get("available", False),
        "websocket_connections": len(manager.active_connections),
    }


@app.get("/sentry-debug")
async def trigger_error():
    """Trigger a test error for Sentry verification"""
    division_by_zero = 1 / 0
    return {"message": "This will never be reached"}


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with component status"""
    from app.core.database import async_session
    from sqlalchemy import text

    health = {
        "status": "healthy",
        "version": "0.1.0",
        "environment": app_settings.app_env,
        "components": {}
    }

    # Check database
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        health["components"]["database"] = {"status": "healthy"}
    except Exception as e:
        health["components"]["database"] = {"status": "unhealthy", "error": str(e)}
        health["status"] = "degraded"

    # Check ActivityWatch
    aw_status = await check_activitywatch_status()
    health["components"]["activitywatch"] = {
        "status": "healthy" if aw_status.get("available") else "unavailable",
        "url": aw_status.get("url"),
    }

    # Check Redis (if configured)
    if app_settings.redis_url:
        try:
            import redis.asyncio as redis
            r = redis.from_url(app_settings.redis_url)
            await r.ping()
            health["components"]["redis"] = {"status": "healthy"}
            await r.close()
        except Exception as e:
            health["components"]["redis"] = {"status": "unhealthy", "error": str(e)}
    else:
        health["components"]["redis"] = {"status": "not_configured"}

    # Check Sentry
    health["components"]["sentry"] = {
        "status": "configured" if app_settings.sentry_dsn else "not_configured"
    }

    # WebSocket connections
    health["websocket_connections"] = len(manager.active_connections)

    return health


@app.get("/metrics")
async def get_metrics():
    """Get performance metrics"""
    from app.core.logging_middleware import performance_metrics

    return {
        "uptime_info": {
            "version": "0.1.0",
            "environment": app_settings.app_env,
        },
        "websocket_connections": len(manager.active_connections),
        "performance": performance_metrics.get_metrics(),
    }


@app.get("/health/ready")
async def readiness_check():
    """Kubernetes-style readiness probe"""
    from app.core.database import async_session
    from sqlalchemy import text

    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "reason": "database_unavailable"}
        )


@app.get("/health/live")
async def liveness_check():
    """Kubernetes-style liveness probe"""
    return {"status": "alive"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
