from __future__ import annotations

from uuid import uuid4


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def new_player_id() -> str:
    return _new_id("player")


def new_loop_id() -> str:
    return _new_id("loop")


def new_scene_id() -> str:
    return _new_id("scene")


def new_event_id() -> str:
    return _new_id("event")


def new_memory_id() -> str:
    return _new_id("memory")


def new_shard_id() -> str:
    return _new_id("shard")


def new_asset_id() -> str:
    return _new_id("asset")
