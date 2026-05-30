from __future__ import annotations

from mythos_core import WorldEvent
from mythos_core.clock import utc_now
from mythos_core.ids import new_event_id
from mythos_core.models import Actor


def create_player_event(
    loop_id: str,
    turn_index: int,
    action: str,
    result: str | None = None,
    state_delta: dict | None = None,
) -> WorldEvent:
    return WorldEvent(
        event_id=new_event_id(),
        loop_id=loop_id,
        turn_index=turn_index,
        actor=Actor.PLAYER,
        action=action,
        result=result,
        state_delta=state_delta or {},
        created_at=utc_now(),
    )


def create_world_event(
    loop_id: str,
    turn_index: int,
    action: str,
    result: str | None = None,
    state_delta: dict | None = None,
) -> WorldEvent:
    return WorldEvent(
        event_id=new_event_id(),
        loop_id=loop_id,
        turn_index=turn_index,
        actor=Actor.WORLD,
        action=action,
        result=result,
        state_delta=state_delta or {},
        created_at=utc_now(),
    )
