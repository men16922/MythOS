"""Reproduce the 00065 hybrid streaming fallback: stream with model override
exactly like the director's key-beat path and show where parsing fails."""

from __future__ import annotations

import os
import sys

os.environ.setdefault("MYTHOS_LOG_LEVEL", "INFO")

from mythos_narrative.gemini_provider import GeminiConfig, VertexGeminiJSONProvider
from mythos_narrative.parser import parse_scene_payload

BASE = "gemini-2.5-flash"
KEYBEAT = "gemini-3.5-flash"

MESSAGES = [
    {
        "role": "system",
        "content": (
            "You are the narrative director of a Korean cyberpunk TRPG. "
            "Return the scene as JSON following the response schema."
        ),
    },
    {
        "role": "user",
        "content": (
            "Opening scene: the player (archetype ghost) wakes in the rainy C-17 alley "
            "of Neo-Seoul under surveillance cameras; an unauthorized ping blinks. "
            "Write narration (Korean, ~600 chars), 2 choices, visual_brief."
        ),
    },
]


def run(model_override: str | None) -> None:
    cfg = GeminiConfig(model=BASE, keybeat_model=KEYBEAT)
    provider = VertexGeminiJSONProvider(cfg)
    label = model_override or f"(base {BASE})"
    print(f"=== stream model={label} location={cfg.location} ===")
    parts: list[str] = []
    try:
        for chunk in provider.stream(MESSAGES, model=model_override):
            parts.append(chunk)
    except Exception as exc:  # noqa: BLE001
        print(f"STREAM RAISED: {type(exc).__name__}: {exc}")
        return
    raw = "".join(parts)
    print(f"chunks={len(parts)} raw_len={len(raw)}")
    print("--- raw head ---")
    print(raw[:400])
    print("--- raw tail ---")
    print(raw[-400:])
    try:
        payload = parse_scene_payload(raw)
        print(f"PARSE OK: title={payload.title!r} choices={len(payload.choices)}")
    except Exception as exc:  # noqa: BLE001
        print(f"PARSE FAILED: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    if which in ("both", "keybeat"):
        run(KEYBEAT)
    if which in ("both", "base"):
        run(None)
