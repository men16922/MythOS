from __future__ import annotations

from typing import Any

from mythos_core import AssetRecord, LoopPhase, LoopState, PlayerMemory, Scene
from mythos_core.clock import utc_now
from mythos_core.ids import new_memory_id
from mythos_memory import MythOSStore
from mythos_runtime.combat_service import CombatService
from mythos_runtime.options import SaveSlot


class SaveLoadService:
    def __init__(self, store: MythOSStore) -> None:
        self.store = store

    def list_save_slots(self, player_id: str, limit: int = 20) -> list[SaveSlot]:
        memories = self.store.list_player_memories(player_id)
        latest_memories = _latest_save_slot_memories(memories)
        slots = []
        for memory in latest_memories.values():
            slots.append(_save_slot_from_memory(memory))
        slots.sort(key=lambda s: s.saved_at, reverse=True)
        return slots[:limit]

    def save_slot(self, loop_id: str, label: str | None = None) -> SaveSlot:
        loop = self.store.get_loop(loop_id)
        if not loop:
            raise RuntimeError(f"loop_id={loop_id} not found")
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop_id} is ended; cannot save")
        scene = self.store.get_latest_scene(loop_id)
        if not scene:
            raise RuntimeError(f"no scenes found for loop_id={loop_id}")
        assets = self.store.list_assets(loop_id)
        memory = _save_slot_memory(loop, scene, assets, label=label)
        self.store.save_player_memory(memory)
        return _save_slot_from_memory(memory)

    def autosave(self, loop: LoopState, scene: Scene, assets: list[AssetRecord]) -> PlayerMemory | None:
        if loop.phase is LoopPhase.ENDED:
            return None
        memory = _save_slot_memory(loop, scene, assets, label=None)
        self.store.save_player_memory(memory)
        return memory


def _save_slot_memory(
    loop: LoopState,
    scene: Scene,
    assets: list[AssetRecord],
    label: str | None,
) -> PlayerMemory:
    now = utc_now()
    slot = {
        "slot_id": f"slot_{loop.loop_id}",
        "player_id": loop.player_id,
        "loop_id": loop.loop_id,
        "scenario_id": str(loop.state.get("scenario_id") or "neo-seoul"),
        "label": label or _default_save_slot_label(loop, scene),
        "scene_title": scene.title,
        "phase": loop.phase.value,
        "saved_at": now.isoformat(),
        "stability": loop.stability,
        "tension": loop.tension,
        "turn_index": scene.turn_index,
        "in_combat": CombatService.is_active(loop) or scene.scene_type == "combat",
        "asset_id": _latest_asset_id(assets, scene.scene_id),
        "metadata": {
            "location_id": loop.location_id,
            "location": scene.location,
            "autosave": label is None,
        },
    }
    return PlayerMemory(
        memory_id=new_memory_id(),
        player_id=loop.player_id,
        kind="save_slot",
        content=slot,
        weight=1.0,
        created_at=now,
        updated_at=now,
    )


def _save_slot_from_loop(
    loop: LoopState,
    scene: Scene,
    memory: PlayerMemory | None,
    assets: list[AssetRecord],
) -> SaveSlot:
    if memory is not None:
        content = dict(memory.content)
        content.setdefault("phase", loop.phase.value)
        content.setdefault("stability", loop.stability)
        content.setdefault("tension", loop.tension)
        content.setdefault("turn_index", scene.turn_index)
        content.setdefault("scene_title", scene.title)
        content.setdefault(
            "in_combat", CombatService.is_active(loop) or scene.scene_type == "combat"
        )
        return _save_slot_from_content(content, fallback_saved_at=memory.created_at.isoformat())
    return _save_slot_from_memory(_save_slot_memory(loop, scene, assets, label=None))


def _save_slot_from_memory(memory: PlayerMemory) -> SaveSlot:
    return _save_slot_from_content(memory.content, fallback_saved_at=memory.created_at.isoformat())


def _save_slot_from_content(content: dict[str, Any], fallback_saved_at: str) -> SaveSlot:
    metadata = content.get("metadata")
    return SaveSlot(
        slot_id=str(content.get("slot_id") or f"slot_{content.get('loop_id', '')}"),
        player_id=str(content.get("player_id") or ""),
        loop_id=str(content.get("loop_id") or ""),
        scenario_id=str(content.get("scenario_id") or "neo-seoul"),
        label=str(content.get("label") or "Autosave"),
        scene_title=str(content.get("scene_title") or "Untitled Scene"),
        phase=str(content.get("phase") or "connect"),
        saved_at=str(content.get("saved_at") or fallback_saved_at),
        stability=int(content.get("stability") or 0),
        tension=int(content.get("tension") or 0),
        turn_index=int(content.get("turn_index") or 0),
        in_combat=bool(content.get("in_combat")),
        asset_id=str(content["asset_id"]) if content.get("asset_id") is not None else None,
        metadata=metadata if isinstance(metadata, dict) else {},
    )


def _latest_save_slot_memories(memories: list[PlayerMemory]) -> dict[str, PlayerMemory]:
    latest: dict[str, PlayerMemory] = {}
    for memory in memories:
        if memory.kind != "save_slot":
            continue
        loop_id = memory.content.get("loop_id")
        if not isinstance(loop_id, str) or not loop_id:
            continue
        current = latest.get(loop_id)
        if current is None or memory.created_at > current.created_at:
            latest[loop_id] = memory
    return latest


def _default_save_slot_label(loop: LoopState, scene: Scene) -> str:
    combat = "전투 중 " if CombatService.is_active(loop) or scene.scene_type == "combat" else ""
    return f"{combat}{scene.title}"


def _latest_asset_id(assets: list[AssetRecord], scene_id: str) -> str | None:
    for asset in reversed(assets):
        if asset.scene_id == scene_id:
            return asset.asset_id
    return assets[-1].asset_id if assets else None
