from __future__ import annotations

from dataclasses import replace
from typing import Any

from mythos_core import AssetRecord, LoopPhase, LoopState, PlayerMemory, Scene
from mythos_core.clock import utc_now
from mythos_core.ids import new_memory_id, new_scene_id
from mythos_core.models import from_json_dict, to_json_dict
from mythos_memory import MythOSStore
from mythos_runtime.combat_service import CombatService
from mythos_runtime.options import SaveSlot
from mythos_runtime.visual_orchestration import _curated_anchor_image


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

    def save_slot(
        self, loop_id: str, label: str | None = None, slot_id: str | None = None
    ) -> SaveSlot:
        """Manual save: a NEW distinct slot carrying a full state snapshot.

        Autosave keeps upserting the per-loop bookmark (``slot_<loop_id>``); manual
        saves each get a unique slot id + a ``snapshot`` (loop state + scene) so
        loading one actually restores that moment, not just the live loop.

        With ``slot_id``, OVERWRITE that existing manual slot instead: the new
        snapshot is written under the same slot id (newest-wins keying makes it
        the visible one) and superseded rows are pruned best-effort. Autosave
        bookmarks cannot be overwritten — they re-upsert every turn anyway.
        """
        loop = self.store.get_loop(loop_id)
        if not loop:
            raise RuntimeError(f"loop_id={loop_id} not found")
        if loop.phase is LoopPhase.ENDED:
            raise RuntimeError(f"loop_id={loop_id} is ended; cannot save")
        scene = self.store.get_latest_scene(loop_id)
        if not scene:
            raise RuntimeError(f"no scenes found for loop_id={loop_id}")
        stale_ids: list[str] = []
        if slot_id is not None:
            memories = self.store.list_player_memories(loop.player_id)
            existing = _latest_save_slot_memories(memories).get(slot_id)
            if existing is None:
                raise RuntimeError(f"save slot not found: {slot_id}")
            metadata = existing.content.get("metadata")
            if not (isinstance(metadata, dict) and metadata.get("manual")):
                raise RuntimeError("autosave bookmarks cannot be overwritten")
            stale_ids = [
                m.memory_id
                for m in memories
                if m.kind == "save_slot" and str(m.content.get("slot_id")) == slot_id
            ]
        assets = self.store.list_assets(loop_id)
        memory = _save_slot_memory(loop, scene, assets, label=label, manual=True, slot_id=slot_id)
        self.store.save_player_memory(memory)
        if stale_ids:
            try:
                self.store.delete_player_memories(loop.player_id, stale_ids)
            except NotImplementedError:
                pass  # newest-wins keying keeps the overwrite correct regardless
        return _save_slot_from_memory(memory)

    def delete_save_slot(self, player_id: str, slot_id: str) -> int:
        """Delete a save slot (all memory rows sharing its slot id).

        Works for manual slots and autosave bookmarks alike — a deleted autosave
        simply re-appears on the loop's next turn.
        """
        memory_ids = [
            m.memory_id
            for m in self.store.list_player_memories(player_id)
            if m.kind == "save_slot" and str(m.content.get("slot_id")) == slot_id
        ]
        if not memory_ids:
            raise RuntimeError(f"save slot not found: {slot_id}")
        return self.store.delete_player_memories(player_id, memory_ids)

    def restore_slot(self, player_id: str, slot_id: str) -> LoopState | None:
        """Restore a manual slot's snapshot into its loop (a real load/rewind).

        Returns the restored loop, or ``None`` for legacy bookmark slots (no
        snapshot payload) — the caller then just resumes the live loop. The saved
        scene is re-appended as the new latest scene (with a fresh id and the next
        turn index) instead of deleting later scenes, so events/assets keep their
        referential integrity while play resumes from the saved moment.
        """
        target: PlayerMemory | None = None
        for memory in self.store.list_player_memories(player_id):
            if memory.kind != "save_slot":
                continue
            if str(memory.content.get("slot_id")) != slot_id:
                continue
            if target is None or memory.created_at > target.created_at:
                target = memory
        if target is None:
            raise RuntimeError(f"save slot not found: {slot_id}")
        snapshot = target.content.get("snapshot")
        if not isinstance(snapshot, dict):
            return None
        loop = from_json_dict(LoopState, snapshot["loop"])
        saved_scene = from_json_dict(Scene, snapshot["scene"])
        latest = self.store.get_latest_scene(loop.loop_id)
        next_turn = (latest.turn_index + 1) if latest else saved_scene.turn_index
        restored_scene = replace(
            saved_scene,
            scene_id=new_scene_id(),
            turn_index=next_turn,
            created_at=utc_now(),
        )
        self.store.save_loop(loop)
        self.store.save_scene(restored_scene)
        return loop

    def autosave(
        self, loop: LoopState, scene: Scene, assets: list[AssetRecord]
    ) -> PlayerMemory | None:
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
    manual: bool = False,
    slot_id: str | None = None,
) -> PlayerMemory:
    now = utc_now()
    memory_id = new_memory_id()
    if slot_id is None:
        slot_id = (
            f"slot_{loop.loop_id}_{memory_id.removeprefix('memory_')[:8]}"
            if manual
            else f"slot_{loop.loop_id}"
        )
    slot = {
        "slot_id": slot_id,
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
        "display_name": str(loop.state.get("display_name") or ""),
        "archetype": str(loop.state.get("archetype") or ""),
        "metadata": {
            "location_id": loop.location_id,
            "location": scene.location,
            "autosave": not manual,
            "manual": manual,
            # Curated anchor image the player actually saw (if any) → free thumbnail
            # on the save/load screen; relative to resources/<scenario>/.
            "curated_image": _curated_anchor_image(loop) or "",
        },
    }
    if manual:
        # Full state snapshot so loading this slot restores THIS moment.
        slot["snapshot"] = {"loop": to_json_dict(loop), "scene": to_json_dict(scene)}
    return PlayerMemory(
        memory_id=memory_id,
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
        display_name=str(content.get("display_name") or ""),
        archetype=str(content.get("archetype") or ""),
        metadata=metadata if isinstance(metadata, dict) else {},
    )


def _latest_save_slot_memories(memories: list[PlayerMemory]) -> dict[str, PlayerMemory]:
    # Keyed by slot_id: autosaves share the per-loop bookmark id (upsert), while
    # each manual save is its own distinct slot — so several manual saves coexist.
    latest: dict[str, PlayerMemory] = {}
    for memory in memories:
        if memory.kind != "save_slot":
            continue
        slot_id = memory.content.get("slot_id") or memory.content.get("loop_id")
        if not isinstance(slot_id, str) or not slot_id:
            continue
        current = latest.get(slot_id)
        if current is None or memory.created_at > current.created_at:
            latest[slot_id] = memory
    return latest


def _default_save_slot_label(loop: LoopState, scene: Scene) -> str:
    combat = "전투 중 " if CombatService.is_active(loop) or scene.scene_type == "combat" else ""
    return f"{combat}{scene.title}"


def _latest_asset_id(assets: list[AssetRecord], scene_id: str) -> str | None:
    for asset in reversed(assets):
        if asset.scene_id == scene_id:
            return asset.asset_id
    return assets[-1].asset_id if assets else None
