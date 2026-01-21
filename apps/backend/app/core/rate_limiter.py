"""
Rate Limiting Configuration for Productify Pro API

Implements rate limiting to prevent abuse and brute force attacks.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from typing import Callable
import time
from collections import defaultdict

# In-memory storage for failed login attempts (for brute force protection)
# In production, use Redis for multi-instance support
_failed_attempts: dict[str, list[float]] = defaultdict(list)
_lockout_until: dict[str, float] = {}

# Configuration
MAX_FAILED_ATTEMPTS = 5  # Lock after 5 failed attempts
LOCKOUT_DURATION = 300  # 5 minutes lockout
ATTEMPT_WINDOW = 300  # Count attempts within 5 minute window


def get_real_ip(request: Request) -> str:
    """
    Get the real client IP address, considering proxies.
    """
    # Check for forwarded headers (when behind proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP in the chain (original client)
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fall back to direct connection IP
    return get_remote_address(request)


# Create the rate limiter instance
limiter = Limiter(
    key_func=get_real_ip,
    default_limits=["100/minute"],  # Default: 100 requests per minute
    storage_uri="memory://",  # Use memory storage (use Redis in production)
    strategy="fixed-window",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors.
    Returns a user-friendly JSON response.
    """
    # Extract retry-after from the exception
    retry_after = getattr(exc, 'retry_after', 60)

    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please try again later.",
            "error_code": "RATE_LIMITED",
            "retry_after": retry_after,
        },
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": str(exc.limit) if hasattr(exc, 'limit') else "100",
        }
    )


# Brute Force Protection Functions
def record_failed_attempt(identifier: str) -> None:
    """
    Record a failed login attempt for brute force protection.

    Args:
        identifier: Email or IP address to track
    """
    current_time = time.time()

    # Clean old attempts outside the window
    _failed_attempts[identifier] = [
        t for t in _failed_attempts[identifier]
        if current_time - t < ATTEMPT_WINDOW
    ]

    # Record new attempt
    _failed_attempts[identifier].append(current_time)

    # Check if lockout threshold reached
    if len(_failed_attempts[identifier]) >= MAX_FAILED_ATTEMPTS:
        _lockout_until[identifier] = current_time + LOCKOUT_DURATION


def clear_failed_attempts(identifier: str) -> None:
    """
    Clear failed attempts after successful login.

    Args:
        identifier: Email or IP address to clear
    """
    _failed_attempts.pop(identifier, None)
    _lockout_until.pop(identifier, None)


def is_locked_out(identifier: str) -> tuple[bool, int]:
    """
    Check if an identifier is currently locked out.

    Args:
        identifier: Email or IP address to check

    Returns:
        Tuple of (is_locked, seconds_remaining)
    """
    lockout_time = _lockout_until.get(identifier)
    if not lockout_time:
        return False, 0

    current_time = time.time()
    if current_time >= lockout_time:
        # Lockout expired, clear it
        clear_failed_attempts(identifier)
        return False, 0

    return True, int(lockout_time - current_time)


def get_remaining_attempts(identifier: str) -> int:
    """
    Get the number of remaining login attempts before lockout.

    Args:
        identifier: Email or IP address to check

    Returns:
        Number of remaining attempts
    """
    current_time = time.time()

    # Clean old attempts
    valid_attempts = [
        t for t in _failed_attempts.get(identifier, [])
        if current_time - t < ATTEMPT_WINDOW
    ]

    return max(0, MAX_FAILED_ATTEMPTS - len(valid_attempts))


# Rate limit decorators for common use cases
def auth_rate_limit() -> str:
    """Rate limit for authentication endpoints: 5 per minute"""
    return "5/minute"


def api_rate_limit() -> str:
    """Rate limit for general API endpoints: 100 per minute"""
    return "100/minute"


def sensitive_rate_limit() -> str:
    """Rate limit for sensitive operations: 10 per minute"""
    return "10/minute"


def export_rate_limit() -> str:
    """Rate limit for data export operations: 5 per hour"""
    return "5/hour"
