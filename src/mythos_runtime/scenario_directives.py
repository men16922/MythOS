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
    """One ``## ...`` block: an id, inline header params, metadata, and a prose body.

    Header params may carry a *node address* (``node=`` and/or ``beat=``) so a
    directive block can be bound to a route node / authored beat — the prereq for
    locking cutscenes and route anchors to a specific point in the run (the same
    lock envelope the opening uses, applied uniformly; see ``docs/PROMPT_LAYER.md`` §3).
    """

    block_id: str
    params: dict[str, str]
    meta: dict[str, str]
    body: str

    @property
    def node(self) -> str | None:
        """Route-node address from the ``node=`` header param (``None`` if absent)."""
        value = self.params.get("node")
        return value or None

    @property
    def beat(self) -> str | None:
        """Authored-beat address from the ``beat=`` header param (``None`` if absent)."""
        value = self.params.get("beat")
        return value or None


@dataclass(frozen=True)
class ParsedDirectives:
    file_meta: dict[str, str]
    blocks: list[DirectiveBlock]

    def block_for_node(self, node_id: str) -> DirectiveBlock | None:
        """First block addressed to ``node=<node_id>`` (``None`` if none match)."""
        return next((b for b in self.blocks if b.node == node_id), None)

    def block_for_beat(self, beat_id: str) -> DirectiveBlock | None:
        """First block addressed to ``beat=<beat_id>`` (``None`` if none match)."""
        return next((b for b in self.blocks if b.beat == beat_id), None)


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
    # Optional node address (``node=``/``beat=`` header params): binds this scripted
    # beat to a route node / authored beat so its lock envelope can be applied there
    # too. ``None`` for turn-only opening beats (the current neo-seoul opening).
    node: str | None = None
    beat: str | None = None


@dataclass(frozen=True)
class StatVoiceProfile:
    """One stat's Disco-Elysium-style inner-voice description (``name`` + ``voice`` prose)."""

    name: str
    voice: str


@dataclass(frozen=True)
class StatVoices:
    """Stat-based inner-monologue directive prose (directives/stat_voices.md).

    ``header`` is the section banner; ``max_template`` / ``min_template`` are
    ``fill_placeholders`` templates (``{name}``/``{value}``/``{voice}``/``{name_first}``);
    ``descriptions`` maps each stat id to its voice profile. The min/max *selection*
    logic stays in ``scenario_context`` — this object carries only the prose.
    """

    header: str
    max_template: str
    min_template: str
    descriptions: dict[str, StatVoiceProfile]


@dataclass(frozen=True)
class Encounters:
    """Travel / emergency encounter directive prose (directives/encounters.md).

    ``*_template`` are ``fill_placeholders`` templates; the *gating* logic — which
    action keywords count as travel, and the stability/tension thresholds that fire an
    emergency — STAYS in ``scenario_context``. This object carries only the prose.

    - ``travel_header`` / ``travel_template`` — fired when the player declares a travel
      action. Template tokens: ``{player_action}``/``{decay_pct}``/``{stability}``/``{tension}``.
    - ``emergency_header`` — banner emitted once when any resource crosses its threshold.
    - ``emergency_low_stability_template`` (token ``{stability}``) — low-stability crisis.
    - ``emergency_high_tension_template`` (token ``{tension}``) — high-tension pursuit.
    """

    travel_header: str
    travel_template: str
    emergency_header: str
    emergency_low_stability_template: str
    emergency_high_tension_template: str


@dataclass(frozen=True)
class CutsceneDirective:
    """One companion cutscene unlocked by affection + flags (directives/companions/<name>.md).

    A cutscene is an authored beat (curated ``image`` + script ``body``) gated by a
    deterministic threshold: ``state["relationships"][companion] >= affection`` and
    ``flags`` ⊆ the run's accumulated flags. Unlock evaluation lives in
    ``mythos_runtime.cutscenes`` (pure); persistence/gallery exposure is meta progression.
    """

    cutscene_id: str
    companion: str
    affection: int
    flags: list[str]
    image: str
    title: str
    body: str


@dataclass(frozen=True)
class RouteBeatDirective:
    """One authored lock envelope for a route beat (``directives/side_arcs.md``).

    Route mechanics decide *whether/when* the beat is entered. This object carries
    only authored scene constraints and prose, addressed by stable ``beat=`` id.
    """

    directive_id: str
    beat: str
    location_lock: str
    mandatory_event: str
    forbidden: str
    body: str


@dataclass(frozen=True)
class ScenarioDirectives:
    scenario_id: str
    opening_header: str = ""
    opening_max_turn: int = 4
    opening_beats: list[OpeningBeat] = field(default_factory=list)
    # Scenario-authored deterministic fallback scene (directives/fallback.md),
    # mapped to the DEFAULT_FALLBACK dict shape (minus the parser "repair" sub-dict).
    # None when the scenario ships no fallback.md → callers use the code default.
    fallback_scene: dict[str, Any] | None = None
    # Scenario-authored proper-noun / register rule (directives/naming.md), injected
    # verbatim into the GM notes. Empty when the scenario ships no naming.md → no rule
    # (preserves prior behavior, where only neo-seoul received NEO_SEOUL_NAMING_RULE).
    naming_rule: str = ""
    # Scenario-authored stat-voice prose (directives/stat_voices.md). None when the
    # scenario ships no stat_voices.md → callers fall back to the generic code default
    # (DEFAULT_STAT_VOICES), so a scenario without one keeps the prior shared behavior.
    stat_voices: StatVoices | None = None
    # Scenario-authored travel/emergency encounter prose (directives/encounters.md).
    # None when the scenario ships no encounters.md → callers fall back to the generic
    # code default (DEFAULT_ENCOUNTERS); this prose was previously shared by every
    # scenario, so a scenario without one keeps the prior behavior.
    encounters: Encounters | None = None
    # Phase 5: scenario-authored few-shot snippets for the storyteller system prompt
    # (directives/story_examples.md), keyed by stable snippet id (choice_examples/
    # grounding/texture). None when the scenario ships no story_examples.md → the code
    # defaults in mythos_narrative.prompts.STORY_EXAMPLE_DEFAULTS render (prior behavior).
    story_examples: dict[str, str] | None = None
    # Companion cutscenes (directives/companions/<name>.md), flat across all companions
    # (each carries its own ``companion`` id). Empty when no companions/ folder is
    # shipped. Unlock evaluation is in ``mythos_runtime.cutscenes``.
    cutscenes: list[CutsceneDirective] = field(default_factory=list)
    # Route-beat lock envelopes (currently side anchors), addressed by stable
    # scenario ``beat`` ids and injected only on the beat's first scene.
    route_header: str = ""
    route_beats: list[RouteBeatDirective] = field(default_factory=list)

    @property
    def empty(self) -> bool:
        return not self.opening_beats

    def cutscene(self, cutscene_id: str) -> CutsceneDirective | None:
        return next((c for c in self.cutscenes if c.cutscene_id == cutscene_id), None)

    def route_beat(self, beat_id: str) -> RouteBeatDirective | None:
        return next((beat for beat in self.route_beats if beat.beat == beat_id), None)

    def opening_beat(self, turn: int) -> OpeningBeat | None:
        return next((b for b in self.opening_beats if b.turn == turn), None)

    def opening_beat_for_node(self, node_id: str) -> OpeningBeat | None:
        """Opening beat bound to ``node=<node_id>`` (``None`` if none addressed there)."""
        return next((b for b in self.opening_beats if b.node == node_id), None)

    def opening_beat_for_beat(self, beat_id: str) -> OpeningBeat | None:
        """Opening beat bound to ``beat=<beat_id>`` (``None`` if none addressed there)."""
        return next((b for b in self.opening_beats if b.beat == beat_id), None)


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
    # `or 4` would swallow an authored `max_turn: 0` (1-cut re-entry variants).
    _parsed_max_turn = _int_or_none(parsed.file_meta.get("max_turn"))
    max_turn = 4 if _parsed_max_turn is None else _parsed_max_turn
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
                node=block.node,
                beat=block.beat,
            )
        )
    beats.sort(key=lambda b: b.turn)
    return header, max_turn, beats


# Scalar fallback fields carried as file-level meta (no embedded newlines).
_FALLBACK_META_KEYS = (
    "title_default",
    "title_novelty",
    "title_with_action",
    "location",
    "objective_turn0",
)


def _fallback_from_parsed(parsed: ParsedDirectives) -> dict[str, Any] | None:
    """Map a parsed ``fallback.md`` into the ``DEFAULT_FALLBACK`` dict shape.

    The director consumes scalar prose, two novelty hints, and an ordered choice
    list (suffix/label/intent). The Markdown body parser strips each block, so the
    leading space the novelty hints need (they are concatenated right after a
    narration) is re-added here. Returns ``None`` for an empty document so a
    scenario without authored fallback prose keeps the code default.
    """
    if not parsed.file_meta and not parsed.blocks:
        return None
    fb: dict[str, Any] = {}
    for key in _FALLBACK_META_KEYS:
        if key in parsed.file_meta:
            fb[key] = parsed.file_meta[key]
    choices: list[dict[str, str]] = []
    for block in parsed.blocks:
        if block.block_id in ("narration_no_action", "narration_with_action", "visual_brief"):
            fb[block.block_id] = block.body
        elif block.block_id == "novelty_hint":
            variant = block.params.get("variant", "")
            # Hints are appended directly after a narration → carry one leading space.
            fb[f"novelty_hint_{variant}"] = " " + block.body
        elif block.block_id == "choice":
            choices.append(
                {
                    "suffix": block.params.get("suffix", ""),
                    "label": block.body,
                    "intent": block.params.get("intent", "explore"),
                }
            )
    if choices:
        fb["choices"] = choices
    return fb


def _stat_voices_from_parsed(parsed: ParsedDirectives) -> StatVoices | None:
    """Map a parsed ``stat_voices.md`` into a ``StatVoices`` (``None`` if empty).

    ``header`` is a file-level meta scalar; each ``## stat (id=...)`` block carries a
    ``name`` meta line and the voice prose as its body; ``## max_template`` /
    ``## min_template`` blocks carry the placeholder templates as their bodies.
    """
    if not parsed.file_meta and not parsed.blocks:
        return None
    header = parsed.file_meta.get("header", "")
    descriptions: dict[str, StatVoiceProfile] = {}
    max_template = ""
    min_template = ""
    for block in parsed.blocks:
        if block.block_id == "stat":
            stat_id = block.params.get("id", "")
            if stat_id:
                descriptions[stat_id] = StatVoiceProfile(
                    name=block.meta.get("name", ""),
                    voice=block.body,
                )
        elif block.block_id == "max_template":
            max_template = block.body
        elif block.block_id == "min_template":
            min_template = block.body
    if not descriptions and not max_template and not min_template:
        return None
    return StatVoices(
        header=header,
        max_template=max_template,
        min_template=min_template,
        descriptions=descriptions,
    )


def _encounters_from_parsed(parsed: ParsedDirectives) -> Encounters | None:
    """Map a parsed ``encounters.md`` into an ``Encounters`` (``None`` if empty).

    ``travel_header`` / ``emergency_header`` are file-level meta scalars; the three
    prose templates are ``## travel_template`` / ``## emergency_low_stability`` /
    ``## emergency_high_tension`` block bodies.
    """
    if not parsed.file_meta and not parsed.blocks:
        return None
    travel_template = ""
    emergency_low = ""
    emergency_high = ""
    for block in parsed.blocks:
        if block.block_id == "travel_template":
            travel_template = block.body
        elif block.block_id == "emergency_low_stability":
            emergency_low = block.body
        elif block.block_id == "emergency_high_tension":
            emergency_high = block.body
    if not (travel_template or emergency_low or emergency_high):
        return None
    return Encounters(
        travel_header=parsed.file_meta.get("travel_header", ""),
        travel_template=travel_template,
        emergency_header=parsed.file_meta.get("emergency_header", ""),
        emergency_low_stability_template=emergency_low,
        emergency_high_tension_template=emergency_high,
    )


# Phase 5: stable snippet ids the storyteller system prompt can swap. Unknown block
# ids in story_examples.md are ignored (forward-compatible; prompts.py only replaces
# keys it knows).
_STORY_EXAMPLE_KEYS = ("choice_examples", "grounding", "texture")


def _story_examples_from_parsed(parsed: ParsedDirectives) -> dict[str, str] | None:
    """Map a parsed ``story_examples.md`` into snippet-id → prose (``None`` if empty).

    Each ``## <snippet_id>`` block body is one few-shot snippet for the storyteller
    system prompt (``mythos_narrative.prompts.STORY_EXAMPLE_DEFAULTS`` documents the
    ids and holds the code defaults / byte-parity anchors).
    """
    out = {
        block.block_id: block.body
        for block in parsed.blocks
        if block.block_id in _STORY_EXAMPLE_KEYS and block.body
    }
    return out or None


def _cutscenes_from_parsed(parsed: ParsedDirectives, default_companion: str) -> list[CutsceneDirective]:
    """Map a parsed ``companions/<name>.md`` into ``CutsceneDirective``s.

    The companion id comes from the ``companion:`` file-meta (falling back to the
    file stem, ``default_companion``). Each ``## <CUT_ID> (affection=N, flags=a,b,
    image=...)`` block is one cutscene; its ``title:`` meta and prose body carry the
    viewer content. Blocks without a positive ``affection`` are skipped (a cutscene
    must have a reachable threshold).
    """
    companion = parsed.file_meta.get("companion", "").strip() or default_companion
    out: list[CutsceneDirective] = []
    for block in parsed.blocks:
        affection = _int_or_none(block.params.get("affection"))
        if affection is None or affection <= 0:
            continue
        out.append(
            CutsceneDirective(
                cutscene_id=block.block_id,
                companion=companion,
                affection=affection,
                flags=_str_list(block.params.get("flags")),
                image=block.params.get("image", "").strip(),
                title=block.meta.get("title", block.block_id),
                body=block.body,
            )
        )
    return out


def _route_beats_from_parsed(parsed: ParsedDirectives) -> tuple[str, list[RouteBeatDirective]]:
    """Map beat-addressed blocks into route lock envelopes.

    Blocks without ``beat=`` are ignored: unlike opening directives, route locks
    have no turn fallback and must bind to a stable scenario address.
    """
    out: list[RouteBeatDirective] = []
    for block in parsed.blocks:
        beat = (block.beat or "").strip()
        if not beat:
            continue
        out.append(
            RouteBeatDirective(
                directive_id=block.block_id,
                beat=beat,
                location_lock=block.meta.get("location_lock", ""),
                mandatory_event=block.meta.get("mandatory_event", ""),
                forbidden=block.meta.get("forbidden", ""),
                body=block.body,
            )
        )
    return parsed.file_meta.get("header", ""), out


def _naming_from_parsed(parsed: ParsedDirectives) -> str:
    """Return the naming/register rule prose (the ``## naming`` block body).

    Empty string when the document is absent or has no ``naming`` block, so a
    scenario without authored naming prose receives no rule.
    """
    block = next((b for b in parsed.blocks if b.block_id == "naming"), None)
    return block.body if block is not None else ""


# Languages a ``<name>.<lang>.md`` directive file may be sharded into. Used both to
# resolve a localized variant and to recognize/strip the suffix on companion files so a
# language-suffixed file is never double-counted by the ``*.md`` glob.
_KNOWN_LANGS = ("en", "ko")


def _directive_path(base: Any, stem: str, language: str) -> Any | None:
    """Resolve ``<stem>.<language>.md`` if present, else the unsuffixed ``<stem>.md``.

    The unsuffixed file is the Korean original (no renames needed), so ``language="ko"``
    reproduces the prior behavior exactly and ``language="en"`` gracefully falls back to
    Korean for any directive that has no ``.en.md`` yet (per localization plan §7.2).
    Returns ``None`` when neither exists.
    """
    localized = base / f"{stem}.{language}.md"
    if localized.exists():
        return localized
    plain = base / f"{stem}.md"
    return plain if plain.exists() else None


def _companion_base_stem(stem: str) -> str:
    """Strip a trailing ``.<lang>`` from a companion file stem (``se_rin.en`` → ``se_rin``)."""
    head, _sep, tail = stem.rpartition(".")
    return head if head and tail in _KNOWN_LANGS else stem


@lru_cache(maxsize=8)
def available_opening_variants(scenario_id: str) -> frozenset[str]:
    """Variant ids with an authored ``opening_<id>.md`` (language suffixes ignored).

    E.g. ``opening_kai.md``/``opening_kai.en.md`` → ``"kai"``. Empty when the
    scenario authors no variants — the caller then always runs the default
    ``opening.md`` (backward compatible; glass-library etc. are unaffected).
    """
    base = PROJECT_ROOT / "resources" / scenario_id / "directives"
    if not base.exists():
        return frozenset()
    variants: set[str] = set()
    for path in base.glob("opening_*.md"):
        stem = _companion_base_stem(path.stem)
        variants.add(stem[len("opening_") :])
    return frozenset(variants)


@lru_cache(maxsize=32)
def load_scenario_directives(
    scenario_id: str, language: str = "ko", opening_variant: str | None = None
) -> ScenarioDirectives:
    """Load ``resources/<scenario>/directives/*.md`` into a ``ScenarioDirectives``.

    Each directive prefers its ``<name>.<language>.md`` variant and falls back to the
    unsuffixed (Korean) ``<name>.md`` (see ``_directive_path``); ``language`` defaults to
    ``"ko"`` so existing callers are unchanged. Returns an empty object when the folder/
    files are absent (the call sites then fall back to their prior hardcoded behavior).
    Mirrors ``load_story_bible``. Cache key includes ``language``.

    ``opening_variant`` (B2 Loop2+ opening variants) swaps ONLY the opening doc for
    ``opening_<variant>.md`` when that file exists; every other directive (fallback/
    naming/stat_voices/encounters/companions/…) is variant-independent. ``None``/
    ``"default"``/unknown ids resolve to the standard ``opening.md``.
    """
    base = PROJECT_ROOT / "resources" / scenario_id / "directives"
    opening_header: str = ""
    opening_max_turn: int = 4
    opening_beats: list[OpeningBeat] = []
    fallback_scene: dict[str, Any] | None = None
    naming_rule: str = ""
    stat_voices: StatVoices | None = None
    encounters: Encounters | None = None
    route_header: str = ""
    route_beats: list[RouteBeatDirective] = []

    opening_stem = "opening"
    if opening_variant and opening_variant != "default":
        if opening_variant in available_opening_variants(scenario_id):
            opening_stem = f"opening_{opening_variant}"
    opening_path = _directive_path(base, opening_stem, language)
    if opening_path is not None:
        with open(opening_path, encoding="utf-8") as f:
            parsed = parse_directives_markdown(f.read())
        opening_header, opening_max_turn, opening_beats = _opening_from_parsed(parsed)

    fallback_path = _directive_path(base, "fallback", language)
    if fallback_path is not None:
        with open(fallback_path, encoding="utf-8") as f:
            fallback_scene = _fallback_from_parsed(parse_directives_markdown(f.read()))

    naming_path = _directive_path(base, "naming", language)
    if naming_path is not None:
        with open(naming_path, encoding="utf-8") as f:
            naming_rule = _naming_from_parsed(parse_directives_markdown(f.read()))

    stat_voices_path = _directive_path(base, "stat_voices", language)
    if stat_voices_path is not None:
        with open(stat_voices_path, encoding="utf-8") as f:
            stat_voices = _stat_voices_from_parsed(parse_directives_markdown(f.read()))

    encounters_path = _directive_path(base, "encounters", language)
    if encounters_path is not None:
        with open(encounters_path, encoding="utf-8") as f:
            encounters = _encounters_from_parsed(parse_directives_markdown(f.read()))

    story_examples: dict[str, str] | None = None
    story_examples_path = _directive_path(base, "story_examples", language)
    if story_examples_path is not None:
        with open(story_examples_path, encoding="utf-8") as f:
            story_examples = _story_examples_from_parsed(parse_directives_markdown(f.read()))

    side_arcs_path = _directive_path(base, "side_arcs", language)
    if side_arcs_path is not None:
        with open(side_arcs_path, encoding="utf-8") as f:
            route_header, route_beats = _route_beats_from_parsed(
                parse_directives_markdown(f.read())
            )

    cutscenes: list[CutsceneDirective] = []
    companions_dir = base / "companions"
    if companions_dir.is_dir():
        # Dedupe by base companion stem so a `<name>.<lang>.md` variant doesn't get
        # parsed alongside its `<name>.md` original; resolve each via _directive_path.
        seen: set[str] = set()
        for path in sorted(companions_dir.glob("*.md")):
            base_stem = _companion_base_stem(path.stem)
            if base_stem in seen:
                continue
            seen.add(base_stem)
            resolved = _directive_path(companions_dir, base_stem, language)
            if resolved is None:
                continue
            with open(resolved, encoding="utf-8") as f:
                parsed = parse_directives_markdown(f.read())
            cutscenes.extend(_cutscenes_from_parsed(parsed, default_companion=base_stem))

    return ScenarioDirectives(
        scenario_id=scenario_id,
        opening_header=opening_header,
        opening_max_turn=opening_max_turn,
        opening_beats=opening_beats,
        fallback_scene=fallback_scene,
        naming_rule=naming_rule,
        stat_voices=stat_voices,
        encounters=encounters,
        story_examples=story_examples,
        cutscenes=cutscenes,
        route_header=route_header,
        route_beats=route_beats,
    )


__all__ = [
    "CutsceneDirective",
    "DirectiveBlock",
    "Encounters",
    "OpeningBeat",
    "ParsedDirectives",
    "RouteBeatDirective",
    "ScenarioDirectives",
    "StatVoiceProfile",
    "StatVoices",
    "fill_placeholders",
    "load_scenario_directives",
    "parse_directives_markdown",
]
