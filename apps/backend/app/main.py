from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
from typing import List
from datetime import datetime

from app.api.routes import activities, analytics, screenshots, ai_insights, settings, goals, notifications, onboarding, system, reports, auth, billing, teams, updates, rules
from app.core.config import settings as app_settings
from app.core.database import init_db
from app.services.activity_tracker import get_current_activity, check_activitywatch_status
from app.services.classification import classify_activity


class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

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
            print(f"Error in activity broadcaster: {e}")

        # Wait before next update
        await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting Productify Pro Backend...")
    await init_db()
    print("✅ Database initialized")

    # Check ActivityWatch status
    status = await check_activitywatch_status()
    if status.get("available"):
        print(f"✅ ActivityWatch connected at {status.get('url')}")
        print(f"   Buckets: {', '.join(status.get('buckets', []))}")
    else:
        print("⚠️  ActivityWatch not available - using mock data")

    # Start screenshot scheduler
    from app.services.screenshot_service import screenshot_service
    screenshot_service.start_scheduler()
    print(f"📸 Screenshot scheduler started (interval: {screenshot_service.min_interval}-{screenshot_service.max_interval} min)")

    # Start goal sync service
    from app.services.goal_sync_service import goal_sync_service
    goal_syncer_task = asyncio.create_task(goal_sync_service.start())
    print(f"🎯 Goal sync service started (interval: {goal_sync_service.sync_interval}s)")

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

    print("👋 Shutting down Productify Pro Backend...")


app = FastAPI(
    title="Productify Pro API",
    description="AI-powered productivity tracking backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - allow Tauri app and web dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",  # Tauri dev
        "http://localhost:3000",  # Web dashboard dev
        "https://app.productifypro.com",  # Production
        "tauri://localhost",  # Tauri production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


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
    status = await check_activitywatch_status()
    return {
        "status": "healthy",
        "version": "0.1.0",
        "activitywatch": status.get("available", False),
        "websocket_connections": len(manager.active_connections),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
