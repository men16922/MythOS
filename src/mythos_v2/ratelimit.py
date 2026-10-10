"""Per-player request limits for the v2 API (cloud-cost guard).

``mythos_api.limits`` caps loops per player; the v2 GM needs a request-rate cap
instead, so this is a tiny process-local sliding window (per minute) plus a
rolling 24 h budget. Process-local is deliberate: Cloud Run runs few instances
and the goal is a cost ceiling, not exact accounting.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from collections.abc import Callable

_DAY_SECONDS = 86_400.0
_MINUTE_SECONDS = 60.0


class RateLimiter:
    """``allow(key)`` → True while ``key`` is under both budgets (0 = unlimited)."""

    def __init__(
        self,
        per_minute: int,
        per_day: int = 0,
        *,
        clock: Callable[[], float] = time.monotonic,
        max_keys: int = 50_000,
    ) -> None:
        self.per_minute = max(0, per_minute)
        self.per_day = max(0, per_day)
        self._clock = clock
        self._max_keys = max_keys
        self._lock = threading.Lock()
        self._minute: dict[str, deque[float]] = {}
        self._day: dict[str, deque[float]] = {}

    def allow(self, key: str) -> bool:
        if self.per_minute == 0 and self.per_day == 0:
            return True
        now = self._clock()
        with self._lock:
            if len(self._minute) > self._max_keys:
                self._evict(now)
            minute = self._minute.setdefault(key, deque())
            day = self._day.setdefault(key, deque())
            while minute and now - minute[0] >= _MINUTE_SECONDS:
                minute.popleft()
            while day and now - day[0] >= _DAY_SECONDS:
                day.popleft()
            if self.per_minute and len(minute) >= self.per_minute:
                return False
            if self.per_day and len(day) >= self.per_day:
                return False
            minute.append(now)
            if self.per_day:
                day.append(now)
            return True

    def _evict(self, now: float) -> None:
        for key in list(self._minute):
            minute = self._minute[key]
            day = self._day.get(key)
            minute_idle = not minute or now - minute[-1] >= _MINUTE_SECONDS
            day_idle = not day or now - day[-1] >= _DAY_SECONDS
            if minute_idle and day_idle:
                self._minute.pop(key, None)
                self._day.pop(key, None)


__all__ = ["RateLimiter"]
