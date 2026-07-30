"""Export a loop's full scene transcript from Postgres into the golden eval bank.

Usage:
    .venv/bin/python scripts/eval/bank_loop.py --loop-id loop_xxx --name my-golden \
        [--note "keybeat A-arm, owner run 07-17"] [--language en]

Reads via MythOSStore against DATABASE_URL (local dev DB by default; point it at
the prod DSN to bank a production loop). Writes scripts/eval/golden/<name>.json in
the shape narrative_judge.py consumes. Choices are flattened to labels — the judge
scores player-facing text, not authoring metadata.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

GOLDEN_DIR = Path(__file__).resolve().parent / "golden"


def resolve_language(state: dict[str, object], override: str | None) -> str:
    """Resolve transcript language without silently mislabelling old loops as KO."""
    if override:
        return override
    stored = state.get("language")
    if isinstance(stored, str) and stored:
        return stored
    raise ValueError("loop has no stored language; pass --language ko or --language en")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--loop-id", required=True)
    parser.add_argument("--name", required=True, help="golden file stem (kebab-case)")
    parser.add_argument("--note", default="", help="context note (arm, player, date)")
    parser.add_argument(
        "--language",
        choices=("ko", "en"),
        help="required for legacy loops whose state does not persist language",
    )
    args = parser.parse_args()

    from mythos_memory.postgres_store import PostgresMythOSStore

    store = PostgresMythOSStore()
    try:
        loop = store.get_loop(args.loop_id)
        if loop is None:
            print(f"loop not found: {args.loop_id}")
            return 1
        scenes = store.list_scenes(args.loop_id)
    finally:
        store.close()
    if not scenes:
        print(f"loop has no scenes: {args.loop_id}")
        return 1

    payload = {
        "name": args.name,
        "scenario_id": str(loop.state.get("scenario_id") or "neo-seoul"),
        "language": resolve_language(loop.state, args.language),
        "note": args.note,
        "loop_id": args.loop_id,
        "scenes": [
            {
                "turn_index": s.turn_index,
                "title": s.title,
                "location": s.location,
                "narration": s.narration,
                "action_result": s.action_result,
                "scene_type": s.scene_type,
                "choices": [c.label for c in s.choices],
            }
            for s in sorted(scenes, key=lambda s: s.turn_index)
        ],
    }
    GOLDEN_DIR.mkdir(parents=True, exist_ok=True)
    out = GOLDEN_DIR / f"{args.name}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"banked {len(payload['scenes'])} scenes → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
