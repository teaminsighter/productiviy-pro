"""
Logging and Performance Monitoring Middleware
"""
import time
import uuid
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.logging import get_logger, request_id_var

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Generates unique request IDs for tracing
    2. Logs request/response details
    3. Tracks request duration for performance monitoring
    """

    def __init__(self, app: ASGIApp, exclude_paths: list[str] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json", "/redoc"]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID (use existing if provided)
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # Set request ID in context variable for use across async calls
        token = request_id_var.set(request_id)

        # Track timing
        start_time = time.perf_counter()

        # Extract request info
        method = request.method
        path = request.url.path
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "-")

        # Skip logging for excluded paths
        should_log = path not in self.exclude_paths

        if should_log:
            logger.info(
                f"Request started: {method} {path}",
                extra={
                    "extra_fields": {
                        "event": "request_started",
                        "method": method,
                        "path": path,
                        "client_ip": client_ip,
                        "user_agent": user_agent[:100] if user_agent else "-",
                    }
                }
            )

        try:
            # Process request
            response = await call_next(request)

            # Calculate duration
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            # Log response
            if should_log:
                log_level = "warning" if response.status_code >= 400 else "info"
                log_fn = getattr(logger, log_level)
                log_fn(
                    f"Request completed: {method} {path} - {response.status_code} ({duration_ms:.2f}ms)",
                    extra={
                        "extra_fields": {
                            "event": "request_completed",
                            "method": method,
                            "path": path,
                            "status_code": response.status_code,
                            "duration_ms": round(duration_ms, 2),
                            "client_ip": client_ip,
                        }
                    }
                )

                # Log slow requests
                if duration_ms > 1000:  # > 1 second
                    logger.warning(
                        f"Slow request detected: {method} {path} took {duration_ms:.2f}ms",
                        extra={
                            "extra_fields": {
                                "event": "slow_request",
                                "method": method,
                                "path": path,
                                "duration_ms": round(duration_ms, 2),
                            }
                        }
                    )

            return response

        except Exception as e:
            # Calculate duration
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Log error
            logger.error(
                f"Request failed: {method} {path} - {type(e).__name__}: {str(e)}",
                exc_info=True,
                extra={
                    "extra_fields": {
                        "event": "request_failed",
                        "method": method,
                        "path": path,
                        "duration_ms": round(duration_ms, 2),
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "client_ip": client_ip,
                    }
                }
            )
            raise

        finally:
            # Reset request ID context
            request_id_var.reset(token)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies"""
        # Check for forwarded headers
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fall back to client host
        if request.client:
            return request.client.host

        return "unknown"


class PerformanceMetrics:
    """Simple in-memory performance metrics collector"""

    def __init__(self, max_samples: int = 1000):
        self.max_samples = max_samples
        self._request_times: dict[str, list[float]] = {}
        self._error_counts: dict[str, int] = {}
        self._request_counts: dict[str, int] = {}

    def record_request(self, path: str, duration_ms: float, status_code: int):
        """Record a request's metrics"""
        # Track request times
        if path not in self._request_times:
            self._request_times[path] = []
        self._request_times[path].append(duration_ms)

        # Keep only recent samples
        if len(self._request_times[path]) > self.max_samples:
            self._request_times[path] = self._request_times[path][-self.max_samples:]

        # Track request counts
        self._request_counts[path] = self._request_counts.get(path, 0) + 1

        # Track errors
        if status_code >= 400:
            self._error_counts[path] = self._error_counts.get(path, 0) + 1

    def get_metrics(self) -> dict:
        """Get aggregated metrics"""
        metrics = {
            "endpoints": {},
            "totals": {
                "total_requests": sum(self._request_counts.values()),
                "total_errors": sum(self._error_counts.values()),
            }
        }

        for path, times in self._request_times.items():
            if times:
                sorted_times = sorted(times)
                metrics["endpoints"][path] = {
                    "count": self._request_counts.get(path, 0),
                    "errors": self._error_counts.get(path, 0),
                    "avg_ms": round(sum(times) / len(times), 2),
                    "min_ms": round(min(times), 2),
                    "max_ms": round(max(times), 2),
                    "p50_ms": round(sorted_times[len(sorted_times) // 2], 2),
                    "p95_ms": round(sorted_times[int(len(sorted_times) * 0.95)], 2) if len(sorted_times) > 1 else round(sorted_times[0], 2),
                    "p99_ms": round(sorted_times[int(len(sorted_times) * 0.99)], 2) if len(sorted_times) > 1 else round(sorted_times[0], 2),
                }

        return metrics

    def reset(self):
        """Reset all metrics"""
        self._request_times.clear()
        self._error_counts.clear()
        self._request_counts.clear()


# Global metrics instance
performance_metrics = PerformanceMetrics()


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware that collects performance metrics"""

    def __init__(self, app: ASGIApp, exclude_paths: list[str] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json", "/redoc"]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip excluded paths
        if path in self.exclude_paths:
            return await call_next(request)

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Record metrics (normalize path to avoid cardinality explosion)
        normalized_path = self._normalize_path(path)
        performance_metrics.record_request(normalized_path, duration_ms, response.status_code)

        # Add timing header
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        return response

    def _normalize_path(self, path: str) -> str:
        """Normalize path to avoid high cardinality from IDs"""
        parts = path.split("/")
        normalized = []
        for part in parts:
            # Replace numeric IDs and UUIDs with placeholders
            if part.isdigit():
                normalized.append(":id")
            elif len(part) == 36 and part.count("-") == 4:  # UUID-like
                normalized.append(":uuid")
            else:
                normalized.append(part)
        return "/".join(normalized)
