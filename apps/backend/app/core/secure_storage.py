"""
Secure Storage Module for Productify Pro

Provides secure storage for OAuth states and other temporary data.
Uses Redis if available, with fallback to memory storage with TTL.
"""
import secrets
import time
from typing import Optional, Any, Dict
from datetime import datetime, timedelta
import json
import asyncio
from functools import wraps

from app.core.config import settings


class MemoryStorage:
    """
    Thread-safe in-memory storage with TTL support.
    Used as fallback when Redis is not available.
    """

    def __init__(self):
        self._store: Dict[str, tuple[Any, float]] = {}
        self._lock = asyncio.Lock()
        self._cleanup_interval = 60  # seconds
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start_cleanup_task(self):
        """Start background cleanup task"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def _cleanup_loop(self):
        """Periodically clean up expired entries"""
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                await self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Cleanup error: {e}")

    async def _cleanup_expired(self):
        """Remove expired entries"""
        async with self._lock:
            current_time = time.time()
            expired = [k for k, (_, exp) in self._store.items() if current_time > exp]
            for k in expired:
                del self._store[k]

    async def set(self, key: str, value: Any, ttl: int = 600) -> bool:
        """
        Store a value with TTL (default 10 minutes)

        Args:
            key: Storage key
            value: Value to store (will be JSON serialized)
            ttl: Time to live in seconds

        Returns:
            True if stored successfully
        """
        async with self._lock:
            expiry = time.time() + ttl
            self._store[key] = (value, expiry)
            return True

    async def get(self, key: str) -> Optional[Any]:
        """
        Retrieve a value by key

        Args:
            key: Storage key

        Returns:
            The stored value or None if not found/expired
        """
        async with self._lock:
            if key not in self._store:
                return None

            value, expiry = self._store[key]
            if time.time() > expiry:
                del self._store[key]
                return None

            return value

    async def delete(self, key: str) -> bool:
        """
        Delete a value by key

        Args:
            key: Storage key

        Returns:
            True if deleted, False if not found
        """
        async with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    async def pop(self, key: str) -> Optional[Any]:
        """
        Get and delete a value atomically

        Args:
            key: Storage key

        Returns:
            The stored value or None if not found/expired
        """
        async with self._lock:
            if key not in self._store:
                return None

            value, expiry = self._store[key]
            del self._store[key]

            if time.time() > expiry:
                return None

            return value


class RedisStorage:
    """
    Redis-based storage with TTL support.
    """

    def __init__(self, redis_url: str):
        self._redis_url = redis_url
        self._client = None

    async def _get_client(self):
        """Lazy initialize Redis client"""
        if self._client is None:
            try:
                import redis.asyncio as aioredis
                self._client = aioredis.from_url(
                    self._redis_url,
                    encoding="utf-8",
                    decode_responses=True
                )
                # Test connection
                await self._client.ping()
            except Exception as e:
                print(f"Failed to connect to Redis: {e}")
                self._client = None
                raise
        return self._client

    async def set(self, key: str, value: Any, ttl: int = 600) -> bool:
        """Store a value with TTL"""
        try:
            client = await self._get_client()
            serialized = json.dumps(value, default=str)
            await client.setex(f"oauth_state:{key}", ttl, serialized)
            return True
        except Exception as e:
            print(f"Redis set error: {e}")
            return False

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve a value by key"""
        try:
            client = await self._get_client()
            value = await client.get(f"oauth_state:{key}")
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Redis get error: {e}")
            return None

    async def delete(self, key: str) -> bool:
        """Delete a value by key"""
        try:
            client = await self._get_client()
            result = await client.delete(f"oauth_state:{key}")
            return result > 0
        except Exception as e:
            print(f"Redis delete error: {e}")
            return False

    async def pop(self, key: str) -> Optional[Any]:
        """Get and delete a value atomically"""
        try:
            client = await self._get_client()
            # Use pipeline for atomic operation
            async with client.pipeline() as pipe:
                pipe.get(f"oauth_state:{key}")
                pipe.delete(f"oauth_state:{key}")
                results = await pipe.execute()

            value = results[0]
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Redis pop error: {e}")
            return None


class SecureStateStorage:
    """
    High-level secure storage for OAuth states.
    Automatically uses Redis if available, falls back to memory.
    """

    def __init__(self):
        self._storage = None
        self._initialized = False

    async def _get_storage(self):
        """Initialize storage backend"""
        if self._storage is not None:
            return self._storage

        # Try Redis first
        if settings.redis_url:
            try:
                redis_storage = RedisStorage(settings.redis_url)
                # Test connection
                await redis_storage.set("__test__", "test", ttl=1)
                await redis_storage.delete("__test__")
                self._storage = redis_storage
                print("✅ Using Redis for OAuth state storage")
                return self._storage
            except Exception as e:
                print(f"⚠️ Redis not available: {e}")

        # Fall back to memory storage
        memory_storage = MemoryStorage()
        await memory_storage.start_cleanup_task()
        self._storage = memory_storage
        print("⚠️ Using in-memory OAuth state storage (configure REDIS_URL for production)")
        return self._storage

    async def create_state(self, user_id: int, extra_data: Optional[dict] = None, ttl: int = 600) -> str:
        """
        Create a new OAuth state token

        Args:
            user_id: The user ID to associate with this state
            extra_data: Additional data to store with the state
            ttl: Time to live in seconds (default 10 minutes)

        Returns:
            The generated state token
        """
        storage = await self._get_storage()

        state = secrets.token_urlsafe(32)
        data = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            **(extra_data or {})
        }

        await storage.set(state, data, ttl=ttl)
        return state

    async def verify_state(self, state: str) -> Optional[dict]:
        """
        Verify and consume an OAuth state token

        Args:
            state: The state token to verify

        Returns:
            The associated data if valid, None otherwise
        """
        storage = await self._get_storage()
        return await storage.pop(state)

    async def get_state(self, state: str) -> Optional[dict]:
        """
        Get state data without consuming it

        Args:
            state: The state token

        Returns:
            The associated data if valid, None otherwise
        """
        storage = await self._get_storage()
        return await storage.get(state)


# Global instance
secure_state_storage = SecureStateStorage()
