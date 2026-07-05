from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from mythos_core import (
    AssetRecord,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    Scene,
    WorldEvent,
    WorldMemory,
)


class StoreError(RuntimeError):
    pass


class MythOSStore(ABC):
    @abstractmethod
    def create_player(self, profile: PlayerProfile) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_player(self, player_id: str) -> PlayerProfile | None:
        raise NotImplementedError

    @abstractmethod
    def list_players(self) -> list[PlayerProfile]:
        raise NotImplementedError

    @abstractmethod
    def save_loop(self, loop: LoopState) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_loop(self, loop_id: str) -> LoopState | None:
        raise NotImplementedError

    @abstractmethod
    def list_loops(self, player_id: str) -> list[LoopState]:
        raise NotImplementedError

    @abstractmethod
    def append_event(self, event: WorldEvent) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_events(self, loop_id: str) -> list[WorldEvent]:
        raise NotImplementedError

    @abstractmethod
    def save_scene(self, scene: Scene) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_scene_by_turn(self, loop_id: str, turn_index: int) -> Scene | None:
        raise NotImplementedError

    @abstractmethod
    def get_latest_scene(self, loop_id: str) -> Scene | None:
        raise NotImplementedError

    @abstractmethod
    def list_scenes(self, loop_id: str) -> list[Scene]:
        raise NotImplementedError

    @abstractmethod
    def save_player_memory(self, memory: PlayerMemory) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_player_memories(self, player_id: str) -> list[PlayerMemory]:
        raise NotImplementedError

    # Non-abstract (save-slot delete/overwrite cleanup) so existing fake stores
    # keep working; concrete stores override. Returns the number of rows removed.
    def delete_player_memories(self, player_id: str, memory_ids: list[str]) -> int:
        raise NotImplementedError

    @abstractmethod
    def save_world_memory(self, memory: WorldMemory) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_world_memories(self, world_id: str) -> list[WorldMemory]:
        raise NotImplementedError

    @abstractmethod
    def save_narrative_shard(self, shard: NarrativeShard) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_narrative_shards(self, player_id: str, limit: int = 8) -> list[NarrativeShard]:
        raise NotImplementedError

    @abstractmethod
    def save_asset(self, asset: AssetRecord) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_assets(self, loop_id: str) -> list[AssetRecord]:
        raise NotImplementedError

    # --- Progression (player+scenario 단위 단일 row; append-scan 대체) ---------
    # 기본 구현은 in-memory 폴백이라 테스트용 fake store가 그대로 동작한다.
    # PostgresMythOSStore가 실제 player_progression 테이블로 오버라이드한다.
    def get_progression(self, player_id: str, scenario_id: str) -> dict[str, Any] | None:
        store = self.__dict__.setdefault("_progression_mem", {})
        value = store.get((player_id, scenario_id))
        return dict(value) if value is not None else None

    def save_progression(
        self, player_id: str, scenario_id: str, content: dict[str, Any]
    ) -> None:
        store = self.__dict__.setdefault("_progression_mem", {})
        store[(player_id, scenario_id)] = dict(content)

    # --- Inventory (loop 단위; 항목은 {"item_id","quantity","equipped"}) --------
    def list_inventory(self, loop_id: str) -> list[dict[str, Any]]:
        store = self.__dict__.setdefault("_inventory_mem", {})
        return [dict(item) for item in store.get(loop_id, [])]

    def set_inventory(self, loop_id: str, items: list[dict[str, Any]]) -> None:
        store = self.__dict__.setdefault("_inventory_mem", {})
        store[loop_id] = [dict(item) for item in items]

    @contextmanager
    def transaction(self) -> Iterator[None]:
        yield
