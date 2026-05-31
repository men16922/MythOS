from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from mythos_core import AssetRecord, LoopState, Scene
from mythos_core.clock import utc_now
from mythos_core.ids import new_asset_id
from mythos_memory import MythOSStore
from mythos_runtime.observability import get_logger


@dataclass(frozen=True)
class AudioAsset:
    asset_id: str
    storage_uri: str
    kind: str  # 'bgm', 'sfx'
    metadata: dict = field(default_factory=dict)


class AudioProvider(Protocol):
    def get_bgm_for_state(self, loop_state: LoopState, scene: Scene) -> str | None:
        """Returns a storage URI or path for the BGM."""
        raise NotImplementedError


class StaticAudioProvider:
    """Selects BGM from a predefined set of files based on Tension and Stability."""

    def __init__(self, base_path: Path) -> None:
        self.base_path = base_path
        # Mapping: (tension_range, stability_range) -> filename
        # Simplified for now: low_tension, high_tension, unstable
        self.bgm_map = {
            "ambient_calm": "bgm_calm.wav",
            "ambient_tense": "bgm_tense.wav",
            "ambient_unstable": "bgm_unstable.wav",
        }

    def get_bgm_for_state(self, loop_state: LoopState, scene: Scene) -> str | None:
        if loop_state.stability < 30:
            key = "ambient_unstable"
        elif loop_state.tension > 70:
            key = "ambient_tense"
        else:
            key = "ambient_calm"

        filename = self.bgm_map.get(key)
        if not filename:
            return None

        audio_path = self.base_path / filename
        if audio_path.exists():
            return str(audio_path)
        return None


class AudioService:
    def __init__(
        self,
        store: MythOSStore,
        provider: AudioProvider | None = None,
        base_audio_path: Path | None = None,
    ) -> None:
        self.store = store
        self.logger = get_logger("mythos.audio")

        # Default to PROJECT_ROOT/resources/neo-seoul/audio
        if base_audio_path is None:
            project_root = Path(__file__).resolve().parent.parent.parent
            self.base_path = project_root / "resources" / "neo-seoul" / "audio"
        else:
            self.base_path = base_audio_path

        self.provider = provider or StaticAudioProvider(self.base_path)

    def get_current_bgm(self, loop_state: LoopState, scene: Scene) -> str | None:
        """Determines and returns the BGM to play for the current state."""
        try:
            return self.provider.get_bgm_for_state(loop_state, scene)
        except Exception:
            self.logger.error("Failed to get BGM for state", exc_info=True)
            return None

    def record_audio_asset(
        self, loop_id: str, scene_id: str, storage_uri: str, kind: str = "bgm"
    ) -> AssetRecord:
        """Records the audio asset in the store for traceability."""
        asset = AssetRecord(
            asset_id=new_asset_id(),
            scene_id=scene_id,
            loop_id=loop_id,
            provider="static_provider",
            model_id="v1",
            prompt=f"Auto-selected {kind}",
            seed=0,
            width=0,
            height=0,
            steps=0,
            storage_uri=storage_uri,
            metadata={"kind": kind},
            created_at=utc_now(),
        )
        self.store.save_asset(asset)
        return asset
