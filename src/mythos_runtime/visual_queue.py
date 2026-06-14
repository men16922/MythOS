"""Redis-backed queue for asynchronous visual (image) generation jobs.

The synchronous path blocks the Streamlit rerun until FLUX finishes. With a queue,
`RuntimeSessionService` records a `pending` asset and enqueues a job; a long-running
`mythos_runtime.visual_worker` (which keeps the FLUX pipeline warm via
`mythos_image_agent.pipeline_cache`) consumes jobs and updates the asset to
`succeeded`/`failed`. Text play never waits.

`redis` is imported lazily so importing this module (and the runtime) never requires
the dependency; `is_available()`/`worker_alive()` let callers degrade to the
synchronous path when Redis or a worker is absent.
"""

from __future__ import annotations

import json
import os
import socket
import time
from typing import Any

JOBS_KEY = "mythos:visual:jobs"
HEARTBEAT_KEY = "mythos:visual:worker:heartbeat"
# The heartbeat key doubles as a single-instance lock. TTL must exceed the longest
# single image job (FLUX can take >60s) so the lock doesn't expire mid-job and let a
# second worker start — two workers would each load ~24GB of FLUX and thrash swap.
HEARTBEAT_TTL_SECONDS = 180


class VisualJobQueue:
    def __init__(self, url: str | None = None) -> None:
        self.url: str = (
            url if url is not None else os.getenv("REDIS_URL", "redis://localhost:6379/0")
        )
        self._client: Any = None
        self._worker_token: str | None = None

    def _redis(self) -> Any:
        if self._client is None:
            import redis  # lazy: optional dependency

            # socket_timeout=None lets blocking BRPOP wait its full server-side timeout
            # without the client socket read timing out (redis-py 8.x default otherwise
            # aborts the blocking pop). keepalive + health checks keep the long-lived
            # worker connection alive across idle periods.
            self._client = redis.Redis.from_url(
                self.url,
                decode_responses=True,
                socket_timeout=None,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30,
            )
        return self._client

    def is_available(self) -> bool:
        """True if Redis answers a PING."""
        try:
            return bool(self._redis().ping())
        except Exception:
            return False

    def worker_alive(self) -> bool:
        """True if a worker heartbeat key is currently present (implies Redis is up)."""
        try:
            return bool(self._redis().exists(HEARTBEAT_KEY) == 1)
        except Exception:
            return False

    def acquire_worker_slot(self) -> bool:
        """Atomically claim the single-worker slot (SET NX). True if this process won.

        Prevents two workers from running at once (each would load its own ~24GB FLUX).
        """
        token = f"{socket.gethostname()}:{os.getpid()}"
        got = self._redis().set(HEARTBEAT_KEY, token, nx=True, ex=HEARTBEAT_TTL_SECONDS)
        if got:
            self._worker_token = token
        return bool(got)

    def enqueue(self, job: dict[str, Any]) -> None:
        self._redis().lpush(JOBS_KEY, json.dumps(job))

    def dequeue(self, timeout: int = 5) -> dict[str, Any] | None:
        """Block up to `timeout` seconds for the next job (FIFO via BRPOP).

        Returns None on an empty queue or a transient socket/connection hiccup, so
        the worker loop just keeps polling instead of crashing.
        """
        import redis

        try:
            result = self._redis().brpop(JOBS_KEY, timeout=timeout)
        except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError):
            return None
        if result is None:
            return None
        _key, payload = result
        job: dict[str, Any] = json.loads(payload)
        return job

    def beat(self) -> None:
        token = self._worker_token or str(time.time())
        self._redis().set(HEARTBEAT_KEY, token, ex=HEARTBEAT_TTL_SECONDS)

    def release_worker_slot(self) -> bool:
        """Release this worker's single-instance lock if it still owns it."""
        if self._worker_token is None:
            return False
        try:
            current = self._redis().get(HEARTBEAT_KEY)
            if current == self._worker_token:
                self._redis().delete(HEARTBEAT_KEY)
                return True
            return False
        finally:
            self._worker_token = None

    def depth(self) -> int:
        try:
            return int(self._redis().llen(JOBS_KEY))
        except Exception:
            return 0

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None


class SessionCache:
    def __init__(self, url: str | None = None) -> None:
        self.url: str = (
            url if url is not None else os.getenv("REDIS_URL", "redis://localhost:6379/0")
        )
        self._client: Any = None

    def _redis(self) -> Any:
        if self._client is None:
            import redis

            self._client = redis.Redis.from_url(
                self.url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
        return self._client

    def is_available(self) -> bool:
        try:
            return bool(self._redis().ping())
        except Exception:
            return False

    def get_snapshot(self, loop_id: str) -> dict[str, Any] | None:
        """Fetch the cached session snapshot JSON from Redis."""
        try:
            raw = self._redis().get(f"mythos:session:{loop_id}")
            if raw:
                snapshot: dict[str, Any] = json.loads(raw)
                return snapshot
        except Exception:
            pass
        return None

    def set_snapshot(self, loop_id: str, snapshot_dict: dict[str, Any], ttl_seconds: int = 1800) -> None:
        """Cache the session snapshot JSON in Redis with a TTL (default 30m)."""
        try:
            self._redis().set(f"mythos:session:{loop_id}", json.dumps(snapshot_dict), ex=ttl_seconds)
        except Exception:
            pass

    def delete_snapshot(self, loop_id: str) -> None:
        """Evict the cached session snapshot from Redis."""
        try:
            self._redis().delete(f"mythos:session:{loop_id}")
        except Exception:
            pass

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None

