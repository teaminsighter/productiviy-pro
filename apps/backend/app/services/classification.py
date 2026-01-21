"""
Productivity Classification Service
Classifies activities based on rules and custom lists.
Now integrates with user-defined PlatformRule and URLRule from database.
"""

from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from urllib.parse import urlparse

from app.services.url_analyzer import url_analyzer
from app.models.settings import CustomList
from app.models.rules import PlatformRule, URLRule, DEFAULT_PLATFORM_RULES


@dataclass
class ClassificationResult:
    """Result of classifying an activity"""
    productivity_score: float  # 0.0 (distracting) to 1.0 (productive)
    productivity_type: str  # "productive", "neutral", "distracting"
    category: str  # "development", "communication", etc.
    reason: str  # Why this classification was made
    source: str  # "custom_list", "rule", "default"


class ProductivityClassifier:
    """
    Classifies activities by productivity using:
    1. Custom user-defined lists (highest priority)
    2. Built-in rules for common apps/sites
    3. Default neutral classification
    """

    # Known productive apps
    PRODUCTIVE_APPS = {
        "VS Code": ("development", 0.95),
        "Visual Studio Code": ("development", 0.95),
        "Code": ("development", 0.95),
        "Visual Studio": ("development", 0.90),
        "PyCharm": ("development", 0.95),
        "IntelliJ IDEA": ("development", 0.95),
        "IntelliJ": ("development", 0.95),
        "WebStorm": ("development", 0.95),
        "Xcode": ("development", 0.95),
        "Android Studio": ("development", 0.95),
        "Sublime Text": ("development", 0.90),
        "Sublime": ("development", 0.90),
        "Atom": ("development", 0.85),
        "Vim": ("development", 0.90),
        "Neovim": ("development", 0.90),
        "nvim": ("development", 0.90),
        "Emacs": ("development", 0.90),
        "Terminal": ("development", 0.85),
        "iTerm2": ("development", 0.85),
        "iTerm": ("development", 0.85),
        "Hyper": ("development", 0.85),
        "Warp": ("development", 0.85),
        "Alacritty": ("development", 0.85),
        "kitty": ("development", 0.85),
        "Postman": ("development", 0.85),
        "Insomnia": ("development", 0.85),
        "TablePlus": ("development", 0.80),
        "DBeaver": ("development", 0.80),
        "Sequel Pro": ("development", 0.80),
        "DataGrip": ("development", 0.80),
        "Cursor": ("development", 0.95),
        "Zed": ("development", 0.90),
        "Fleet": ("development", 0.90),
        "productify-pro": ("productivity", 0.80),
        "Productify Pro": ("productivity", 0.80),
        "Figma": ("design", 0.85),
        "Sketch": ("design", 0.85),
        "Adobe XD": ("design", 0.85),
        "Adobe Photoshop": ("design", 0.80),
        "Photoshop": ("design", 0.80),
        "Adobe Illustrator": ("design", 0.80),
        "Illustrator": ("design", 0.80),
        "Adobe Premiere": ("design", 0.75),
        "Premiere Pro": ("design", 0.75),
        "Final Cut Pro": ("design", 0.75),
        "DaVinci Resolve": ("design", 0.75),
        "Notion": ("productivity", 0.80),
        "Obsidian": ("productivity", 0.85),
        "Bear": ("productivity", 0.80),
        "Microsoft Word": ("productivity", 0.75),
        "Word": ("productivity", 0.75),
        "Microsoft Excel": ("productivity", 0.80),
        "Excel": ("productivity", 0.80),
        "Microsoft PowerPoint": ("productivity", 0.70),
        "PowerPoint": ("productivity", 0.70),
        "Google Docs": ("productivity", 0.75),
        "Google Sheets": ("productivity", 0.80),
        "Linear": ("project_management", 0.85),
        "Jira": ("project_management", 0.80),
        "Asana": ("project_management", 0.75),
        "Trello": ("project_management", 0.70),
        "ClickUp": ("project_management", 0.75),
        "Monday": ("project_management", 0.70),
        "Basecamp": ("project_management", 0.70),
        "Notes": ("productivity", 0.65),
        "Apple Notes": ("productivity", 0.65),
        "Reminders": ("productivity", 0.60),
    }

    # System apps to exclude from tracking (idle, lock screen, etc.)
    EXCLUDED_APPS = {
        "loginwindow": ("system", 0.0),
        "ScreenSaverEngine": ("system", 0.0),
        "LockScreen": ("system", 0.0),
        "SecurityAgent": ("system", 0.0),
        "UserNotificationCenter": ("system", 0.0),
        "Notification Center": ("system", 0.0),
        "SystemUIServer": ("system", 0.0),
    }

    # Neutral apps (communication, browsers, etc.)
    NEUTRAL_APPS = {
        # Communication
        "Slack": ("communication", 0.50),
        "Discord": ("communication", 0.40),
        "Microsoft Teams": ("communication", 0.55),
        "Teams": ("communication", 0.55),
        "Zoom": ("meeting", 0.55),
        "zoom.us": ("meeting", 0.55),
        "Google Meet": ("meeting", 0.55),
        "Skype": ("communication", 0.45),
        "Mail": ("email", 0.55),
        "Apple Mail": ("email", 0.55),
        "Outlook": ("email", 0.55),
        "Thunderbird": ("email", 0.55),
        "Spark": ("email", 0.55),
        "Calendar": ("productivity", 0.60),
        "Apple Calendar": ("productivity", 0.60),
        "Messages": ("communication", 0.35),
        "WhatsApp": ("communication", 0.30),
        "Telegram": ("communication", 0.35),
        "Signal": ("communication", 0.35),
        # Browsers (neutral - depends on what you're doing)
        "Google Chrome": ("browsing", 0.50),
        "Chrome": ("browsing", 0.50),
        "Safari": ("browsing", 0.50),
        "Firefox": ("browsing", 0.50),
        "Mozilla Firefox": ("browsing", 0.50),
        "Microsoft Edge": ("browsing", 0.50),
        "Edge": ("browsing", 0.50),
        "Brave": ("browsing", 0.50),
        "Brave Browser": ("browsing", 0.50),
        "Arc": ("browsing", 0.50),
        "Opera": ("browsing", 0.50),
        "Vivaldi": ("browsing", 0.50),
        "Chromium": ("browsing", 0.50),
        # Electron apps (often development related - VS Code, Cursor, etc.)
        "Electron": ("development", 0.75),
        # System apps
        "Finder": ("system", 0.50),
        "File Explorer": ("system", 0.50),
        "Explorer": ("system", 0.50),
        "System Preferences": ("system", 0.50),
        "System Settings": ("system", 0.50),
        "Settings": ("system", 0.50),
        "Preview": ("system", 0.50),
        "Activity Monitor": ("system", 0.50),
        "Task Manager": ("system", 0.50),
        # Music apps
        "Spotify": ("music", 0.50),
        "Apple Music": ("music", 0.50),
        "Music": ("music", 0.50),
        "iTunes": ("music", 0.50),
        "Deezer": ("music", 0.50),
        "Amazon Music": ("music", 0.50),
        "YouTube Music": ("music", 0.45),
    }

    # Distracting apps
    DISTRACTING_APPS = {
        "Twitter": ("social_media", 0.15),
        "Facebook": ("social_media", 0.15),
        "Instagram": ("social_media", 0.10),
        "TikTok": ("social_media", 0.10),
        "Reddit": ("social_media", 0.20),
        "Netflix": ("entertainment", 0.10),
        "YouTube": ("video", 0.35),  # Can be educational
        "Twitch": ("entertainment", 0.15),
        "Steam": ("gaming", 0.10),
        "Epic Games": ("gaming", 0.10),
    }

    # Productive domains
    PRODUCTIVE_DOMAINS = {
        "github.com": ("development", 0.90),
        "gitlab.com": ("development", 0.90),
        "bitbucket.org": ("development", 0.85),
        "stackoverflow.com": ("development", 0.85),
        "stackexchange.com": ("development", 0.80),
        "docs.python.org": ("documentation", 0.90),
        "developer.mozilla.org": ("documentation", 0.90),
        "react.dev": ("documentation", 0.90),
        "nodejs.org": ("documentation", 0.85),
        "npmjs.com": ("development", 0.80),
        "pypi.org": ("development", 0.80),
        "crates.io": ("development", 0.80),
        "medium.com": ("learning", 0.65),
        "dev.to": ("learning", 0.75),
        "hashnode.com": ("learning", 0.75),
        "udemy.com": ("learning", 0.80),
        "coursera.org": ("learning", 0.85),
        "pluralsight.com": ("learning", 0.85),
        "egghead.io": ("learning", 0.85),
        "frontendmasters.com": ("learning", 0.85),
        "notion.so": ("productivity", 0.80),
        "linear.app": ("project_management", 0.85),
        "figma.com": ("design", 0.85),
        "canva.com": ("design", 0.70),
        "vercel.com": ("development", 0.80),
        "netlify.com": ("development", 0.80),
        "aws.amazon.com": ("development", 0.80),
        "cloud.google.com": ("development", 0.80),
        "azure.microsoft.com": ("development", 0.80),
    }

    # Distracting domains
    DISTRACTING_DOMAINS = {
        "twitter.com": ("social_media", 0.15),
        "x.com": ("social_media", 0.15),
        "facebook.com": ("social_media", 0.15),
        "instagram.com": ("social_media", 0.10),
        "tiktok.com": ("social_media", 0.10),
        "reddit.com": ("social_media", 0.20),
        "netflix.com": ("entertainment", 0.10),
        "hulu.com": ("entertainment", 0.10),
        "disneyplus.com": ("entertainment", 0.10),
        "primevideo.com": ("entertainment", 0.10),
        "twitch.tv": ("entertainment", 0.15),
        "9gag.com": ("entertainment", 0.05),
        "buzzfeed.com": ("entertainment", 0.15),
        "news.ycombinator.com": ("news", 0.40),  # Can be work-related
    }

    def __init__(self):
        self._custom_lists_cache: Dict[str, List[str]] = {}
        self._platform_rules_cache: Dict[str, Dict[str, Any]] = {}
        self._url_rules_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_loaded = False
        self._user_id = 1  # Default user

    async def load_custom_lists(self, db: AsyncSession, user_id: int = 1) -> None:
        """Load custom lists from database"""
        try:
            result = await db.execute(select(CustomList))
            lists = result.scalars().all()

            self._custom_lists_cache = {
                "productive": [],
                "distracting": [],
                "neutral": [],
                "excluded": [],
            }

            for item in lists:
                if item.list_type in self._custom_lists_cache:
                    self._custom_lists_cache[item.list_type].append(item.pattern.lower())

            self._cache_loaded = True
        except Exception as e:
            print(f"Error loading custom lists: {e}")

    async def load_user_rules(self, db: AsyncSession, user_id: int = 1) -> None:
        """Load user-defined platform and URL rules from database"""
        try:
            self._user_id = user_id

            # Load platform rules
            platform_result = await db.execute(
                select(PlatformRule).where(PlatformRule.user_id == user_id)
            )
            platform_rules = platform_result.scalars().all()

            self._platform_rules_cache = {}
            for rule in platform_rules:
                self._platform_rules_cache[rule.domain.lower()] = {
                    "productivity": rule.productivity,
                    "category": rule.category,
                    "is_custom": rule.is_custom
                }

            # Load URL rules
            url_result = await db.execute(
                select(URLRule).where(URLRule.user_id == user_id)
            )
            url_rules = url_result.scalars().all()

            self._url_rules_cache = {}
            for rule in url_rules:
                self._url_rules_cache[rule.url_pattern.lower()] = {
                    "productivity": rule.productivity,
                    "category": rule.category,
                    "override_platform": rule.override_platform
                }

            print(f"Loaded {len(self._platform_rules_cache)} platform rules and {len(self._url_rules_cache)} URL rules for user {user_id}")
        except Exception as e:
            print(f"Error loading user rules: {e}")

    def _extract_domain(self, url_or_title: str) -> Optional[str]:
        """Extract domain from URL or window title"""
        if not url_or_title:
            return None

        # Try to parse as URL
        if url_or_title.startswith(('http://', 'https://')):
            try:
                parsed = urlparse(url_or_title)
                return parsed.netloc.lower().replace('www.', '')
            except:
                pass

        # Try to extract domain from title (common format: "Page Title - domain.com")
        parts = url_or_title.split(' - ')
        for part in reversed(parts):
            part = part.strip().lower()
            if '.' in part and ' ' not in part:
                return part.replace('www.', '')

        return None

    def _check_user_platform_rule(self, domain: str) -> Optional[ClassificationResult]:
        """Check if there's a user-defined platform rule for this domain"""
        domain_lower = domain.lower()

        # Check user custom rules first
        if domain_lower in self._platform_rules_cache:
            rule = self._platform_rules_cache[domain_lower]
            productivity_type = rule["productivity"]
            score = self._type_to_score(productivity_type)
            return ClassificationResult(
                productivity_score=score,
                productivity_type=productivity_type,
                category=rule["category"] or "custom",
                reason=f"Custom rule for '{domain}'",
                source="user_rule"
            )

        # Check default platform rules
        if domain_lower in DEFAULT_PLATFORM_RULES:
            default = DEFAULT_PLATFORM_RULES[domain_lower]
            productivity_type = default["productivity"]
            score = self._type_to_score(productivity_type)
            return ClassificationResult(
                productivity_score=score,
                productivity_type=productivity_type,
                category=default["category"],
                reason=f"Default rule for '{domain}'",
                source="default_rule"
            )

        return None

    def _check_user_url_rule(self, url: str) -> Optional[ClassificationResult]:
        """Check if there's a user-defined URL rule matching this URL"""
        url_lower = url.lower()

        for pattern, rule in self._url_rules_cache.items():
            # Simple pattern matching (supports * wildcard)
            if '*' in pattern:
                prefix = pattern.split('*')[0]
                if prefix in url_lower:
                    productivity_type = rule["productivity"]
                    score = self._type_to_score(productivity_type)
                    return ClassificationResult(
                        productivity_score=score,
                        productivity_type=productivity_type,
                        category=rule["category"] or "custom",
                        reason=f"URL rule match: '{pattern}'",
                        source="user_rule"
                    )
            elif pattern in url_lower:
                productivity_type = rule["productivity"]
                score = self._type_to_score(productivity_type)
                return ClassificationResult(
                    productivity_score=score,
                    productivity_type=productivity_type,
                    category=rule["category"] or "custom",
                    reason=f"URL rule match: '{pattern}'",
                    source="user_rule"
                )

        return None

    def _type_to_score(self, productivity_type: str) -> float:
        """Convert productivity type to score"""
        if productivity_type == "productive":
            return 0.9
        elif productivity_type == "distracting":
            return 0.15
        else:
            return 0.5

    def classify(
        self,
        app_name: str,
        window_title: str = "",
        url: Optional[str] = None,
        custom_lists: Optional[Dict[str, List[str]]] = None
    ) -> ClassificationResult:
        """
        Classify an activity by productivity.

        Priority order:
        1. User-defined URL rules (highest)
        2. User-defined platform rules
        3. Custom lists (productive/distracting patterns)
        4. Default platform rules
        5. Built-in app/domain rules
        6. Window title analysis
        7. Default neutral

        Args:
            app_name: Name of the application
            window_title: Window title
            url: Optional URL for browser activities
            custom_lists: Optional custom classification lists

        Returns:
            ClassificationResult with score, type, category, and reason
        """
        lists = custom_lists or self._custom_lists_cache

        # 1. Check user URL rules first (highest priority - overrides platform rules)
        if url:
            url_rule_result = self._check_user_url_rule(url)
            if url_rule_result:
                return url_rule_result

        # 2. Extract domain and check user platform rules
        domain = None
        if url:
            domain = self._extract_domain(url)
        elif window_title:
            domain = self._extract_domain(window_title)

        if domain:
            platform_rule_result = self._check_user_platform_rule(domain)
            if platform_rule_result:
                return platform_rule_result

        # 3. Check if app is in excluded list
        if self._matches_list(app_name, lists.get("excluded", [])):
            return ClassificationResult(
                productivity_score=0.5,
                productivity_type="neutral",
                category="excluded",
                reason=f"'{app_name}' is in the excluded list",
                source="custom_list"
            )

        # 4. Check custom productive list
        if self._matches_list(app_name, lists.get("productive", [])):
            return ClassificationResult(
                productivity_score=0.9,
                productivity_type="productive",
                category="custom_productive",
                reason=f"'{app_name}' is in your productive list",
                source="custom_list"
            )

        # 5. Check custom distracting list
        if self._matches_list(app_name, lists.get("distracting", [])):
            return ClassificationResult(
                productivity_score=0.1,
                productivity_type="distracting",
                category="custom_distracting",
                reason=f"'{app_name}' is in your distracting list",
                source="custom_list"
            )

        # 6. Check URL-based classification for browsers (built-in rules)
        if url:
            url_result = self._classify_url(url, lists)
            if url_result:
                return url_result

        # 7. Check built-in app rules
        app_result = self._classify_app(app_name)
        if app_result:
            return app_result

        # 8. Check window title for hints
        title_result = self._classify_by_title(window_title)
        if title_result:
            return title_result

        # 9. Smart category detection based on app name patterns
        category = self._detect_category_from_name(app_name)

        return ClassificationResult(
            productivity_score=0.5,
            productivity_type="neutral",
            category=category,
            reason=f"Categorized '{app_name}' as {category}",
            source="default"
        )

    def _detect_category_from_name(self, name: str) -> str:
        """Detect category from app/domain name using patterns"""
        name_lower = name.lower()

        # Development patterns
        dev_patterns = ['code', 'studio', 'ide', 'terminal', 'console', 'git',
                       'docker', 'node', 'python', 'npm', 'yarn', 'pnpm',
                       'debug', 'compiler', 'build', 'dev']
        if any(p in name_lower for p in dev_patterns):
            return "development"

        # Design patterns
        design_patterns = ['design', 'figma', 'sketch', 'adobe', 'photo',
                          'illustrat', 'draw', 'canvas', 'art']
        if any(p in name_lower for p in design_patterns):
            return "design"

        # Communication patterns
        comm_patterns = ['mail', 'email', 'message', 'chat', 'slack', 'team',
                        'meet', 'zoom', 'call', 'video']
        if any(p in name_lower for p in comm_patterns):
            return "communication"

        # Browser patterns
        browser_patterns = ['chrome', 'firefox', 'safari', 'edge', 'browser',
                           'brave', 'opera', 'vivaldi', 'arc']
        if any(p in name_lower for p in browser_patterns):
            return "browsing"

        # Productivity patterns
        prod_patterns = ['note', 'doc', 'sheet', 'office', 'word', 'excel',
                        'notion', 'obsidian', 'calendar', 'todo', 'task']
        if any(p in name_lower for p in prod_patterns):
            return "productivity"

        # Music/media patterns
        media_patterns = ['music', 'spotify', 'audio', 'sound', 'podcast']
        if any(p in name_lower for p in media_patterns):
            return "music"

        # Video patterns
        video_patterns = ['video', 'movie', 'stream', 'netflix', 'youtube',
                         'hulu', 'disney', 'prime']
        if any(p in name_lower for p in video_patterns):
            return "video"

        # Gaming patterns
        game_patterns = ['game', 'steam', 'epic', 'play', 'xbox', 'psn']
        if any(p in name_lower for p in game_patterns):
            return "gaming"

        # System patterns
        system_patterns = ['system', 'settings', 'preferences', 'finder',
                          'explorer', 'monitor', 'manager', 'utility']
        if any(p in name_lower for p in system_patterns):
            return "system"

        # Default to software
        return "software"

    def _matches_list(self, value: str, patterns: List[str]) -> bool:
        """Check if value matches any pattern in the list"""
        value_lower = value.lower()
        for pattern in patterns:
            if pattern in value_lower or value_lower in pattern:
                return True
        return False

    def _classify_url(
        self,
        url: str,
        custom_lists: Dict[str, List[str]]
    ) -> Optional[ClassificationResult]:
        """Classify based on URL"""
        url_info = url_analyzer.analyze(url)
        domain = url_info.get("domain", "")

        # Check custom lists for domain
        if self._matches_list(domain, custom_lists.get("productive", [])):
            return ClassificationResult(
                productivity_score=0.9,
                productivity_type="productive",
                category="custom_productive",
                reason=f"'{domain}' is in your productive list",
                source="custom_list"
            )

        if self._matches_list(domain, custom_lists.get("distracting", [])):
            return ClassificationResult(
                productivity_score=0.1,
                productivity_type="distracting",
                category="custom_distracting",
                reason=f"'{domain}' is in your distracting list",
                source="custom_list"
            )

        # Check built-in productive domains
        for prod_domain, (category, score) in self.PRODUCTIVE_DOMAINS.items():
            if prod_domain in domain:
                return ClassificationResult(
                    productivity_score=score,
                    productivity_type=self._score_to_type(score),
                    category=category,
                    reason=f"'{domain}' is a known productive site",
                    source="rule"
                )

        # Check built-in distracting domains
        for dist_domain, (category, score) in self.DISTRACTING_DOMAINS.items():
            if dist_domain in domain:
                return ClassificationResult(
                    productivity_score=score,
                    productivity_type=self._score_to_type(score),
                    category=category,
                    reason=f"'{domain}' is a known distracting site",
                    source="rule"
                )

        # Use URL analyzer's category
        category = url_info.get("category", "other")
        score = url_info.get("productivity_score", 0.5)

        return ClassificationResult(
            productivity_score=score,
            productivity_type=self._score_to_type(score),
            category=category,
            reason=f"Categorized based on URL analysis",
            source="rule"
        )

    def _classify_app(self, app_name: str) -> Optional[ClassificationResult]:
        """Classify based on app name"""
        app_lower = app_name.lower()

        # Check excluded system apps first (lock screen, idle, etc.)
        for excl_app, (category, score) in self.EXCLUDED_APPS.items():
            if excl_app.lower() in app_lower or app_lower in excl_app.lower():
                return ClassificationResult(
                    productivity_score=score,
                    productivity_type="excluded",
                    category=category,
                    reason=f"'{app_name}' is a system/idle process (excluded)",
                    source="rule"
                )

        # Check productive apps
        for prod_app, (category, score) in self.PRODUCTIVE_APPS.items():
            if prod_app.lower() in app_lower or app_lower in prod_app.lower():
                return ClassificationResult(
                    productivity_score=score,
                    productivity_type="productive",
                    category=category,
                    reason=f"'{app_name}' is a known productive app",
                    source="rule"
                )

        # Check neutral apps
        for neut_app, (category, score) in self.NEUTRAL_APPS.items():
            if neut_app.lower() in app_lower or app_lower in neut_app.lower():
                return ClassificationResult(
                    productivity_score=score,
                    productivity_type="neutral",
                    category=category,
                    reason=f"'{app_name}' is categorized as neutral",
                    source="rule"
                )

        # Check distracting apps
        for dist_app, (category, score) in self.DISTRACTING_APPS.items():
            if dist_app.lower() in app_lower or app_lower in dist_app.lower():
                return ClassificationResult(
                    productivity_score=score,
                    productivity_type="distracting",
                    category=category,
                    reason=f"'{app_name}' is a known distracting app",
                    source="rule"
                )

        return None

    def _classify_by_title(self, title: str) -> Optional[ClassificationResult]:
        """Try to classify based on window title keywords"""
        title_lower = title.lower()

        # Development indicators
        dev_keywords = ["pull request", "issue", "commit", "merge", "branch",
                       "debug", "console", "terminal", "code review"]
        for keyword in dev_keywords:
            if keyword in title_lower:
                return ClassificationResult(
                    productivity_score=0.85,
                    productivity_type="productive",
                    category="development",
                    reason=f"Window title contains development keyword '{keyword}'",
                    source="rule"
                )

        # Documentation indicators
        doc_keywords = ["documentation", "docs", "readme", "api reference", "guide"]
        for keyword in doc_keywords:
            if keyword in title_lower:
                return ClassificationResult(
                    productivity_score=0.80,
                    productivity_type="productive",
                    category="documentation",
                    reason=f"Window title suggests documentation",
                    source="rule"
                )

        return None

    def _score_to_type(self, score: float) -> str:
        """Convert productivity score to type"""
        if score >= 0.6:
            return "productive"
        elif score <= 0.35:
            return "distracting"
        else:
            return "neutral"

    def get_category_stats(
        self,
        activities: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """Get time spent per category from a list of activities"""
        stats: Dict[str, int] = {}

        for activity in activities:
            result = self.classify(
                app_name=activity.get("app_name", ""),
                window_title=activity.get("window_title", ""),
                url=activity.get("url")
            )
            category = result.category
            duration = activity.get("duration", 0)

            stats[category] = stats.get(category, 0) + duration

        return stats


# Singleton instance
productivity_classifier = ProductivityClassifier()

# Track when rules were last loaded
_rules_loaded_at: Optional[float] = None
_rules_cache_ttl = 300  # 5 minutes cache


def classify_activity(
    app_name: str,
    window_title: str = "",
    url: Optional[str] = None
) -> ClassificationResult:
    """Convenience function to classify an activity (uses cached rules)"""
    return productivity_classifier.classify(app_name, window_title, url)


async def classify_activity_with_rules(
    app_name: str,
    window_title: str,
    url: Optional[str],
    db: AsyncSession,
    user_id: int = 1,
    force_refresh: bool = False
) -> ClassificationResult:
    """
    Classify an activity with user rules loaded from database.
    Uses cached rules with 5-minute TTL for performance.
    """
    import time
    global _rules_loaded_at

    current_time = time.time()

    # Load rules if cache is stale or forced refresh
    if (
        force_refresh or
        _rules_loaded_at is None or
        (current_time - _rules_loaded_at) > _rules_cache_ttl
    ):
        await productivity_classifier.load_user_rules(db, user_id)
        await productivity_classifier.load_custom_lists(db, user_id)
        _rules_loaded_at = current_time

    return productivity_classifier.classify(app_name, window_title, url)


async def refresh_classification_rules(db: AsyncSession, user_id: int = 1) -> None:
    """Force refresh of classification rules from database"""
    global _rules_loaded_at
    await productivity_classifier.load_user_rules(db, user_id)
    await productivity_classifier.load_custom_lists(db, user_id)
    import time
    _rules_loaded_at = time.time()
    print(f"Classification rules refreshed for user {user_id}")
