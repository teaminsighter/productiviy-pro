from urllib.parse import urlparse
from typing import Optional, Dict, Any
import re


class URLAnalyzer:
    """Service for analyzing and categorizing URLs"""

    # Known platforms and their categories
    PLATFORMS = {
        'youtube.com': {'platform': 'YouTube', 'category': 'video'},
        'github.com': {'platform': 'GitHub', 'category': 'development'},
        'stackoverflow.com': {'platform': 'Stack Overflow', 'category': 'development'},
        'twitter.com': {'platform': 'Twitter', 'category': 'social_media'},
        'x.com': {'platform': 'Twitter', 'category': 'social_media'},
        'reddit.com': {'platform': 'Reddit', 'category': 'social_media'},
        'linkedin.com': {'platform': 'LinkedIn', 'category': 'social_media'},
        'facebook.com': {'platform': 'Facebook', 'category': 'social_media'},
        'instagram.com': {'platform': 'Instagram', 'category': 'social_media'},
        'tiktok.com': {'platform': 'TikTok', 'category': 'entertainment'},
        'netflix.com': {'platform': 'Netflix', 'category': 'entertainment'},
        'twitch.tv': {'platform': 'Twitch', 'category': 'entertainment'},
        'spotify.com': {'platform': 'Spotify', 'category': 'music'},
        'gmail.com': {'platform': 'Gmail', 'category': 'email'},
        'mail.google.com': {'platform': 'Gmail', 'category': 'email'},
        'outlook.com': {'platform': 'Outlook', 'category': 'email'},
        'slack.com': {'platform': 'Slack', 'category': 'communication'},
        'discord.com': {'platform': 'Discord', 'category': 'communication'},
        'zoom.us': {'platform': 'Zoom', 'category': 'meeting'},
        'meet.google.com': {'platform': 'Google Meet', 'category': 'meeting'},
        'teams.microsoft.com': {'platform': 'Teams', 'category': 'meeting'},
        'notion.so': {'platform': 'Notion', 'category': 'productivity'},
        'figma.com': {'platform': 'Figma', 'category': 'design'},
        'docs.google.com': {'platform': 'Google Docs', 'category': 'productivity'},
        'drive.google.com': {'platform': 'Google Drive', 'category': 'productivity'},
    }

    # Default productivity scores by category
    CATEGORY_SCORES = {
        'development': 0.9,
        'productivity': 0.8,
        'design': 0.8,
        'research': 0.7,
        'email': 0.6,
        'communication': 0.5,
        'meeting': 0.5,
        'music': 0.5,
        'video': 0.4,
        'social_media': 0.2,
        'entertainment': 0.1,
        'other': 0.5,
    }

    def analyze(self, url: str) -> Dict[str, Any]:
        """Analyze a URL and return metadata"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()

            # Remove www prefix
            if domain.startswith('www.'):
                domain = domain[4:]

            # Check known platforms
            platform_info = self._get_platform_info(domain)

            result = {
                'url': url,
                'domain': domain,
                'platform': platform_info.get('platform', domain),
                'category': platform_info.get('category', 'other'),
                'productivity_score': self.CATEGORY_SCORES.get(
                    platform_info.get('category', 'other'), 0.5
                ),
            }

            # Special handling for YouTube
            if 'youtube.com' in domain or 'youtu.be' in domain:
                youtube_data = self._parse_youtube_url(url)
                result.update(youtube_data)

            # Special handling for GitHub
            if 'github.com' in domain:
                github_data = self._parse_github_url(url)
                result.update(github_data)

            return result

        except Exception as e:
            return {
                'url': url,
                'domain': 'unknown',
                'platform': 'Unknown',
                'category': 'other',
                'productivity_score': 0.5,
                'error': str(e),
            }

    def _get_platform_info(self, domain: str) -> Dict[str, str]:
        """Get platform info for a domain"""
        # Check exact match
        if domain in self.PLATFORMS:
            return self.PLATFORMS[domain]

        # Check subdomain matches
        for known_domain, info in self.PLATFORMS.items():
            if domain.endswith('.' + known_domain) or domain == known_domain:
                return info

        return {}

    def _parse_youtube_url(self, url: str) -> Dict[str, Any]:
        """Extract YouTube video information from URL"""
        result = {'is_youtube': True}

        # Extract video ID
        video_id = None

        # youtube.com/watch?v=VIDEO_ID
        match = re.search(r'[?&]v=([a-zA-Z0-9_-]{11})', url)
        if match:
            video_id = match.group(1)

        # youtu.be/VIDEO_ID
        if not video_id:
            match = re.search(r'youtu\.be/([a-zA-Z0-9_-]{11})', url)
            if match:
                video_id = match.group(1)

        if video_id:
            result['video_id'] = video_id

        return result

    def _parse_github_url(self, url: str) -> Dict[str, Any]:
        """Extract GitHub repository information from URL"""
        result = {'is_github': True}

        # github.com/owner/repo
        match = re.search(r'github\.com/([^/]+)/([^/]+)', url)
        if match:
            result['github_owner'] = match.group(1)
            result['github_repo'] = match.group(2).split('?')[0].split('#')[0]

        # Check if it's an issue or PR
        if '/issues/' in url:
            result['github_type'] = 'issue'
            match = re.search(r'/issues/(\d+)', url)
            if match:
                result['github_number'] = int(match.group(1))
        elif '/pull/' in url:
            result['github_type'] = 'pr'
            match = re.search(r'/pull/(\d+)', url)
            if match:
                result['github_number'] = int(match.group(1))

        return result


# Singleton instance
url_analyzer = URLAnalyzer()
