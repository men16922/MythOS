"""JSON serializers mapping runtime DTOs to the REST contract.

The frontend consumes a stable `RuntimeSnapshot` JSON shape (design §3.1).
We lean on `mythos_core.to_json_dict` for faithful recursive serialization
of the frozen dataclasses and only reshape the top level for client
convenience (flattened scene, explicit loop fields).
"""

from __future__ import annotations

from typing import Any, cast

from mythos_core import PlayerProfile
from mythos_core.models import to_json_dict
from mythos_runtime.options import RuntimeSnapshot


def player_to_dict(player: PlayerProfile) -> dict[str, Any]:
    """Serialize a player profile for the auth/connect response."""
    return cast(dict[str, Any], to_json_dict(player))


def snapshot_to_dict(snapshot: RuntimeSnapshot) -> dict[str, Any]:
    """Serialize a RuntimeSnapshot into the frontend GameState contract."""
    loop = snapshot.loop
    scene = snapshot.scene
    state = loop.state if isinstance(loop.state, dict) else {}
    return {
        "player": to_json_dict(snapshot.player),
        "loop_id": loop.loop_id,
        "phase": loop.phase.value,
        "location": loop.location_id,
        "stability": loop.stability,
        "tension": loop.tension,
        # Metrics (humanity/insight/resilience/dominance) and autonomy live in
        # loop.state["flags"]; the client reads them from here.
        "state": to_json_dict(state),
        "active_scene": {
            "scene_id": scene.scene_id,
            "turn_index": scene.turn_index,
            "title": scene.title,
            "location": scene.location,
            "narration": scene.narration,
            "choices": [to_json_dict(choice) for choice in scene.choices],
            "visual_brief": scene.visual_brief,
            "scene_type": scene.scene_type,
            "objective": scene.objective,
            "action_result": scene.action_result,
        },
        "assets": [to_json_dict(asset) for asset in snapshot.assets],
        "image_result": to_json_dict(snapshot.image_result) if snapshot.image_result else None,
        "echo": to_json_dict(snapshot.echo) if snapshot.echo else None,
        "bgm_path": snapshot.bgm_path,
        "combat": snapshot.combat,
    }
