"""
AI Service for Productivity Analysis using OpenAI API

Provides intelligent activity classification, daily insights,
weekly reports, and content analysis.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date
import json
import hashlib
import asyncio
from collections import OrderedDict
from openai import OpenAI, APIError, RateLimitError, APIConnectionError
from app.core.security import get_openai_api_key
from app.core.config import settings


# ============================================================================
# Data Models
# ============================================================================

class ProductivityClassification(BaseModel):
    """Structured output for productivity classification"""
    is_productive: bool
    productivity_score: float = Field(ge=0.0, le=1.0)
    category: str
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)


class DailyInsight(BaseModel):
    """Single daily insight"""
    insight_type: str  # tip, pattern, recommendation, warning, win
    title: str
    description: str
    icon: str = "lightbulb"  # lightbulb, trending_up, warning, check, target


class DailyInsights(BaseModel):
    """Complete daily insights package"""
    date: str
    summary: str
    productivity_score: float
    wins: List[str]
    improvements: List[str]
    tip: str
    focus_score_explanation: str
    insights: List[DailyInsight]
    generated_at: str


class WeeklyReport(BaseModel):
    """Comprehensive weekly report"""
    week_start: str
    week_end: str
    executive_summary: str
    highlights: List[str]
    concerns: List[str]
    recommendations: List[str]
    trends: Dict[str, Any]
    next_week_goals: List[str]
    productivity_trend: str  # up, down, stable
    total_productive_hours: float
    average_daily_score: float
    generated_at: str


class YouTubeClassification(BaseModel):
    """YouTube video classification"""
    category: str  # educational, entertainment, music, news, gaming, tutorial, other
    is_productive: bool
    productivity_score: float = Field(ge=0.0, le=1.0)
    reasoning: str


class QueuedRequest(BaseModel):
    """Queued AI request for offline processing"""
    id: str
    request_type: str
    payload: Dict[str, Any]
    created_at: str
    status: str = "pending"  # pending, processing, completed, failed
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# LRU Cache Implementation
# ============================================================================

class LRUCache:
    """Simple LRU cache for classification results"""

    def __init__(self, max_size: int = 1000):
        self.cache: OrderedDict = OrderedDict()
        self.max_size = max_size

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def set(self, key: str, value: Any):
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
        self.cache[key] = value

    def clear(self):
        self.cache.clear()


# ============================================================================
# AI Service
# ============================================================================

class AIService:
    """
    Comprehensive AI service for productivity analysis.

    Features:
    - Activity classification with caching
    - Daily insights generation
    - Weekly report generation
    - YouTube content classification
    - Offline queue management
    - Graceful error handling
    """

    # Category definitions for context
    CATEGORIES = {
        "development": ["coding", "programming", "debugging", "git", "IDE"],
        "design": ["photoshop", "figma", "sketch", "UI/UX", "graphics"],
        "communication": ["email", "chat", "messaging", "slack", "teams"],
        "entertainment": ["games", "streaming", "videos", "social media"],
        "research": ["documentation", "learning", "reading", "wiki"],
        "productivity": ["notes", "calendar", "planning", "task management"],
        "meeting": ["zoom", "meet", "call", "conference"],
        "writing": ["documents", "word", "notion", "writing"],
        "music": ["spotify", "music", "audio"],
        "video": ["youtube", "video", "streaming"],
        "social_media": ["twitter", "facebook", "instagram", "reddit", "tiktok"],
    }

    def __init__(self):
        self._client: Optional[OpenAI] = None
        self._classification_cache = LRUCache(max_size=1000)
        self._youtube_cache = LRUCache(max_size=500)
        self._offline_queue: List[QueuedRequest] = []
        self._is_online = True
        self._last_api_check = None
        self._rate_limit_until = None

    @property
    def is_configured(self) -> bool:
        """Check if API key is configured"""
        return bool(get_openai_api_key())

    @property
    def is_available(self) -> bool:
        """Check if AI service is available (configured and online)"""
        if not self.is_configured:
            return False
        if self._rate_limit_until and datetime.now() < self._rate_limit_until:
            return False
        return self._is_online

    @property
    def status(self) -> Dict[str, Any]:
        """Get current AI service status"""
        return {
            "configured": self.is_configured,
            "available": self.is_available,
            "online": self._is_online,
            "cache_size": len(self._classification_cache.cache),
            "queue_size": len(self._offline_queue),
            "rate_limited": self._rate_limit_until is not None and datetime.now() < self._rate_limit_until,
        }

    def _get_client(self) -> Optional[OpenAI]:
        """Get or create OpenAI client with current API key"""
        api_key = get_openai_api_key()
        if not api_key:
            return None

        # Recreate client if API key changed
        if self._client is None:
            self._client = OpenAI(api_key=api_key)

        return self._client

    def _get_cache_key(self, *args) -> str:
        """Generate cache key from arguments"""
        key_str = "|".join(str(arg) for arg in args if arg)
        return hashlib.md5(key_str.encode()).hexdigest()

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parse JSON from AI response, handling markdown code blocks"""
        content = content.strip()

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]

        if content.endswith("```"):
            content = content[:-3]

        return json.loads(content.strip())

    def _handle_api_error(self, error: Exception) -> None:
        """Handle API errors appropriately"""
        if isinstance(error, RateLimitError):
            # Back off for rate limits
            from datetime import timedelta
            self._rate_limit_until = datetime.now() + timedelta(minutes=1)
            print(f"Rate limited, backing off until {self._rate_limit_until}")
        elif isinstance(error, APIConnectionError):
            self._is_online = False
            print("API connection error, marking as offline")
        elif isinstance(error, APIError):
            print(f"API error: {error}")

    def _get_model(self, prefer_fast: bool = True) -> str:
        """Get the model to use based on preference and settings"""
        # Check settings for configured model
        try:
            if hasattr(settings, 'openai_model') and settings.openai_model:
                return settings.openai_model
        except Exception:
            pass

        return "gpt-4o-mini" if prefer_fast else "gpt-4o"

    # ========================================================================
    # Activity Classification
    # ========================================================================

    async def classify_activity(
        self,
        app_name: str,
        window_title: str,
        url: Optional[str] = None,
        user_context: Optional[str] = None,
    ) -> Optional[ProductivityClassification]:
        """
        Classify an activity as productive or not using AI.

        Uses caching to avoid redundant API calls for similar activities.
        Falls back to rule-based classification if API fails.

        Args:
            app_name: Name of the application
            window_title: Window/tab title
            url: Optional URL for web activities
            user_context: Optional context about user's work type

        Returns:
            ProductivityClassification or None if classification fails
        """
        # Check cache first
        cache_key = self._get_cache_key(app_name, window_title, url)
        cached = self._classification_cache.get(cache_key)
        if cached:
            return ProductivityClassification(**cached)

        # Try AI classification
        client = self._get_client()
        if not client or not self.is_available:
            return self._fallback_classify(app_name, window_title, url)

        system_prompt = """You are a productivity analyst helping users understand their work patterns.
Classify computer activities accurately and fairly. Consider:
- Development tools, IDEs, terminals are generally productive
- Documentation and learning can be productive
- Social media and entertainment are usually distracting
- Context matters: YouTube tutorials can be productive for developers
- Communication tools depend on context

Be nuanced: a designer using Figma is productive, a developer on Stack Overflow is learning.
Respond with JSON only."""

        user_prompt = f"""Classify this activity for a {user_context or 'knowledge worker'}:

Application: {app_name}
Window Title: {window_title}
URL: {url or 'N/A'}

Respond with JSON:
{{
    "is_productive": boolean,
    "productivity_score": float (0.0-1.0, where 1.0 is very productive),
    "category": "development" | "design" | "communication" | "entertainment" | "social_media" | "research" | "email" | "meeting" | "productivity" | "music" | "video" | "writing" | "other",
    "reasoning": "brief explanation",
    "confidence": float (0.0-1.0)
}}"""

        try:
            response = client.chat.completions.create(
                model=self._get_model(prefer_fast=True),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=200,
            )

            content = response.choices[0].message.content
            data = self._parse_json_response(content)

            # Cache the result
            self._classification_cache.set(cache_key, data)
            self._is_online = True

            return ProductivityClassification(**data)

        except Exception as e:
            self._handle_api_error(e)
            return self._fallback_classify(app_name, window_title, url)

    def _fallback_classify(
        self,
        app_name: str,
        window_title: str,
        url: Optional[str] = None,
    ) -> ProductivityClassification:
        """Rule-based fallback classification when AI is unavailable"""
        app_lower = app_name.lower()
        title_lower = window_title.lower()
        url_lower = (url or "").lower()

        # Productive apps
        productive_apps = [
            "code", "visual studio", "xcode", "intellij", "pycharm", "webstorm",
            "terminal", "iterm", "sublime", "atom", "vim", "nvim", "emacs",
            "figma", "sketch", "photoshop", "illustrator", "affinity",
            "notion", "obsidian", "bear", "notes", "evernote",
            "excel", "sheets", "numbers", "word", "docs", "pages",
            "slack", "teams", "zoom", "meet",
        ]

        # Distracting patterns
        distracting_patterns = [
            "twitter", "x.com", "facebook", "instagram", "tiktok", "reddit",
            "netflix", "hulu", "disney+", "twitch", "youtube.com/watch",
            "games", "steam", "epic games",
        ]

        # Check for productive apps
        for app in productive_apps:
            if app in app_lower or app in title_lower:
                return ProductivityClassification(
                    is_productive=True,
                    productivity_score=0.8,
                    category=self._guess_category(app_lower, title_lower),
                    reasoning="Recognized as productive application",
                    confidence=0.7,
                )

        # Check for distracting patterns
        for pattern in distracting_patterns:
            if pattern in app_lower or pattern in title_lower or pattern in url_lower:
                return ProductivityClassification(
                    is_productive=False,
                    productivity_score=0.2,
                    category="entertainment" if "youtube" not in pattern else "video",
                    reasoning="Recognized as potentially distracting",
                    confidence=0.6,
                )

        # Default: neutral
        return ProductivityClassification(
            is_productive=True,
            productivity_score=0.5,
            category="other",
            reasoning="Unable to classify, marked as neutral",
            confidence=0.3,
        )

    def _guess_category(self, app_lower: str, title_lower: str) -> str:
        """Guess category based on app/title keywords"""
        for category, keywords in self.CATEGORIES.items():
            for keyword in keywords:
                if keyword.lower() in app_lower or keyword.lower() in title_lower:
                    return category
        return "other"

    # ========================================================================
    # Daily Insights
    # ========================================================================

    async def generate_daily_insights(
        self,
        activities: List[Dict[str, Any]],
        date_str: str,
        user_context: Optional[str] = None,
    ) -> Optional[DailyInsights]:
        """
        Generate comprehensive AI insights for a day's activities.

        Args:
            activities: List of activity records for the day
            date_str: Date string (YYYY-MM-DD)
            user_context: Optional context about user's work type

        Returns:
            DailyInsights or None if generation fails
        """
        client = self._get_client()
        if not client or not self.is_available:
            return self._fallback_daily_insights(activities, date_str)

        # Prepare activity summary
        summary = self._summarize_activities(activities)

        system_prompt = """You are a supportive productivity coach analyzing a user's daily activity.
Your insights should be:
- Encouraging and constructive, not judgmental
- Specific and actionable
- Based on actual patterns in the data
- Helpful for improving focus and productivity

Never be creepy or invasive about personal activities.
Focus on work patterns and constructive suggestions.
Respond with JSON only."""

        user_prompt = f"""Analyze this day's activity for a {user_context or 'knowledge worker'}:

Date: {date_str}
Total tracked time: {summary['total_hours']:.1f} hours
Productive time: {summary['productive_hours']:.1f} hours
Productivity score: {summary['productivity_score']:.0f}%

Top applications (by time):
{self._format_top_items(summary['top_apps'])}

Peak productivity hours: {summary['peak_hours']}
Most distracting activities:
{self._format_top_items(summary['top_distractions'])}

Activity by hour:
{summary['hourly_breakdown']}

Generate insights as JSON:
{{
    "summary": "One sentence summary of the day",
    "productivity_score": float (0-100),
    "wins": ["win 1", "win 2", "win 3"],
    "improvements": ["improvement 1", "improvement 2"],
    "tip": "One actionable tip for tomorrow",
    "focus_score_explanation": "Brief explanation of the productivity score",
    "insights": [
        {{
            "insight_type": "tip" | "pattern" | "recommendation" | "warning" | "win",
            "title": "Short title",
            "description": "Detailed description",
            "icon": "lightbulb" | "trending_up" | "warning" | "check" | "target"
        }}
    ]
}}"""

        try:
            response = client.chat.completions.create(
                model=self._get_model(prefer_fast=False),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000,
            )

            content = response.choices[0].message.content
            data = self._parse_json_response(content)

            self._is_online = True

            return DailyInsights(
                date=date_str,
                summary=data.get("summary", ""),
                productivity_score=data.get("productivity_score", summary['productivity_score']),
                wins=data.get("wins", []),
                improvements=data.get("improvements", []),
                tip=data.get("tip", ""),
                focus_score_explanation=data.get("focus_score_explanation", ""),
                insights=[DailyInsight(**i) for i in data.get("insights", [])],
                generated_at=datetime.now().isoformat(),
            )

        except Exception as e:
            self._handle_api_error(e)
            return self._fallback_daily_insights(activities, date_str)

    def _summarize_activities(self, activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize activities for AI prompt"""
        total_seconds = sum(a.get("duration", 0) for a in activities)
        productive_seconds = sum(
            a.get("duration", 0) for a in activities
            if a.get("is_productive", False) or a.get("productivity_score", 0) > 0.5
        )

        # Group by app
        app_times: Dict[str, int] = {}
        distractions: Dict[str, int] = {}
        hourly: Dict[int, int] = {h: 0 for h in range(24)}

        for a in activities:
            app = a.get("app_name", "Unknown")
            duration = a.get("duration", 0)
            app_times[app] = app_times.get(app, 0) + duration

            if not a.get("is_productive", True) and a.get("productivity_score", 1) < 0.4:
                distractions[app] = distractions.get(app, 0) + duration

            # Hourly breakdown
            if "timestamp" in a:
                try:
                    hour = datetime.fromisoformat(a["timestamp"]).hour
                    hourly[hour] += duration
                except Exception:
                    pass

        # Find peak hours
        sorted_hours = sorted(hourly.items(), key=lambda x: x[1], reverse=True)
        peak_hours = [h for h, _ in sorted_hours[:3] if hourly[h] > 0]

        return {
            "total_hours": total_seconds / 3600,
            "productive_hours": productive_seconds / 3600,
            "productivity_score": (productive_seconds / total_seconds * 100) if total_seconds > 0 else 0,
            "top_apps": sorted(app_times.items(), key=lambda x: x[1], reverse=True)[:5],
            "top_distractions": sorted(distractions.items(), key=lambda x: x[1], reverse=True)[:3],
            "peak_hours": f"{peak_hours[0]}:00 - {peak_hours[0]+1}:00" if peak_hours else "Unknown",
            "hourly_breakdown": self._format_hourly(hourly),
        }

    def _format_top_items(self, items: List[tuple]) -> str:
        """Format top items for prompt"""
        if not items:
            return "None recorded"
        return "\n".join(f"- {name}: {dur/60:.0f} min" for name, dur in items)

    def _format_hourly(self, hourly: Dict[int, int]) -> str:
        """Format hourly breakdown for prompt"""
        active_hours = [(h, s) for h, s in hourly.items() if s > 0]
        if not active_hours:
            return "No activity recorded"
        return ", ".join(f"{h}:00 ({s/60:.0f}m)" for h, s in sorted(active_hours))

    def _fallback_daily_insights(
        self,
        activities: List[Dict[str, Any]],
        date_str: str,
    ) -> DailyInsights:
        """Generate basic insights without AI"""
        summary = self._summarize_activities(activities)

        wins = []
        improvements = []

        if summary["productivity_score"] > 70:
            wins.append("Great productivity score today!")
        if summary["productive_hours"] > 4:
            wins.append(f"Logged {summary['productive_hours']:.1f} productive hours")

        if summary["top_distractions"]:
            top_distraction = summary["top_distractions"][0][0]
            improvements.append(f"Consider reducing time on {top_distraction}")

        return DailyInsights(
            date=date_str,
            summary=f"You tracked {summary['total_hours']:.1f} hours with {summary['productivity_score']:.0f}% productivity.",
            productivity_score=summary["productivity_score"],
            wins=wins or ["Keep tracking to see your wins!"],
            improvements=improvements or ["Keep tracking to get improvement suggestions"],
            tip="Try the Pomodoro technique: 25 minutes focused work, 5 minute break.",
            focus_score_explanation="Score based on time spent in productive vs distracting applications.",
            insights=[
                DailyInsight(
                    insight_type="tip",
                    title="AI Insights Unavailable",
                    description="Configure your OpenAI API key in Settings to get personalized AI insights.",
                    icon="lightbulb",
                )
            ],
            generated_at=datetime.now().isoformat(),
        )

    # ========================================================================
    # Weekly Report
    # ========================================================================

    async def generate_weekly_report(
        self,
        weekly_data: Dict[str, Any],
    ) -> Optional[WeeklyReport]:
        """
        Generate a comprehensive weekly productivity report.

        Args:
            weekly_data: Dictionary containing weekly statistics

        Returns:
            WeeklyReport or None if generation fails
        """
        client = self._get_client()
        if not client or not self.is_available:
            return self._fallback_weekly_report(weekly_data)

        system_prompt = """You are a productivity coach writing a weekly summary report.
Your report should be:
- Encouraging and motivating
- Data-driven with specific observations
- Include actionable recommendations
- Celebrate wins while acknowledging areas for improvement
- Set realistic goals for the next week

Be supportive, not judgmental. Focus on progress and growth.
Respond with JSON only."""

        user_prompt = f"""Generate a weekly productivity report:

Week: {weekly_data.get('week_start', 'Unknown')} to {weekly_data.get('week_end', 'Unknown')}
Total hours tracked: {weekly_data.get('total_hours', 0):.1f}
Average daily productivity: {weekly_data.get('avg_productivity', 0):.0f}%

Daily breakdown:
{self._format_daily_breakdown(weekly_data.get('daily_stats', []))}

Best performing day: {weekly_data.get('best_day', 'Unknown')}
Most challenging day: {weekly_data.get('worst_day', 'Unknown')}

Top productive applications:
{self._format_top_items(weekly_data.get('top_productive_apps', []))}

Top distractions:
{self._format_top_items(weekly_data.get('top_distractions', []))}

Comparison to previous week:
- Hours: {weekly_data.get('hours_change', 0):+.1f}
- Productivity: {weekly_data.get('productivity_change', 0):+.0f}%

Generate report as JSON:
{{
    "executive_summary": "2-3 sentence overview of the week",
    "highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "concerns": ["concern 1", "concern 2"],
    "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
    "trends": {{
        "productivity": "up" | "down" | "stable",
        "focus_time": "up" | "down" | "stable",
        "distractions": "up" | "down" | "stable"
    }},
    "next_week_goals": ["goal 1", "goal 2", "goal 3"],
    "productivity_trend": "up" | "down" | "stable"
}}"""

        try:
            response = client.chat.completions.create(
                model=self._get_model(prefer_fast=False),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1200,
            )

            content = response.choices[0].message.content
            data = self._parse_json_response(content)

            self._is_online = True

            return WeeklyReport(
                week_start=weekly_data.get("week_start", ""),
                week_end=weekly_data.get("week_end", ""),
                executive_summary=data.get("executive_summary", ""),
                highlights=data.get("highlights", []),
                concerns=data.get("concerns", []),
                recommendations=data.get("recommendations", []),
                trends=data.get("trends", {}),
                next_week_goals=data.get("next_week_goals", []),
                productivity_trend=data.get("productivity_trend", "stable"),
                total_productive_hours=weekly_data.get("productive_hours", 0),
                average_daily_score=weekly_data.get("avg_productivity", 0),
                generated_at=datetime.now().isoformat(),
            )

        except Exception as e:
            self._handle_api_error(e)
            return self._fallback_weekly_report(weekly_data)

    def _format_daily_breakdown(self, daily_stats: List[Dict]) -> str:
        """Format daily stats for prompt"""
        if not daily_stats:
            return "No daily data available"
        return "\n".join(
            f"- {d.get('day', 'Unknown')}: {d.get('hours', 0):.1f}h, {d.get('productivity', 0):.0f}% productive"
            for d in daily_stats
        )

    def _fallback_weekly_report(self, weekly_data: Dict[str, Any]) -> WeeklyReport:
        """Generate basic weekly report without AI"""
        return WeeklyReport(
            week_start=weekly_data.get("week_start", ""),
            week_end=weekly_data.get("week_end", ""),
            executive_summary=f"You tracked {weekly_data.get('total_hours', 0):.1f} hours this week with an average productivity of {weekly_data.get('avg_productivity', 0):.0f}%.",
            highlights=["Completed another week of tracking!", f"Best day: {weekly_data.get('best_day', 'Unknown')}"],
            concerns=["Configure AI for personalized insights"],
            recommendations=["Set up OpenAI API key for AI-powered analysis"],
            trends={"productivity": "stable", "focus_time": "stable", "distractions": "stable"},
            next_week_goals=["Continue tracking", "Review daily insights"],
            productivity_trend="stable",
            total_productive_hours=weekly_data.get("productive_hours", 0),
            average_daily_score=weekly_data.get("avg_productivity", 0),
            generated_at=datetime.now().isoformat(),
        )

    # ========================================================================
    # YouTube Classification
    # ========================================================================

    async def classify_youtube_video(
        self,
        video_title: str,
        channel_name: str,
        user_context: Optional[str] = None,
    ) -> Optional[YouTubeClassification]:
        """
        Classify a YouTube video for productivity relevance.

        Args:
            video_title: Title of the video
            channel_name: Name of the YouTube channel
            user_context: Optional context about user's work

        Returns:
            YouTubeClassification or None if classification fails
        """
        # Check cache
        cache_key = self._get_cache_key("youtube", video_title, channel_name)
        cached = self._youtube_cache.get(cache_key)
        if cached:
            return YouTubeClassification(**cached)

        client = self._get_client()
        if not client or not self.is_available:
            return self._fallback_youtube_classify(video_title, channel_name)

        system_prompt = """You are a content classifier specializing in YouTube videos.
Classify videos based on their educational/entertainment value.
Consider that tutorials and educational content can be productive.
Music might be productive for focus. Gaming and entertainment are typically not.
Respond with JSON only."""

        user_prompt = f"""Classify this YouTube video for a {user_context or 'knowledge worker'}:

Video Title: {video_title}
Channel: {channel_name}

Respond with JSON:
{{
    "category": "educational" | "entertainment" | "music" | "news" | "gaming" | "tutorial" | "other",
    "is_productive": boolean,
    "productivity_score": float (0.0-1.0),
    "reasoning": "brief explanation"
}}"""

        try:
            response = client.chat.completions.create(
                model=self._get_model(prefer_fast=True),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=200,
            )

            content = response.choices[0].message.content
            data = self._parse_json_response(content)

            # Cache the result
            self._youtube_cache.set(cache_key, data)
            self._is_online = True

            return YouTubeClassification(**data)

        except Exception as e:
            self._handle_api_error(e)
            return self._fallback_youtube_classify(video_title, channel_name)

    def _fallback_youtube_classify(
        self,
        video_title: str,
        channel_name: str,
    ) -> YouTubeClassification:
        """Rule-based YouTube classification"""
        title_lower = video_title.lower()
        channel_lower = channel_name.lower()

        # Educational patterns
        educational_keywords = ["tutorial", "how to", "learn", "course", "guide", "explained", "documentation"]
        music_keywords = ["music", "lofi", "lo-fi", "beats", "ambient", "focus", "study music"]
        entertainment_keywords = ["funny", "vlog", "reaction", "gameplay", "let's play", "meme"]

        for keyword in educational_keywords:
            if keyword in title_lower or keyword in channel_lower:
                return YouTubeClassification(
                    category="tutorial",
                    is_productive=True,
                    productivity_score=0.7,
                    reasoning="Detected educational content keywords",
                )

        for keyword in music_keywords:
            if keyword in title_lower or keyword in channel_lower:
                return YouTubeClassification(
                    category="music",
                    is_productive=True,
                    productivity_score=0.6,
                    reasoning="Background music can aid focus",
                )

        for keyword in entertainment_keywords:
            if keyword in title_lower or keyword in channel_lower:
                return YouTubeClassification(
                    category="entertainment",
                    is_productive=False,
                    productivity_score=0.2,
                    reasoning="Detected entertainment content",
                )

        return YouTubeClassification(
            category="other",
            is_productive=False,
            productivity_score=0.3,
            reasoning="Unable to classify, defaulting to entertainment",
        )

    # ========================================================================
    # Offline Queue Management
    # ========================================================================

    def queue_request(
        self,
        request_type: str,
        payload: Dict[str, Any],
    ) -> str:
        """Add a request to the offline queue"""
        request_id = hashlib.md5(
            f"{request_type}:{json.dumps(payload)}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]

        queued = QueuedRequest(
            id=request_id,
            request_type=request_type,
            payload=payload,
            created_at=datetime.now().isoformat(),
        )

        self._offline_queue.append(queued)
        return request_id

    async def process_queue(self) -> Dict[str, Any]:
        """Process all pending requests in the offline queue"""
        if not self.is_available:
            return {
                "processed": 0,
                "failed": 0,
                "remaining": len(self._offline_queue),
                "error": "AI service not available",
            }

        processed = 0
        failed = 0

        for request in self._offline_queue[:]:  # Copy to allow modification
            try:
                request.status = "processing"

                if request.request_type == "classify":
                    result = await self.classify_activity(**request.payload)
                    request.result = result.model_dump() if result else None
                elif request.request_type == "daily_insights":
                    result = await self.generate_daily_insights(**request.payload)
                    request.result = result.model_dump() if result else None
                elif request.request_type == "youtube":
                    result = await self.classify_youtube_video(**request.payload)
                    request.result = result.model_dump() if result else None

                request.status = "completed"
                self._offline_queue.remove(request)
                processed += 1

            except Exception as e:
                request.status = "failed"
                request.error = str(e)
                failed += 1

        return {
            "processed": processed,
            "failed": failed,
            "remaining": len(self._offline_queue),
        }

    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        return {
            "total": len(self._offline_queue),
            "pending": len([r for r in self._offline_queue if r.status == "pending"]),
            "processing": len([r for r in self._offline_queue if r.status == "processing"]),
            "failed": len([r for r in self._offline_queue if r.status == "failed"]),
            "requests": [r.model_dump() for r in self._offline_queue[:10]],  # First 10
        }

    def clear_queue(self) -> int:
        """Clear the offline queue and return count of cleared items"""
        count = len(self._offline_queue)
        self._offline_queue.clear()
        return count

    def clear_cache(self) -> Dict[str, int]:
        """Clear all caches"""
        classification_count = len(self._classification_cache.cache)
        youtube_count = len(self._youtube_cache.cache)

        self._classification_cache.clear()
        self._youtube_cache.clear()

        return {
            "classification_cache": classification_count,
            "youtube_cache": youtube_count,
        }


# Singleton instance
ai_service = AIService()
