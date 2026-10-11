"""Daily-seed leaderboard domain: the result shape, its ordering, name cleaning and KST date windows.

Pure functions only (no I/O); ``store`` persists, ``api`` validates and serves.

Ordering mirrors ``engine/daily.ts`` ``isBetterDaily`` exactly: won, then act, floors, echoes, kills
(higher is better), then secs (lower is better; a missing secs is the worst), and on a full tie the result
achieved first wins. ``DailyResult.score`` packs those keys into one integer (higher = better) so the
database can rank with a single indexed column.

Trust model: results are client-reported. The server only checks plausibility (types and ranges, see
``api.DailyResultBody``); it does not replay runs.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any

KST = timezone(timedelta(hours=9), "KST")

#: Submissions accepted for today and yesterday (KST): a run started before midnight may end after it.
SUBMIT_WINDOW_DAYS = 2
#: Boards readable for today and the 29 days before it (the client keeps 30 days, ``DAILY_CAP``).
READ_WINDOW_DAYS = 30

ARCHETYPE_PATTERN = r"^[a-z_]{1,32}$"
DEFAULT_NAME = "익명"
NAME_MAX_CHARS = 16

_DATE_KEY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# --- score packing ------------------------------------------------------------------------------------------
# Bit widths leave headroom over the validated ranges (act 1..3, floors 0..80, echoes/kills 0..999,
# secs 1..86400) so a later range bump does not need a re-encode. 1+4+8+14+14+17 = 58 bits < BIGINT.
_ACT_BITS, _FLOORS_BITS, _COUNT_BITS, _SECS_BITS = 4, 8, 14, 17
_SECS_CAP = (1 << _SECS_BITS) - 1


def _clamp(value: int, bits: int) -> int:
    return max(0, min((1 << bits) - 1, value))


@dataclass(frozen=True)
class DailyResult:
    """One finished daily run (``engine/types.ts`` ``DailyResult``)."""

    archetype: str
    won: bool
    act: int
    floors: int
    echoes: int
    kills: int
    secs: int | None = None

    @property
    def score(self) -> int:
        """All ranking keys in one integer; higher is better. Missing secs packs as 0 (the worst)."""
        secs_key = 0 if self.secs is None else _SECS_CAP - _clamp(self.secs, _SECS_BITS)
        packed = int(self.won)
        packed = (packed << _ACT_BITS) | _clamp(self.act, _ACT_BITS)
        packed = (packed << _FLOORS_BITS) | _clamp(self.floors, _FLOORS_BITS)
        packed = (packed << _COUNT_BITS) | _clamp(self.echoes, _COUNT_BITS)
        packed = (packed << _COUNT_BITS) | _clamp(self.kills, _COUNT_BITS)
        return (packed << _SECS_BITS) | secs_key

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "archetype": self.archetype,
            "won": self.won,
            "act": self.act,
            "floors": self.floors,
            "echoes": self.echoes,
            "kills": self.kills,
        }
        if self.secs is not None:
            out["secs"] = self.secs
        return out


def is_better_daily(a: DailyResult, b: DailyResult | None) -> bool:
    """Port of ``engine/daily.ts`` ``isBetterDaily`` (kept to test that ``score`` agrees with it)."""
    if b is None:
        return True
    inf = float("inf")
    keys: list[tuple[float, float]] = [
        (int(a.won), int(b.won)),
        (a.act, b.act),
        (a.floors, b.floors),
        (a.echoes, b.echoes),
        (a.kills, b.kills),
        (-(inf if a.secs is None else a.secs), -(inf if b.secs is None else b.secs)),
    ]
    for x, y in keys:
        if x != y:
            return x > y
    return False


@dataclass(frozen=True)
class DailyEntry:
    """A player's best on one (day, archetype) board. ``achieved_at`` = when that best was first set."""

    player_id: str
    name: str
    result: DailyResult
    achieved_at: datetime

    def board_key(self) -> tuple[int, datetime, str]:
        """Sort key, ascending = better (score desc, first achieved, then player id for a total order)."""
        return (-self.result.score, self.achieved_at, self.player_id)


@dataclass(frozen=True)
class DailySubmission:
    rank: int
    total: int
    best: DailyResult
    improved: bool


@dataclass(frozen=True)
class DailyBoard:
    total: int
    #: (rank, entry), best first.
    entries: list[tuple[int, DailyEntry]] = field(default_factory=list)
    #: The requesting player's (rank, entry), when they have one on this board.
    me: tuple[int, DailyEntry] | None = None


# --- dates ----------------------------------------------------------------------------------------------------


def today_kst(now: datetime | None = None) -> date:
    moment = now or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.astimezone(KST).date()


def parse_day(key: str) -> date | None:
    """A real calendar date written 'YYYY-MM-DD', else None."""
    if not _DATE_KEY_RE.fullmatch(key):
        return None
    try:
        return date.fromisoformat(key)
    except ValueError:
        return None


def in_window(day: date, today: date, days: int) -> bool:
    """``day`` is ``today`` or one of the ``days - 1`` days before it."""
    return today - timedelta(days=days - 1) <= day <= today


# --- names ----------------------------------------------------------------------------------------------------


def clean_name(raw: str | None) -> str:
    """Trim, drop control/format characters, collapse whitespace, cap at 16 characters; empty → "익명"."""
    text = unicodedata.normalize("NFC", raw or "")
    kept = []
    for ch in text:
        category = unicodedata.category(ch)
        if category in {"Zl", "Zp"} or ch in "\t\n\r\v\f":
            kept.append(" ")
        elif not category.startswith("C"):
            kept.append(ch)
    name = " ".join("".join(kept).split())[:NAME_MAX_CHARS].strip()
    return name or DEFAULT_NAME


__all__ = [
    "ARCHETYPE_PATTERN",
    "DEFAULT_NAME",
    "KST",
    "NAME_MAX_CHARS",
    "READ_WINDOW_DAYS",
    "SUBMIT_WINDOW_DAYS",
    "DailyBoard",
    "DailyEntry",
    "DailyResult",
    "DailySubmission",
    "clean_name",
    "in_window",
    "is_better_daily",
    "parse_day",
    "today_kst",
]
