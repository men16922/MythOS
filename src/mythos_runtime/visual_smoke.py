from __future__ import annotations

import argparse
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

from mythos_core import Choice, LoopPhase, LoopState, PlayerProfile, Scene
from mythos_memory import PostgresMythOSStore
from mythos_runtime.visual_service import (
    FilesystemStorageAdapter,
    MinIOStorageAdapter,
    VisualGenerationRequest,
    VisualService,
)


class TinyPngProvider:
    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (request.width, request.height), color=(18, 28, 46)).save(output_path)
        return output_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m mythos_runtime.visual_smoke",
        description="Run a visual service smoke without loading FLUX by default.",
    )
    parser.add_argument(
        "--storage",
        choices=["filesystem", "minio"],
        default="filesystem",
        help="Where to store the generated smoke image.",
    )
    parser.add_argument(
        "--db",
        action="store_true",
        help="Create smoke player/loop/scene rows and save asset metadata to Postgres.",
    )
    parser.add_argument(
        "--disabled",
        action="store_true",
        help="Exercise disabled generation mode.",
    )
    parser.add_argument(
        "--real-flux",
        action="store_true",
        help="Use the real local FLUX provider instead of the tiny fake PNG provider.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    now = datetime(2026, 5, 30, tzinfo=UTC)
    player = PlayerProfile(
        player_id="player_visual_smoke",
        display_name="Visual Smoke",
        created_at=now,
        updated_at=now,
    )
    loop = LoopState(
        loop_id="loop_visual_smoke",
        player_id=player.player_id,
        seed="seed_visual_smoke",
        phase=LoopPhase.CONNECT,
        location_id="data-layer-01",
        stability=70,
        tension=20,
        started_at=now,
    )
    scene = Scene(
        scene_id="scene_visual_smoke",
        loop_id=loop.loop_id,
        turn_index=0,
        title="Visual Smoke",
        location="data-layer-01",
        narration="A smoke image is generated for integration testing.",
        choices=[Choice("choice_visual_smoke", "Continue", "explore")],
        visual_brief="A small dark blue square representing a MythOS visual smoke test.",
        created_at=now,
    )

    store = PostgresMythOSStore() if args.db else None
    if store is not None:
        store.create_player(player)
        store.save_loop(loop)
        store.save_scene(scene)

    with tempfile.TemporaryDirectory() as tmp:
        storage = (
            MinIOStorageAdapter()
            if args.storage == "minio"
            else FilesystemStorageAdapter(Path(tmp) / "images")
        )
        provider = None if args.real_flux else TinyPngProvider()
        service = VisualService(
            provider=provider,
            storage=storage,
            store=store,
            work_dir=Path(tmp) / "work",
        )
        result = service.generate_for_scene(
            scene,
            player_id=player.player_id,
            request_overrides={
                "enabled": not args.disabled,
                "width": 128 if args.real_flux else 8,
                "height": 128 if args.real_flux else 8,
                "steps": 1,
                "metadata": {"smoke": True},
            },
        )

    if store is not None:
        store.close()

    print(f"status={result.status}")
    print(f"storage_uri={result.storage_uri}")
    print(f"asset_id={result.asset.asset_id}")
    if result.error:
        print(f"error={result.error}")
    return 0 if result.status in {"succeeded", "disabled"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
