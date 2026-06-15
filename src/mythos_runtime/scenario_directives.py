"""Scenario-authored GM directives (the *prompt layer*), loaded from Markdown.

The narrative pipeline's per-turn GM directives split into two layers:

- **Code layer (invariant)** — assembly logic that STAYS in Python: prompt gating,
  the ``session_synopsis`` full-render channel, ``MAX_PROMPT_NOTES`` truncation,
  route/junction note assembly, the JSON/format contract.
- **Prompt layer (authored, dynamic)** — the scenario-specific directive *prose*
  (opening beats, fallback scene, naming/register rules, stat-voice monologues).
  This used to be hardcoded inside ``scenario_context.py`` / ``director.py`` /
  ``parser.py``; it now lives here, in ``resources/<scenario>/directives/*.md``,
  so tuning a directive means editing one Markdown file — not logic code.

This module is the loader (mirrors ``story_bible.py``): a frozen ``ScenarioDirectives``
plus an ``lru_cache``-d ``load_scenario_directives()`` that returns an empty object
when a scenario declares no ``directives/`` folder (graceful — preserves the prior
hardcoded-default behavior at the call sites).

### Markdown format

A directive file is a sequence of ``##`` blocks. File-level ``key: value`` lines may
precede the first block. Each block is::

    ## <BLOCK_ID> (param=value, param=value)
    meta_key: meta value
    other_key: other value
    ---
    free-form prose body (may span many lines, may contain {placeholders})

``parse_directives_markdown()`` is pure (string in, structured out) so it is unit
testable without touching the filesystem.
"""

from __future__ import annotations

import re
import string
from collections import defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from mythos_runtime.scenario import PROJECT_ROOT

# --- Markdown parsing -------------------------------------------------------

_HEADER_RE = re.compile(r"^##\s+(?P<id>[^\s(]+)\s*(?:\((?P<params>.*)\))?\s*$")


@dataclass(frozen=True)
class DirectiveBlock:
    """One ``## ...`` block: an id, inline header params, metadata, and a prose body."""

    block_id: str
    params: dict[str, str]
    meta: dict[str, str]
    body: str


@dataclass(frozen=True)
class ParsedDirectives:
    file_meta: dict[str, str]
    blocks: list[DirectiveBlock]


def parse_directives_markdown(text: str) -> ParsedDirectives:
    """Parse a directives Markdown document into file-level meta + blocks (pure)."""
    file_meta: dict[str, str] = {}
    blocks: list[DirectiveBlock] = []

    # Split on block headers, keeping the preamble (file_meta) as element 0.
    cur_id: str | None = None
    cur_params: dict[str, str] = {}
    meta_lines: list[str] = []
    body_lines: list[str] = []
    in_body = False

    def _flush() -> None:
        if cur_id is None:
            return
        blocks.append(
            DirectiveBlock(
                block_id=cur_id,
                params=dict(cur_params),
                meta=_parse_meta(meta_lines),
                body="\n".join(body_lines).strip(),
            )
        )

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        header = _HEADER_RE.match(line)
        if header:
            _flush()
            cur_id = header.group("id")
            cur_params = _parse_params(header.group("params"))
            meta_lines, body_lines, in_body = [], [], False
            continue
        if cur_id is None:
            # Preamble: file-level "key: value", ignore "# Title" and blanks.
            if line.startswith("#") or not line.strip():
                continue
            key, sep, value = line.partition(":")
            if sep:
                file_meta[key.strip()] = value.strip()
            continue
        if line.strip() == "---" and not in_body:
            in_body = True
            continue
        (body_lines if in_body else meta_lines).append(raw_line)

    _flush()
    return ParsedDirectives(file_meta=file_meta, blocks=blocks)


def _parse_params(raw: str | None) -> dict[str, str]:
    out: dict[str, str] = {}
    if not raw:
        return out
    for part in raw.split(","):
        key, sep, value = part.partition("=")
        if sep:
            out[key.strip()] = value.strip()
    return out


def _parse_meta(lines: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in lines:
        if not line.strip():
            continue
        key, sep, value = line.partition(":")
        if sep:
            out[key.strip()] = value.strip()
    return out


# --- Safe placeholder substitution ------------------------------------------


class _SafeDict(defaultdict):
    def __missing__(self, key: str) -> str:  # leave unknown {tokens} literal
        return "{" + key + "}"


def fill_placeholders(template: str, values: dict[str, Any]) -> str:
    """``str.format``-style substitution that leaves unknown ``{tokens}`` literal.

    An authored typo (``{playr_action}``) degrades to literal text instead of
    raising inside the prompt-building hot path.
    """
    safe = _SafeDict(str)
    safe.update({k: ("" if v is None else str(v)) for k, v in values.items()})
    try:
        return string.Formatter().vformat(template, (), safe)
    except (IndexError, ValueError):
        # Malformed braces in authored prose: return as-is rather than crash.
        return template


# --- Typed directive content ------------------------------------------------


@dataclass(frozen=True)
class OpeningBeat:
    """One turn of the scripted opening prologue.

    ``body`` is the full authored directive prose (with ``{placeholders}``) that the
    assembler emits. ``location_lock`` / ``mandatory_event`` / ``forbidden`` are the
    structured summary (searchable, and reused by WS-B to lock route anchors).
    """

    turn: int
    beat_id: str
    label: str
    shot_ref: int | None
    location_lock: str
    mandatory_event: str
    forbidden: str
    flags: list[str]
    start_combat: str | None
    body: str


@dataclass(frozen=True)
class ScenarioDirectives:
    scenario_id: str
    opening_header: str = ""
    opening_max_turn: int = 4
    opening_beats: list[OpeningBeat] = field(default_factory=list)

    @property
    def empty(self) -> bool:
        return not self.opening_beats

    def opening_beat(self, turn: int) -> OpeningBeat | None:
        return next((b for b in self.opening_beats if b.turn == turn), None)


def _int_or_none(value: str | None) -> int | None:
    if value is None or not str(value).strip():
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _str_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _opening_from_parsed(parsed: ParsedDirectives) -> tuple[str, int, list[OpeningBeat]]:
    header = parsed.file_meta.get("header", "")
    max_turn = _int_or_none(parsed.file_meta.get("max_turn")) or 4
    beats: list[OpeningBeat] = []
    for block in parsed.blocks:
        turn = _int_or_none(block.params.get("turn"))
        if turn is None:
            continue
        start_combat = block.meta.get("start_combat") or None
        beats.append(
            OpeningBeat(
                turn=turn,
                beat_id=block.block_id,
                label=block.params.get("label", block.block_id),
                shot_ref=_int_or_none(block.params.get("shot")),
                location_lock=block.meta.get("location_lock", ""),
                mandatory_event=block.meta.get("mandatory_event", ""),
                forbidden=block.meta.get("forbidden", ""),
                flags=_str_list(block.meta.get("flags")),
                start_combat=start_combat if start_combat else None,
                body=block.body,
            )
        )
    beats.sort(key=lambda b: b.turn)
    return header, max_turn, beats


@lru_cache(maxsize=16)
def load_scenario_directives(scenario_id: str) -> ScenarioDirectives:
    """Load ``resources/<scenario>/directives/*.md`` into a ``ScenarioDirectives``.

    Returns an empty object when the folder/files are absent (the call sites then
    fall back to their prior hardcoded behavior). Mirrors ``load_story_bible``.
    """
    base = PROJECT_ROOT / "resources" / scenario_id / "directives"
    opening_header: str = ""
    opening_max_turn: int = 4
    opening_beats: list[OpeningBeat] = []

    opening_path = base / "opening.md"
    if opening_path.exists():
        with open(opening_path, encoding="utf-8") as f:
            parsed = parse_directives_markdown(f.read())
        opening_header, opening_max_turn, opening_beats = _opening_from_parsed(parsed)

    return ScenarioDirectives(
        scenario_id=scenario_id,
        opening_header=opening_header,
        opening_max_turn=opening_max_turn,
        opening_beats=opening_beats,
    )


__all__ = [
    "DirectiveBlock",
    "OpeningBeat",
    "ParsedDirectives",
    "ScenarioDirectives",
    "fill_placeholders",
    "load_scenario_directives",
    "parse_directives_markdown",
]
