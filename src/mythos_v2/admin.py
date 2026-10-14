"""Operator dashboard data for ``GET /api/v2/admin/overview`` (the ``/admin`` page).

Pure functions and small dataclasses only (no I/O): ``store`` reads the rows, ``api`` gates access and
serves the result. Everything here is aggregate or pseudonymous — a player is shown by a short ``ref`` of the
opaque ``g_…`` id plus the display name the player chose; the Google email/uid is never stored, so it can
never appear.

Trust model: run records and daily results are client-reported (see ``daily``), so these numbers are for
watching how the game is played, not for anything that needs to be tamper-proof.
"""

from __future__ import annotations

import threading
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

from mythos_v2.daily import KST, DailyEntry, clean_name

MAX_DAYS = 60
DEFAULT_DAYS = 14
#: Rows the stores read per dataset (a safety cap; the game is small).
MAX_PLAYERS = 500
MAX_RUN_ROWS = 20_000
TOP_ROWS = 8
BOARD_TOP = 5
REF_CHARS = 8

RESULTS = ("victory", "defeat", "abandoned")


def _int(value: Any, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int | float):
        return int(value)
    if isinstance(value, str):
        try:
            return int(float(value))
        except ValueError:
            return default
    return default


def _text(value: Any, limit: int = 40) -> str:
    return value.strip()[:limit] if isinstance(value, str) else ""


def _iso(moment: datetime | None) -> str | None:
    return moment.astimezone(UTC).isoformat() if moment is not None else None


def player_ref(player_id: str) -> str:
    """A short, stable label: ``g_3fa9c1d2`` (signed-in) or ``a_0123abcd`` (anonymous client id)."""
    if player_id.startswith("g_"):
        return "g_" + player_id[2 : 2 + REF_CHARS]
    return "a_" + player_id[:REF_CHARS]


@dataclass(frozen=True)
class AdminPlayer:
    """One player's saves, reduced to the few fields the dashboard shows."""

    player_id: str
    #: ``profile`` slot subset: playerName, loops, wins, bestAct, totalEchoes, paradoxUnlocked, unlocks, endings.
    profile: dict[str, Any]
    profile_updated_at: datetime | None
    #: ``run`` slot subset (an unfinished run): archetype, act, paradox, hp, maxHp, floors, daily. None = no run.
    run: dict[str, Any] | None
    run_updated_at: datetime | None
    #: When this player first saved anything (``v2_saves.created_at``).
    first_seen: datetime | None = None

    @property
    def last_active(self) -> datetime | None:
        stamps = [s for s in (self.profile_updated_at, self.run_updated_at) if s is not None]
        return max(stamps) if stamps else None


#: At most this many flagged AI lines come back to the dashboard.
MAX_GM_REPORTS = 100


@dataclass(frozen=True)
class GMReport:
    """One AI line a player flagged as offensive (no player id is kept)."""

    created_at: datetime
    route: str
    kind: str
    lang: str
    text: str


@dataclass(frozen=True)
class AdminRun:
    """One finished-run record (``RunRecord``) with its server-side arrival time."""

    player_id: str
    created_at: datetime
    result: str
    archetype: str
    act: int
    floors: int
    echoes: int
    ending: str
    killed_by: str
    daily: bool


def run_from_fields(
    player_id: str,
    created_at: datetime,
    *,
    result: Any,
    archetype: Any,
    act: Any,
    floors: Any,
    echoes: Any,
    ending: Any,
    killed_by: Any,
    daily: Any,
) -> AdminRun:
    """Normalise untrusted record fields (a JSON blob column) into an ``AdminRun``."""
    outcome = _text(result, 16)
    return AdminRun(
        player_id=player_id,
        created_at=created_at,
        result=outcome if outcome in RESULTS else "abandoned",
        archetype=_text(archetype, 32) or "?",
        act=_int(act),
        floors=_int(floors),
        echoes=_int(echoes),
        ending=_text(ending, 48),
        killed_by=_text(killed_by, 48),
        daily=bool(_text(daily, 16)),
    )


def profile_summary(blob: dict[str, Any]) -> dict[str, Any]:
    """The dashboard-relevant fields of a ``MetaProfile`` blob, type-coerced."""
    unlocks = blob.get("unlocks")
    endings = blob.get("endingsSeen")
    return {
        "name": clean_name(_text(blob.get("playerName"), 64)),
        "runs": _int(blob.get("loops")),
        "wins": _int(blob.get("wins")),
        "best_act": _int(blob.get("bestAct")),
        "total_echoes": _int(blob.get("totalEchoes")),
        "paradox": _int(blob.get("paradoxUnlocked")),
        "unlocks": len(unlocks) if isinstance(unlocks, list) else _int(blob.get("unlocks_n")),
        "endings": len(endings) if isinstance(endings, list) else _int(blob.get("endings_n")),
    }


def run_summary(blob: dict[str, Any]) -> dict[str, Any]:
    """The dashboard-relevant fields of an unfinished ``RunState`` blob."""
    tally = blob.get("tally")
    floors = tally.get("floors") if isinstance(tally, dict) else blob.get("floors")
    return {
        "archetype": _text(blob.get("archetype"), 32) or "?",
        "act": _int(blob.get("act")),
        "paradox": _int(blob.get("paradox")),
        "hp": _int(blob.get("hp")),
        "max_hp": _int(blob.get("maxHp")),
        "floors": _int(floors),
        "daily": bool(_text(blob.get("daily"), 16)),
    }


class GMStats:
    """Per-process counters of AI GM outcomes (``llm`` / ``fallback`` reasons) by route.

    Cloud Run may run several instances and restarts them, so this is "since this instance started"; the
    durable record is the structured ``v2 gm`` log line."""

    def __init__(self, now: datetime | None = None) -> None:
        self._lock = threading.Lock()
        self._counts: Counter[tuple[str, str]] = Counter()
        self.started_at = now or datetime.now(UTC)

    def record(self, route: str, outcome: str) -> None:
        with self._lock:
            self._counts[(route, outcome)] += 1

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            items = dict(self._counts)
        by_route: dict[str, dict[str, int]] = {}
        for (route, outcome), count in sorted(items.items()):
            by_route.setdefault(route, {})[outcome] = count
        total = sum(items.values())
        llm = sum(c for (_, outcome), c in items.items() if outcome == "llm")
        return {
            "since": _iso(self.started_at),
            "total": total,
            "llm": llm,
            "by_route": by_route,
        }


def _rate(wins: int, losses: int) -> float | None:
    done = wins + losses
    return round(wins / done, 3) if done else None


def _top(counter: Counter[str], limit: int = TOP_ROWS) -> list[dict[str, Any]]:
    return [{"id": key, "count": count} for key, count in counter.most_common(limit)]


@dataclass
class _DayBucket:
    runs: int = 0
    wins: int = 0
    defeats: int = 0
    abandoned: int = 0
    daily_runs: int = 0
    new_players: int = 0
    players: set[str] = field(default_factory=set)
    daily_players: set[str] = field(default_factory=set)


def build_overview(
    players: list[AdminPlayer],
    runs: list[AdminRun],
    daily_rows: list[tuple[date, DailyEntry]],
    gm_usage: list[tuple[date, str, str, int, int, int]],
    *,
    now: datetime,
    days: int,
    server: dict[str, Any],
    gm_price: tuple[float, float] | None = None,
    gm_reports: list[GMReport] | None = None,
) -> dict[str, Any]:
    """The whole dashboard payload. ``runs``/``daily_rows`` are expected to cover the last ``days`` days."""
    days = max(1, min(MAX_DAYS, days))
    today = now.astimezone(KST).date()
    first_day = today - timedelta(days=days - 1)
    day_keys = [first_day + timedelta(days=i) for i in range(days)]
    buckets = {key: _DayBucket() for key in day_keys}

    for p in players:
        if p.first_seen is not None:
            joined = buckets.get(p.first_seen.astimezone(KST).date())
            if joined is not None:
                joined.new_players += 1

    names = {p.player_id: _text(p.profile.get("name"), 16) or "익명" for p in players}
    by_archetype: dict[str, dict[str, Any]] = {}
    killed_by: Counter[str] = Counter()
    deaths_by_act: Counter[str] = Counter()
    endings: Counter[str] = Counter()
    last_run: dict[str, AdminRun] = {}
    finished = {"victory": 0, "defeat": 0, "abandoned": 0}

    for run in sorted(runs, key=lambda r: r.created_at):
        bucket = buckets.get(run.created_at.astimezone(KST).date())
        if bucket is None:
            continue
        bucket.runs += 1
        bucket.players.add(run.player_id)
        if run.daily:
            bucket.daily_runs += 1
            bucket.daily_players.add(run.player_id)
        finished[run.result] += 1
        if run.result == "victory":
            bucket.wins += 1
        elif run.result == "defeat":
            bucket.defeats += 1
            deaths_by_act[str(run.act)] += 1
            if run.killed_by:
                killed_by[run.killed_by] += 1
        else:
            bucket.abandoned += 1
        if run.ending and run.result != "abandoned":
            endings[run.ending] += 1
        stat = by_archetype.setdefault(
            run.archetype, {"runs": 0, "wins": 0, "defeats": 0, "floors": 0}
        )
        stat["runs"] += 1
        stat["floors"] += run.floors
        if run.result == "victory":
            stat["wins"] += 1
        elif run.result == "defeat":
            stat["defeats"] += 1
        last_run[run.player_id] = run

    day_players: dict[date, set[str]] = {}
    boards: dict[str, list[DailyEntry]] = {}
    for day, entry in daily_rows:
        day_players.setdefault(day, set()).add(entry.player_id)
        if day == today:
            boards.setdefault(entry.result.archetype, []).append(entry)

    daily_today = []
    for archetype, entries in sorted(boards.items()):
        ordered = sorted(entries, key=DailyEntry.board_key)
        daily_today.append(
            {
                "archetype": archetype,
                "total": len(ordered),
                "top": [
                    {
                        "rank": rank,
                        "name": entry.name,
                        **entry.result.to_dict(),
                    }
                    for rank, entry in enumerate(ordered[:BOARD_TOP], start=1)
                ],
            }
        )

    def cutoff(hours: float) -> datetime:
        return now - timedelta(hours=hours)

    def active_within(hours: float) -> int:
        edge = cutoff(hours)
        return sum(1 for p in players if p.last_active is not None and p.last_active >= edge)

    signed_in = sum(1 for p in players if p.player_id.startswith("g_"))
    roster = []
    for p in sorted(
        players, key=lambda p: p.last_active or datetime.min.replace(tzinfo=UTC), reverse=True
    ):
        recent = last_run.get(p.player_id)
        roster.append(
            {
                "ref": player_ref(p.player_id),
                "signed_in": p.player_id.startswith("g_"),
                "name": names[p.player_id],
                "last_active": _iso(p.last_active),
                "first_seen": _iso(p.first_seen),
                "runs": _int(p.profile.get("runs")),
                "wins": _int(p.profile.get("wins")),
                "best_act": _int(p.profile.get("best_act")),
                "total_echoes": _int(p.profile.get("total_echoes")),
                "paradox": _int(p.profile.get("paradox")),
                "unlocks": _int(p.profile.get("unlocks")),
                "endings": _int(p.profile.get("endings")),
                "active_run": (
                    {**p.run, "updated_at": _iso(p.run_updated_at)} if p.run is not None else None
                ),
                "last_run": (
                    {
                        "result": recent.result,
                        "archetype": recent.archetype,
                        "act": recent.act,
                        "floors": recent.floors,
                        "ended_at": _iso(recent.created_at),
                        "daily": recent.daily,
                    }
                    if recent is not None
                    else None
                ),
            }
        )

    gm_days: dict[date, dict[str, int]] = {
        key: {"llm": 0, "fallback": 0, "prompt_tokens": 0, "output_tokens": 0} for key in day_keys
    }
    gm_outcomes: Counter[str] = Counter()
    for day, _route, outcome, calls, prompt_tokens, output_tokens in gm_usage:
        if day not in gm_days:
            continue
        gm_days[day]["llm" if outcome == "llm" else "fallback"] += calls
        gm_days[day]["prompt_tokens"] += prompt_tokens
        gm_days[day]["output_tokens"] += output_tokens
        gm_outcomes[outcome] += calls

    def gm_cost(row: dict[str, int]) -> float | None:
        if gm_price is None:
            return None
        return round(
            (row["prompt_tokens"] * gm_price[0] + row["output_tokens"] * gm_price[1]) / 1_000_000, 4
        )

    return {
        "gm_reports": [
            {
                "at": _iso(r.created_at),
                "route": r.route,
                "kind": r.kind,
                "lang": r.lang,
                "text": r.text,
            }
            for r in (gm_reports or [])[:MAX_GM_REPORTS]
        ],
        "generated_at": _iso(now),
        "today": today.isoformat(),
        "days": days,
        "server": server,
        "totals": {
            "players": len(players),
            "signed_in": signed_in,
            "anonymous": len(players) - signed_in,
            "active_24h": active_within(24),
            "active_7d": active_within(24 * 7),
            "active_30d": active_within(24 * 30),
            "new_24h": sum(
                1 for p in players if p.first_seen is not None and p.first_seen >= cutoff(24)
            ),
            "new_7d": sum(
                1 for p in players if p.first_seen is not None and p.first_seen >= cutoff(24 * 7)
            ),
            "with_active_run": sum(1 for p in players if p.run is not None),
            "runs_started": sum(_int(p.profile.get("runs")) for p in players),
            "wins_lifetime": sum(_int(p.profile.get("wins")) for p in players),
            "finished_in_window": sum(finished.values()),
            "victories_in_window": finished["victory"],
            "defeats_in_window": finished["defeat"],
            "abandoned_in_window": finished["abandoned"],
            "win_rate_in_window": _rate(finished["victory"], finished["defeat"]),
        },
        "per_day": [
            {
                "day": key.isoformat(),
                "new_players": b.new_players,
                "runs": b.runs,
                "wins": b.wins,
                "defeats": b.defeats,
                "abandoned": b.abandoned,
                "players": len(b.players),
                "daily_runs": b.daily_runs,
                "daily_players": len(day_players.get(key, set()) | b.daily_players),
            }
            for key, b in buckets.items()
        ],
        "archetypes": sorted(
            (
                {
                    "id": arch,
                    "runs": s["runs"],
                    "wins": s["wins"],
                    "defeats": s["defeats"],
                    "win_rate": _rate(s["wins"], s["defeats"]),
                    "avg_floors": round(s["floors"] / s["runs"], 1) if s["runs"] else 0,
                }
                for arch, s in by_archetype.items()
            ),
            key=lambda row: (-row["runs"], row["id"]),
        ),
        "deaths": {"killed_by": _top(killed_by), "by_act": dict(sorted(deaths_by_act.items()))},
        "endings": _top(endings),
        "gm_daily": [
            {
                "day": key.isoformat(),
                **gm_days[key],
                "total": gm_days[key]["llm"] + gm_days[key]["fallback"],
                "est_cost_usd": gm_cost(gm_days[key]),
            }
            for key in day_keys
        ],
        "gm_outcomes": _top(gm_outcomes, 12),
        "daily_today": daily_today,
        "players": roster,
    }


__all__ = [
    "BOARD_TOP",
    "DEFAULT_DAYS",
    "MAX_DAYS",
    "MAX_GM_REPORTS",
    "MAX_PLAYERS",
    "MAX_RUN_ROWS",
    "AdminPlayer",
    "AdminRun",
    "GMReport",
    "GMStats",
    "build_overview",
    "player_ref",
    "profile_summary",
    "run_from_fields",
    "run_summary",
]
