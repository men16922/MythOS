from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from contextlib import contextmanager

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

    @contextmanager
    def transaction(self) -> Iterator[None]:
        yield
