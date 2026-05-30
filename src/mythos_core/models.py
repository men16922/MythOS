from __future__ import annotations

from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, TypeVar, get_args, get_origin, get_type_hints


class LoopPhase(StrEnum):
    CONNECT = "connect"
    EXPLORE = "explore"
    INTERACT = "interact"
    REWRITE = "rewrite"
    ARCHIVE = "archive"
    ENDED = "ended"


class Actor(StrEnum):
    PLAYER = "player"
    SYSTEM = "system"
    NPC = "npc"
    WORLD = "world"


@dataclass(frozen=True)
class PlayerProfile:
    player_id: str
    display_name: str
    created_at: datetime
    updated_at: datetime
    traits: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Echo:
    echo_id: str
    source_loop_id: str
    source_event_id: str
    symbol: str
    text: str
    weight: float = 1.0


@dataclass(frozen=True)
class LoopState:
    loop_id: str
    player_id: str
    seed: str
    phase: LoopPhase
    location_id: str
    stability: int
    tension: int
    started_at: datetime
    ended_at: datetime | None = None
    state: dict[str, Any] = field(default_factory=dict)
    active_echoes: list[Echo] = field(default_factory=list)


@dataclass(frozen=True)
class Choice:
    choice_id: str
    label: str
    intent: str


@dataclass(frozen=True)
class Scene:
    scene_id: str
    loop_id: str
    turn_index: int
    title: str
    location: str
    narration: str
    choices: list[Choice]
    visual_brief: str | None
    created_at: datetime
    objective: str | None = None
    action_result: str | None = None
    scene_type: str = "static"


@dataclass(frozen=True)
class WorldEvent:
    event_id: str
    loop_id: str
    turn_index: int
    actor: Actor
    action: str
    result: str | None
    state_delta: dict[str, Any]
    created_at: datetime


@dataclass(frozen=True)
class PlayerMemory:
    memory_id: str
    player_id: str
    kind: str
    content: dict[str, Any]
    weight: float
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class WorldMemory:
    memory_id: str
    world_id: str
    kind: str
    content: dict[str, Any]
    weight: float
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class NarrativeShard:
    shard_id: str
    loop_id: str
    player_id: str
    symbol: str
    emotional_tone: str
    text: str
    weight: float
    created_at: datetime
    kind: str = "general"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AssetRecord:
    asset_id: str
    scene_id: str | None
    loop_id: str
    provider: str
    model_id: str
    prompt: str
    seed: int
    width: int
    height: int
    steps: int
    storage_uri: str
    metadata: dict[str, Any]
    created_at: datetime
    # Async visual jobs move through pending -> processing -> succeeded/failed.
    # Persisted inside `metadata["status"]` (no dedicated column); see postgres_store.
    status: str = "succeeded"


ModelT = TypeVar("ModelT")


def to_json_dict(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat()
    if isinstance(value, StrEnum):
        return value.value
    if is_dataclass(value) and not isinstance(value, type):
        return {key: to_json_dict(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [to_json_dict(item) for item in value]
    if isinstance(value, dict):
        return {key: to_json_dict(item) for key, item in value.items()}
    return value


def from_json_dict(model_type: type[ModelT], data: dict[str, Any]) -> ModelT:
    type_hints = get_type_hints(model_type)
    kwargs = {}
    for name, field_info in model_type.__dataclass_fields__.items():  # type: ignore[attr-defined]
        if name not in data:
            continue
        kwargs[name] = _coerce_value(type_hints.get(name, field_info.type), data[name])
    return model_type(**kwargs)


def _coerce_value(annotation: Any, value: Any) -> Any:
    if value is None:
        return None

    origin = get_origin(annotation)
    args = get_args(annotation)

    if origin is list and args:
        return [_coerce_value(args[0], item) for item in value]

    if origin is dict:
        return value

    if origin is None and isinstance(annotation, type):
        if annotation is datetime:
            parsed = datetime.fromisoformat(value)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        if issubclass(annotation, StrEnum):
            return annotation(value)
        if is_dataclass(annotation):
            return from_json_dict(annotation, value)

    if origin is not None and type(None) in args:
        inner = next(arg for arg in args if arg is not type(None))
        return _coerce_value(inner, value)

    return value
