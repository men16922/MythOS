"""AI GM money budgets: a monthly allowance per signed-in player (by tier) and a global daily ceiling.

The GM never blocks play, so a budget miss only means the authored line is served (outcome ``budget`` or
``ceiling``). Spend is counted in micro-USD from the tokens each call was billed × the configured price
(``MYTHOS_GM_PRICE_IN_PER_M`` / ``MYTHOS_GM_PRICE_OUT_PER_M``; ``DEFAULT_PRICE`` when unset).

* Per player: ``v2_gm_spend`` (player, KST month) → micro-USD, cached per process for ``CACHE_SECONDS`` and
  re-read from the store after that, so the few Cloud Run instances converge without a lock service.
* Global: today's (KST) tokens from ``v2_gm_usage`` × price, re-read every ``CACHE_SECONDS`` plus the
  calls this process made since. When the day passes ``free_share`` of the ceiling, free players go authored
  first; Signal+ players keep the AI until the ceiling itself.

Env: MYTHOS_V2_BUDGET_FREE_USD (0.30), MYTHOS_V2_BUDGET_PLUS_USD (1.50), MYTHOS_V2_GM_DAILY_USD (20; 0 = no
ceiling), MYTHOS_V2_FREE_SHARE (0.7).
"""

from __future__ import annotations

import os
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal, Protocol

from mythos_v2 import daily
from mythos_v2.llm import Usage
from mythos_v2.log import get_logger

Tier = Literal["free", "plus"]
TIERS: tuple[Tier, ...] = ("free", "plus")

#: USD per million (prompt, output) tokens when no price is configured: gemini-3.8-flash at its
#: introductory price as measured 2026-10-17 (third-party source; set the env to Google's list price).
DEFAULT_PRICE: tuple[float, float] = (0.75, 3.75)
CACHE_SECONDS = 60.0
MICRO = 1_000_000

_logger = get_logger("mythos.v2.budget")


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "") or default)
    except ValueError:
        return default


def month_key(day: date) -> date:
    """The first day of ``day``'s month (the ``v2_gm_spend`` key)."""
    return day.replace(day=1)


def micro_usd(usage: Usage | None, price: tuple[float, float]) -> int:
    """What one call cost, in micro-USD (rounded up so tiny calls still count)."""
    if usage is None:
        return 0
    # tokens × USD-per-million = micro-USD exactly.
    cost = usage.prompt_tokens * price[0] + usage.output_tokens * price[1]
    return int(cost) + (0 if cost == int(cost) else 1)


@dataclass(frozen=True)
class BudgetConfig:
    free_usd: float = 0.30
    plus_usd: float = 1.50
    daily_usd: float = 20.0
    free_share: float = 0.7
    price: tuple[float, float] = DEFAULT_PRICE

    @classmethod
    def from_env(cls, price: tuple[float, float] | None = None) -> BudgetConfig:
        return cls(
            free_usd=max(0.0, _env_float("MYTHOS_V2_BUDGET_FREE_USD", 0.30)),
            plus_usd=max(0.0, _env_float("MYTHOS_V2_BUDGET_PLUS_USD", 1.50)),
            daily_usd=max(0.0, _env_float("MYTHOS_V2_GM_DAILY_USD", 20.0)),
            free_share=min(1.0, max(0.0, _env_float("MYTHOS_V2_FREE_SHARE", 0.7))),
            price=price or DEFAULT_PRICE,
        )

    def limit_micro(self, tier: Tier) -> int:
        return round((self.plus_usd if tier == "plus" else self.free_usd) * MICRO)


class SpendStore(Protocol):
    """The slice of ``V2Store`` the budget needs (kept small so tests can fake it)."""

    def gm_spend(self, player_id: str, month: date) -> int: ...

    def add_gm_spend(self, player_id: str, month: date, micro: int) -> None: ...

    def admin_gm_usage(self, since: date) -> list[tuple[date, str, str, int, int, int]]: ...


@dataclass
class _Cached:
    value: int
    loaded_at: float


class Budget:
    """``refusal(player, tier)`` before a call, ``charge(player, usage)`` after it."""

    def __init__(
        self,
        cfg: BudgetConfig,
        store: Callable[[], SpendStore],
        *,
        now: Callable[[], datetime],
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self.cfg = cfg
        self._store = store
        self._now = now
        self._mono = monotonic
        self._lock = threading.Lock()
        self._players: dict[tuple[str, date], _Cached] = {}
        self._day: tuple[date, _Cached] | None = None

    # --- reads -------------------------------------------------------------------------------------

    def _today(self) -> date:
        return daily.today_kst(self._now())

    def spent(self, player_id: str) -> int:
        """This player's micro-USD this (KST) month."""
        month = month_key(self._today())
        key = (player_id, month)
        with self._lock:
            cached = self._players.get(key)
            if cached is not None and self._mono() - cached.loaded_at < CACHE_SECONDS:
                return cached.value
        value = self._store().gm_spend(player_id, month)
        with self._lock:
            self._players[key] = _Cached(value, self._mono())
            if len(self._players) > 50_000:
                self._players = {k: v for k, v in self._players.items() if k[1] == month}
        return value

    def day_spent(self) -> int:
        """Everyone's micro-USD today (KST)."""
        today = self._today()
        with self._lock:
            if self._day is not None and self._day[0] == today:
                cached = self._day[1]
                if self._mono() - cached.loaded_at < CACHE_SECONDS:
                    return cached.value
        rows = self._store().admin_gm_usage(today)
        value = sum(
            micro_usd(Usage(prompt, output), self.cfg.price)
            for day, _, _, _, prompt, output in rows
            if day == today
        )
        with self._lock:
            self._day = (today, _Cached(value, self._mono()))
        return value

    # --- decisions ---------------------------------------------------------------------------------

    def refusal(self, player_id: str, tier: Tier) -> str | None:
        """None when this player may make a GM call now, else the outcome to log (``budget``/``ceiling``).
        A store failure never blocks the AI (the per-player rate limit still applies)."""
        try:
            if self.cfg.daily_usd > 0:
                share = 1.0 if tier == "plus" else self.cfg.free_share
                if self.day_spent() >= round(self.cfg.daily_usd * share * MICRO):
                    return "ceiling"
            if self.spent(player_id) >= self.cfg.limit_micro(tier):
                return "budget"
        except Exception as exc:
            _logger.warning("v2 budget check skipped: %s", type(exc).__name__)
        return None

    def charge(self, player_id: str, usage: Usage | None) -> None:
        """Add one call's cost to the player's month (store + cache) and to today's running total."""
        cost = micro_usd(usage, self.cfg.price)
        if cost <= 0:
            return
        today = self._today()
        month = month_key(today)
        with self._lock:
            cached = self._players.get((player_id, month))
            if cached is not None:
                cached.value += cost
            if self._day is not None and self._day[0] == today:
                self._day[1].value += cost
        self._store().add_gm_spend(player_id, month, cost)

    def status(self, player_id: str, tier: Tier) -> dict[str, float]:
        """USD view for the client's budget meter."""
        limit = self.cfg.limit_micro(tier)
        try:
            used = self.spent(player_id)
        except Exception:
            used = 0
        return {
            "limitUsd": limit / MICRO,
            "usedUsd": round(min(used, limit) / MICRO, 4),
            "left": round(max(0.0, 1 - used / limit), 3) if limit else 0.0,
        }


__all__ = [
    "DEFAULT_PRICE",
    "TIERS",
    "Budget",
    "BudgetConfig",
    "SpendStore",
    "Tier",
    "micro_usd",
    "month_key",
]
