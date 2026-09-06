from __future__ import annotations

import argparse

from mythos_core import (
    AssetRecord,
    LoopState,
    Scene,
)
from mythos_memory import PostgresMythOSStore
from mythos_runtime.observability import get_logger
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import VisualGenerationResult

LOGGER = get_logger("mythos.cli")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m mythos_runtime.connect_cli",
        description="Local Project MythOS CLI vertical slice.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_player = subparsers.add_parser("new-player", help="Create or update a player.")
    new_player.add_argument("display_name")
    new_player.add_argument("--player-id", help="Optional explicit player id.")

    connect = subparsers.add_parser("connect", help="Start a new loop for a player.")
    connect.add_argument("--player-id", required=True)
    _add_runtime_flags(connect)

    choose = subparsers.add_parser("choose", help="Apply a choice/action to a loop.")
    choose.add_argument("--loop-id", required=True)
    choose.add_argument("--choice-id")
    choose.add_argument("--action")
    _add_runtime_flags(choose)

    resume = subparsers.add_parser("resume", help="Render latest loop state.")
    resume.add_argument("--loop-id")
    resume.add_argument("--player-id")

    archive = subparsers.add_parser("archive", help="End a loop and save an Echo memory.")
    archive.add_argument("--loop-id", required=True)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    store = PostgresMythOSStore()
    try:
        if args.command == "new-player":
            return _new_player(args, store)
        if args.command == "connect":
            return _connect(args, store)
        if args.command == "choose":
            return _choose(args, store)
        if args.command == "resume":
            return _resume(args, store)
        if args.command == "archive":
            return _archive(args, store)
    finally:
        store.close()
    return 1


def _add_runtime_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--fallback",
        action="store_true",
        help="Use deterministic fallback scene instead of Ollama.",
    )
    parser.add_argument(
        "--with-image",
        action="store_true",
        help="Generate/upload a scene image. Defaults to disabled metadata only.",
    )
    parser.add_argument(
        "--filesystem-image",
        action="store_true",
        help="Use filesystem image storage instead of MinIO when --with-image is set.",
    )
    parser.add_argument("--image-width", type=int, default=1024)
    parser.add_argument("--image-height", type=int, default=1024)
    parser.add_argument("--image-steps", type=int, default=4)
    parser.add_argument(
        "--quality-mode",
        action="store_true",
        help="Disable fast-mode shortcuts and allow slower repair/sync fallback paths.",
    )


def _new_player(args: argparse.Namespace, store: PostgresMythOSStore) -> int:
    player = RuntimeSessionService(store).create_player(args.display_name, player_id=args.player_id)
    print(f"player_id={player.player_id}")
    print(f"display_name={player.display_name}")
    return 0


def _connect(args: argparse.Namespace, store: PostgresMythOSStore) -> int:
    try:
        snapshot = RuntimeSessionService(store).start_loop(args.player_id, _runtime_options(args))
    except RuntimeError as exc:
        print(f"error={exc}")
        return 1
    _print_image_result(snapshot.image_result)
    _render_scene(snapshot.loop, snapshot.scene, snapshot.assets)
    return 0


def _choose(args: argparse.Namespace, store: PostgresMythOSStore) -> int:
    try:
        snapshot = RuntimeSessionService(store).choose(
            args.loop_id,
            choice_id=args.choice_id,
            action=args.action,
            options=_runtime_options(args),
        )
    except RuntimeError as exc:
        print(f"error={exc}")
        return 1
    _print_image_result(snapshot.image_result)
    _render_scene(snapshot.loop, snapshot.scene, snapshot.assets)
    return 0


def _resume(args: argparse.Namespace, store: PostgresMythOSStore) -> int:
    try:
        snapshot = RuntimeSessionService(store).resume(
            loop_id=args.loop_id, player_id=args.player_id
        )
    except RuntimeError as exc:
        print(f"error={exc}")
        return 1
    _render_scene(snapshot.loop, snapshot.scene, snapshot.assets)
    return 0


def _archive(args: argparse.Namespace, store: PostgresMythOSStore) -> int:
    try:
        snapshot = RuntimeSessionService(store).archive(args.loop_id)
    except RuntimeError as exc:
        print(f"error={exc}")
        return 1
    print(f"loop_id={snapshot.loop.loop_id}")
    print(f"phase={snapshot.loop.phase.value}")
    if snapshot.echo is not None:
        print(f"echo_id={snapshot.echo.echo_id}")
    return 0


def _runtime_options(args: argparse.Namespace) -> RuntimeOptions:
    return RuntimeOptions(
        fast_mode=not args.quality_mode,
        fallback=args.fallback,
        with_image=args.with_image,
        image_storage="filesystem" if args.filesystem_image else "minio",
        image_width=args.image_width,
        image_height=args.image_height,
        image_steps=args.image_steps,
    )


def _print_image_result(image_result: VisualGenerationResult | None) -> None:
    if image_result is None:
        return
    print(f"image_status={image_result.status}")
    print(f"image_uri={image_result.storage_uri}")


def _render_scene(
    loop: LoopState,
    scene: Scene,
    assets: list[AssetRecord] | None = None,
) -> None:
    print(f"loop_id={loop.loop_id}")
    print(f"phase={loop.phase.value}")
    print(f"stability={loop.stability}")
    print(f"tension={loop.tension}")
    print(f"scene_id={scene.scene_id}")
    print(f"title={scene.title}")
    print(f"location={scene.location}")
    print("")
    print(scene.narration)
    print("")
    print("choices:")
    for choice in scene.choices:
        print(f"- {choice.choice_id}: {choice.label} [{choice.intent}]")
    if assets:
        stored_assets = [asset for asset in assets if asset.storage_uri]
        if stored_assets:
            latest_asset = stored_assets[-1]
            print("")
            print(f"asset={latest_asset.storage_uri}")


if __name__ == "__main__":
    raise SystemExit(main())
