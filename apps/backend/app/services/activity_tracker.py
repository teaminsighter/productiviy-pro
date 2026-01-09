"""
ActivityWatch Integration Service
Connects to ActivityWatch API to fetch current and historical activity data.
"""

import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import platform as sys_platform

from app.core.config import settings


@dataclass
class CurrentActivity:
    """Represents the current user activity"""
    app_name: str
    window_title: str
    url: Optional[str] = None
    domain: Optional[str] = None
    platform: Optional[str] = None
    start_time: Optional[datetime] = None
    duration: int = 0  # seconds
    is_afk: bool = False


class ActivityWatchClient:
    """Client for communicating with ActivityWatch API"""

    def __init__(self):
        self.base_url = settings.activitywatch_url
        self.timeout = 5.0
        self._is_available: Optional[bool] = None
        self._last_check: Optional[datetime] = None
        self._check_interval = 30  # seconds
        self._buckets_cache: Optional[Dict] = None
        self._buckets_cache_time: Optional[datetime] = None

        # Determine bucket names based on OS
        hostname = sys_platform.node()
        self.window_bucket = f"aw-watcher-window_{hostname}"
        self.afk_bucket = f"aw-watcher-afk_{hostname}"

    async def is_running(self) -> bool:
        """Check if ActivityWatch is running with caching"""
        now = datetime.now()

        # Use cached result if recent
        if (self._last_check and self._is_available is not None and
            (now - self._last_check).total_seconds() < self._check_interval):
            return self._is_available

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(f"{self.base_url}/api/0/info")
                self._is_available = response.status_code == 200
        except Exception:
            self._is_available = False

        self._last_check = now
        return self._is_available

    async def get_buckets(self) -> Dict[str, Any]:
        """Get all available buckets with caching"""
        now = datetime.now()

        # Return cached if fresh
        if (self._buckets_cache and self._buckets_cache_time and
            (now - self._buckets_cache_time).total_seconds() < 60):
            return self._buckets_cache

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(f"{self.base_url}/api/0/buckets/")
                if response.status_code == 200:
                    self._buckets_cache = response.json()
                    self._buckets_cache_time = now
                    return self._buckets_cache
        except Exception:
            pass
        return {}

    async def get_events(
        self,
        bucket_id: str,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get events from a specific bucket"""
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                params = {"limit": limit}
                if start:
                    params["start"] = start.isoformat()
                if end:
                    params["end"] = end.isoformat()

                response = await client.get(
                    f"{self.base_url}/api/0/buckets/{bucket_id}/events",
                    params=params,
                )
                return response.json() if response.status_code == 200 else []
        except Exception:
            return []

    async def get_current_activity(self) -> Optional[CurrentActivity]:
        """Get the currently active window and return structured data"""
        if not await self.is_running():
            return self._get_mock_current_activity()

        try:
            buckets = await self.get_buckets()

            # Find window watcher bucket
            window_bucket = None
            for bucket_id in buckets:
                if "aw-watcher-window" in bucket_id:
                    window_bucket = bucket_id
                    break

            if not window_bucket:
                return self._get_mock_current_activity()

            events = await self.get_events(window_bucket, limit=1)
            if not events:
                return self._get_mock_current_activity()

            event = events[0]
            data = event.get("data", {})

            # Check AFK status
            is_afk = await self._check_afk_status()

            # Try to get browser URL if it's a browser
            url = None
            app_name = data.get("app", "Unknown")
            if any(browser in app_name.lower() for browser in ["chrome", "firefox", "safari", "edge", "brave"]):
                browser_data = await self.get_current_browser_url()
                if browser_data:
                    url = browser_data.get("data", {}).get("url")

            return CurrentActivity(
                app_name=app_name,
                window_title=data.get("title", ""),
                url=url,
                start_time=datetime.fromisoformat(
                    event.get("timestamp", "").replace("Z", "+00:00")
                ) if event.get("timestamp") else datetime.now(),
                duration=int(event.get("duration", 0)),
                is_afk=is_afk,
            )
        except Exception as e:
            print(f"Error getting current activity: {e}")
            return self._get_mock_current_activity()

    async def _check_afk_status(self) -> bool:
        """Check if user is currently AFK"""
        try:
            buckets = await self.get_buckets()
            afk_bucket = None
            for bucket_id in buckets:
                if "aw-watcher-afk" in bucket_id:
                    afk_bucket = bucket_id
                    break

            if afk_bucket:
                events = await self.get_events(afk_bucket, limit=1)
                if events:
                    return events[0].get("data", {}).get("status") == "afk"
        except Exception:
            pass
        return False

    def _get_mock_current_activity(self) -> CurrentActivity:
        """Return mock activity when ActivityWatch is unavailable"""
        return CurrentActivity(
            app_name="VS Code",
            window_title="productify-pro - activity_tracker.py",
            url=None,
            start_time=datetime.now() - timedelta(minutes=15),
            duration=900,
            is_afk=False,
        )

    async def get_current_browser_url(self) -> Optional[Dict[str, Any]]:
        """Get the currently active browser URL"""
        buckets = await self.get_buckets()

        # Find browser watcher buckets
        for bucket_id in buckets:
            if "aw-watcher-web" in bucket_id or "aw-watcher-firefox" in bucket_id:
                events = await self.get_events(bucket_id, limit=1)
                if events:
                    return events[0]

        return None

    async def get_activities(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get activities for a date range, merging window and web data"""
        if not await self.is_running():
            return self._get_mock_activities(start_date, end_date)

        buckets = await self.get_buckets()
        window_events = []
        web_events = []

        # Fetch window events
        for bucket_id in buckets:
            if "aw-watcher-window" in bucket_id:
                events = await self.get_events(
                    bucket_id,
                    start=start_date,
                    end=end_date,
                    limit=1000,
                )
                window_events.extend(events)

        # Fetch web/browser events (URLs)
        for bucket_id in buckets:
            if "aw-watcher-web" in bucket_id:
                events = await self.get_events(
                    bucket_id,
                    start=start_date,
                    end=end_date,
                    limit=1000,
                )
                web_events.extend(events)

        # Index web events by timestamp for quick lookup
        web_by_time = {}
        for we in web_events:
            ts = we.get("timestamp", "")
            if ts:
                # Round to nearest second for matching
                web_by_time[ts[:19]] = we

        # Merge window events with web events
        activities = []
        for e in window_events:
            data = e.get("data", {})
            app_name = data.get("app", "Unknown")
            window_title = data.get("title", "")
            timestamp = e.get("timestamp", "")
            duration = int(e.get("duration", 0))

            url = None
            # For browser apps, try to find matching web event
            if any(browser in app_name.lower() for browser in ["chrome", "firefox", "safari", "edge", "brave"]):
                # Try exact match first, then nearby timestamps
                ts_key = timestamp[:19] if timestamp else ""
                if ts_key in web_by_time:
                    url = web_by_time[ts_key].get("data", {}).get("url")
                else:
                    # Find closest web event within 5 seconds
                    for web_ts, web_data in web_by_time.items():
                        try:
                            t1 = datetime.fromisoformat(ts_key.replace("Z", "+00:00"))
                            t2 = datetime.fromisoformat(web_ts.replace("Z", "+00:00"))
                            if abs((t1 - t2).total_seconds()) < 5:
                                url = web_data.get("data", {}).get("url")
                                break
                        except:
                            pass

            activities.append({
                "app_name": app_name,
                "window_title": window_title,
                "url": url,
                "start_time": timestamp,
                "duration": duration,
            })

        return activities

    async def get_today_activities(self) -> List[Dict[str, Any]]:
        """Get all activities for today"""
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        return await self.get_activities(today_start, today_end)

    def _get_mock_activities(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Return mock activities when ActivityWatch is unavailable"""
        mock_apps = [
            ("VS Code", "productify-pro - Dashboard.tsx", None, 3600),
            ("Chrome", "GitHub - Pull Request Review", "https://github.com/user/repo/pull/42", 1800),
            ("Slack", "Team Chat - #engineering", None, 900),
            ("Chrome", "Stack Overflow - Python async", "https://stackoverflow.com/questions/123", 1200),
            ("Notion", "Sprint Planning Doc", None, 1500),
            ("Chrome", "YouTube - TypeScript Tutorial", "https://youtube.com/watch?v=abc123", 1800),
            ("Terminal", "zsh - npm run dev", None, 600),
            ("Figma", "Dashboard Mockups", None, 2400),
        ]

        activities = []
        current_time = start_date

        for app_name, title, url, duration in mock_apps:
            if current_time >= end_date:
                break

            activities.append({
                "app_name": app_name,
                "window_title": title,
                "url": url,
                "start_time": current_time.isoformat(),
                "duration": duration,
            })
            current_time += timedelta(seconds=duration + 60)

        return activities

    async def get_status(self) -> Dict[str, Any]:
        """Get ActivityWatch status and info"""
        is_running = await self.is_running()
        buckets = list((await self.get_buckets()).keys()) if is_running else []

        return {
            "available": is_running,
            "url": self.base_url,
            "buckets": buckets,
            "window_bucket": self.window_bucket,
            "afk_bucket": self.afk_bucket,
        }


# Singleton instance
activity_watch_client = ActivityWatchClient()


# Convenience functions
async def get_current_activity() -> Optional[CurrentActivity]:
    """Get current activity"""
    return await activity_watch_client.get_current_activity()


async def get_activities(start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """Get activity history"""
    return await activity_watch_client.get_activities(start_date, end_date)


async def check_activitywatch_status() -> Dict[str, Any]:
    """Check ActivityWatch status"""
    return await activity_watch_client.get_status()
