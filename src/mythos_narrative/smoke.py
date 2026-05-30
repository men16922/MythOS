from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime

from mythos_core import LoopPhase, LoopState, PlayerProfile
from mythos_core.models import to_json_dict

from .director import NarrativeDirector
from .schemas import NarrativeContext


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m mythos_narrative.smoke",
        description="Generate a sample MythOS narrative scene.",
    )
    parser.add_argument(
        "--fallback-only",
        action="store_true",
        help="Skip Ollama and render the deterministic fallback scene.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    now = datetime(2026, 5, 30, tzinfo=UTC)
    context = NarrativeContext(
        player=PlayerProfile(
            player_id="player_smoke_narrative",
            display_name="Smoke Connector",
            created_at=now,
            updated_at=now,
        ),
        loop=LoopState(
            loop_id="loop_smoke_narrative",
            player_id="player_smoke_narrative",
            seed="seed_smoke",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=70,
            tension=20,
            started_at=now,
        ),
        turn_index=0,
    )

    director = NarrativeDirector()
    scene, payload = (
        director.fallback_scene(context)
        if args.fallback_only
        else director.generate_first_scene(context)
    )
    print(
        json.dumps(
            {
                "scene": to_json_dict(scene),
                "world_delta": payload.world_delta.as_state_delta(),
                "end_condition": payload.end_condition,
                "narrative_metrics": director.metrics.as_dict(),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
