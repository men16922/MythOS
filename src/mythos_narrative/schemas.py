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

MAX_NARRATION_CHARS = 2200
MAX_VISUAL_BRIEF_CHARS = 700
MAX_CHOICES = 4
ALLOWED_WORLD_DELTA_KEYS = {"stability", "tension", "flags", "clues"}

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

    def as_state_delta(self) -> dict[str, Any]:
        return {
            "stability": self.stability,
            "tension": self.tension,
            "flags": list(self.flags),
            "clues": list(self.clues),
        }


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
    recent_events: list[WorldEvent] = field(default_factory=list)
    memories: list[PlayerMemory] = field(default_factory=list)
    world_memories: list[WorldMemory] = field(default_factory=list)
    narrative_shards: list[NarrativeShard] = field(default_factory=list)
    novelty_notes: list[str] = field(default_factory=list)
    player_action: str | None = None
    validator_feedback: list[str] = field(default_factory=list)
