from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from mythos_core import (
    Choice,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    WorldEvent,
    WorldMemory,
)

MAX_NARRATION_CHARS = 3200
MAX_VISUAL_BRIEF_CHARS = 700
MAX_CHOICES = 4
ALLOWED_WORLD_DELTA_KEYS = {
    "stability",
    "tension",
    "flags",
    "clues",
    "start_combat",
    "spawn_encounters",
    "grant_items",
    "hp",
    "route_nodes",
}

# JSON schema handed to Ollama (structured outputs) so the model is grammar-constrained
# to emit the exact ScenePayload shape on the first try — this removes the costly second
# "repair" LLM round-trip that a free-form json_object response often triggers.
SCENE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "scene": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "location": {"type": "string"},
                "narration": {"type": "string"},
                "visual_brief": {"type": "string"},
                "objective": {"type": ["string", "null"]},
                "action_result": {"type": ["string", "null"]},
                "scene_type": {"type": "string"},
                "choices": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "choice_id": {"type": "string"},
                            "label": {"type": "string"},
                            "intent": {"type": "string"},
                        },
                        "required": ["choice_id", "label", "intent"],
                    },
                },
            },
            "required": ["title", "location", "narration", "visual_brief", "choices"],
        },
        "world_delta": {
            "type": "object",
            "properties": {
                "stability": {"type": "integer"},
                "tension": {"type": "integer"},
                "flags": {"type": "array", "items": {"type": "string"}},
                "clues": {"type": "array", "items": {"type": "object"}},
                "start_combat": {"type": ["string", "null"]},
                "spawn_encounters": {"type": "array", "items": {"type": "string"}},
                "grant_items": {"type": "array", "items": {"type": "string"}},
                "hp": {"type": ["integer", "null"]},
                "route_nodes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "title": {"type": "string"},
                        },
                        "required": ["type"],
                    },
                },
            },
        },
        "end_condition": {"type": ["string", "null"]},
    },
    "required": ["scene"],
}


@dataclass(frozen=True)
class WorldDelta:
    stability: int = 0
    tension: int = 0
    flags: list[str] = field(default_factory=list)
    clues: list[dict[str, Any]] = field(default_factory=list)
    start_combat: str | None = None
    spawn_encounters: list[str] = field(default_factory=list)
    grant_items: list[str] = field(default_factory=list)
    hp: int | None = None
    # Dynamic route map: the Director may propose upcoming destination nodes as
    # ``{"type": <node_type>, "title": <free text>}``. Consumed by
    # ``route_growth.extend_route`` (type-validated there).
    route_nodes: list[dict[str, Any]] = field(default_factory=list)

    def as_state_delta(self) -> dict[str, Any]:
        delta: dict[str, Any] = {
            "stability": self.stability,
            "tension": self.tension,
            "flags": list(self.flags),
            "clues": list(self.clues),
        }
        if self.start_combat:
            delta["start_combat"] = self.start_combat
        if self.spawn_encounters:
            delta["spawn_encounters"] = list(self.spawn_encounters)
        if self.grant_items:
            delta["grant_items"] = list(self.grant_items)
        if self.hp is not None:
            delta["hp"] = self.hp
        if self.route_nodes:
            delta["route_nodes"] = [dict(n) for n in self.route_nodes]
        return delta


@dataclass(frozen=True)
class ScenePayload:
    title: str
    location: str
    narration: str
    choices: list[Choice]
    visual_brief: str
    world_delta: WorldDelta = field(default_factory=WorldDelta)
    end_condition: str | None = None
    objective: str | None = None
    action_result: str | None = None
    scene_type: str = "static"
    requested_next_phase: str | None = None


@dataclass(frozen=True)
class NarrativeContext:
    player: PlayerProfile
    loop: LoopState
    turn_index: int
    recent_events: list[WorldEvent]
    memories: list[PlayerMemory] = field(default_factory=list)
    world_memories: list[WorldMemory] = field(default_factory=list)
    narrative_shards: list[NarrativeShard] = field(default_factory=list)
    novelty_notes: list[str] = field(default_factory=list)
    # Continuity-critical "story so far" synopsis + previous-scene prose + anti-repeat
    # directives. Kept separate from novelty_notes so the prompt renders it in full
    # (novelty_notes is truncated to MAX_PROMPT_NOTES; the synopsis must never be).
    session_synopsis: list[str] = field(default_factory=list)
    player_action: str | None = None
    validator_feedback: list[str] = field(default_factory=list)
    system_prompt: str = ""
    fast_mode: bool = False
    # Optional scenario-authored fallback scene (serialized FallbackScene from
    # mythos_runtime.scenario_directives). When present, director._fallback_payload
    # builds the deterministic fallback from this instead of the hardcoded shared
    # default — keeping scenario-specific prose in the prompt layer. None → the
    # shared code default (mythos_narrative.fallbacks) is used, so constructors and
    # tests that omit it are unaffected.
    fallback_scene: dict[str, Any] | None = None
    # Target output language for narrative generation ("ko" | "en"). S0 threads this
    # end-to-end (RuntimeOptions → session → here → prompt builders); the EN system
    # prompts / authored content land in S1, so today both languages render Korean
    # (behavior-preserving). See bin/docs/plans/2026-06-27-en-ko-localization.md.
    language: str = "ko"
    # True on story turns that carry authored/high-impact beats (opening prologue,
    # anchor-node locks, companion cutscenes, boss confrontation, ending phases).
    # When the provider config sets a `keybeat_model` (GEMINI_MODEL_KEYBEAT), the
    # director generates THESE turns on that model and normal turns on the base
    # model — the ~$0.5/loop cost alternative to running 3.5-flash everywhere
    # (bin/docs/plans/2026-07-04-gemini-2.5-vs-3.5-eval.md). Default False = single model.
    key_beat: bool = False
