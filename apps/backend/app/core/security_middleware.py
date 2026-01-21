"""
Security Middleware for Productify Pro API

Implements security headers and CSRF protection.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import secrets
import time
from typing import Optional

# CSRF Token storage (in production, use Redis)
_csrf_tokens: dict[str, tuple[str, float]] = {}
CSRF_TOKEN_EXPIRY = 3600  # 1 hour


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Content Security Policy (relaxed for API)
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"

        # Strict Transport Security (for HTTPS)
        # Only add in production when using HTTPS
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection Middleware.

    For desktop apps (Tauri), CSRF is less critical since:
    1. No cookies are used (JWT in Authorization header)
    2. Same-origin policy doesn't apply the same way

    But we implement it for completeness and web dashboard support.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    EXEMPT_PATHS = {
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/google",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/billing/webhook",  # Stripe webhook
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    def __init__(self, app: ASGIApp, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip CSRF check if disabled or for safe methods
        if not self.enabled:
            return await call_next(request)

        if request.method in self.SAFE_METHODS:
            return await call_next(request)

        # Skip for WebSocket upgrades
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)

        # Skip for exempt paths
        path = request.url.path
        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return await call_next(request)

        # For now, skip CSRF for Bearer token authenticated requests
        # Since the desktop app uses JWT tokens in Authorization header,
        # CSRF is not a concern (attacker can't read the token)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return await call_next(request)

        # For cookie-based auth (web dashboard), check CSRF token
        csrf_token = request.headers.get("X-CSRF-Token")
        session_id = request.cookies.get("session_id")

        if session_id and not self._validate_csrf_token(session_id, csrf_token):
            return Response(
                content='{"detail": "CSRF token missing or invalid", "error_code": "CSRF_ERROR"}',
                status_code=403,
                media_type="application/json",
            )

        return await call_next(request)

    def _validate_csrf_token(self, session_id: str, token: Optional[str]) -> bool:
        """Validate CSRF token for a session."""
        if not token:
            return False

        stored = _csrf_tokens.get(session_id)
        if not stored:
            return False

        stored_token, expiry = stored
        if time.time() > expiry:
            # Token expired
            del _csrf_tokens[session_id]
            return False

        return secrets.compare_digest(stored_token, token)


def generate_csrf_token(session_id: str) -> str:
    """
    Generate a new CSRF token for a session.

    Args:
        session_id: The session identifier

    Returns:
        The generated CSRF token
    """
    token = secrets.token_urlsafe(32)
    _csrf_tokens[session_id] = (token, time.time() + CSRF_TOKEN_EXPIRY)

    # Clean up expired tokens periodically
    _cleanup_expired_tokens()

    return token


def _cleanup_expired_tokens() -> None:
    """Remove expired CSRF tokens."""
    current_time = time.time()
    expired = [
        sid for sid, (_, expiry) in _csrf_tokens.items()
        if current_time > expiry
    ]
    for sid in expired:
        del _csrf_tokens[sid]
