from __future__ import annotations

import argparse

from mythos_core import (
    Echo,
    LoopState,
    PlayerMemory,
    PlayerProfile,
    Scene,
    new_memory_id,
)
from mythos_core.clock import utc_now
from mythos_memory import PostgresMythOSStore
from mythos_runtime.observability import get_logger
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import MinIOStorageAdapter, VisualService

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


def _print_image_result(image_result) -> None:
    if image_result is None:
        return
    print(f"image_status={image_result.status}")
    print(f"image_uri={image_result.storage_uri}")


def _maybe_generate_image(
    args: argparse.Namespace,
    store: PostgresMythOSStore,
    scene: Scene,
    player_id: str,
) -> None:
    if not args.with_image:
        return
    service = VisualService(
        storage=None if args.filesystem_image else MinIOStorageAdapter(),
        store=store,
    )
    result = service.generate_for_scene(
        scene,
        player_id=player_id,
        request_overrides={
            "enabled": True,
            "width": args.image_width,
            "height": args.image_height,
            "steps": args.image_steps,
        },
    )
    print(f"image_status={result.status}")
    print(f"image_uri={result.storage_uri}")


def _require_player(store: PostgresMythOSStore, player_id: str) -> PlayerProfile:
    player = store.get_player(player_id)
    if player is None:
        raise SystemExit(f"player not found: {player_id}")
    return player


def _require_loop(store: PostgresMythOSStore, loop_id: str) -> LoopState:
    loop = store.get_loop(loop_id)
    if loop is None:
        raise SystemExit(f"loop not found: {loop_id}")
    return loop


def _resolve_action(scene: Scene, choice_id: str | None, action: str | None) -> str:
    if action:
        return action
    if not choice_id:
        raise SystemExit("--choice-id or --action is required")
    for choice in scene.choices:
        if choice.choice_id == choice_id:
            return choice.label
    raise SystemExit(f"choice not found: {choice_id}")


def _render_scene(
    loop: LoopState,
    scene: Scene,
    assets: list | None = None,
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


def _echoes_from_memories(memories: list[PlayerMemory]) -> list[Echo]:
    echoes: list[Echo] = []
    for memory in memories:
        if memory.kind != "echo":
            continue
        content = memory.content
        try:
            echoes.append(
                Echo(
                    echo_id=str(content["echo_id"]),
                    source_loop_id=str(content["source_loop_id"]),
                    source_event_id=str(content["source_event_id"]),
                    symbol=str(content["symbol"]),
                    text=str(content["text"]),
                    weight=float(content.get("weight", memory.weight)),
                )
            )
        except KeyError:
            continue
    return echoes


def _save_echo_memory(store: PostgresMythOSStore, player_id: str, echo: Echo) -> PlayerMemory:
    now = utc_now()
    memory = PlayerMemory(
        memory_id=new_memory_id(),
        player_id=player_id,
        kind="echo",
        content={
            "echo_id": echo.echo_id,
            "source_loop_id": echo.source_loop_id,
            "source_event_id": echo.source_event_id,
            "symbol": echo.symbol,
            "text": echo.text,
            "weight": echo.weight,
        },
        weight=echo.weight,
        created_at=now,
        updated_at=now,
    )
    store.save_player_memory(memory)
    return memory


def _symbol_from_scene(scene: Scene) -> str:
    return next(
        (word.strip(".,:;!?").lower() for word in scene.title.split() if word.strip()),
        "echo",
    )


def _print_errors(errors: list) -> None:
    for error in errors:
        print(f"error={error.code}: {error.message}")


if __name__ == "__main__":
    raise SystemExit(main())
