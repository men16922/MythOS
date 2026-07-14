"""Faithful repro of the prod key-beat opening turn: real neo-seoul scenario
context (opening directives) -> build_first_scene_messages -> 3.5 stream."""

from __future__ import annotations

import os
from datetime import UTC, datetime

os.environ.setdefault("MYTHOS_LOG_LEVEL", "INFO")

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_narrative.gemini_provider import GeminiConfig, VertexGeminiJSONProvider
from mythos_narrative.parser import parse_scene_payload
from mythos_narrative.prompts import build_first_scene_messages
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context

_NOW = datetime(2026, 7, 14, tzinfo=UTC)

player = PlayerProfile("p_probe", "KeybeatQA", _NOW, _NOW, {"archetype": "ghost"})
loop = LoopState(
    "l_probe", "p_probe", "seed", LoopPhase.CONNECT, "c17_alley", 70, 22, _NOW, None, {}, []
)
ctx = build_runtime_narrative_context(
    player=player,
    loop=loop,
    scenario=load_scenario("neo-seoul"),
    turn_index=0,
    recent_events=[],
    memories=[],
    world_memories=[],
    narrative_shards=[],
    novelty_notes=[],
    language="en",
)
print(f"key_beat={ctx.key_beat}")
messages = build_first_scene_messages(ctx)
total_chars = sum(len(m["content"]) for m in messages)
print(f"prompt chars={total_chars}")

cfg = GeminiConfig(model="gemini-2.5-flash", keybeat_model="gemini-3.5-flash")
provider = VertexGeminiJSONProvider(cfg)
print(f"location={cfg.location} max_output_tokens={cfg.max_output_tokens} thinking={cfg.thinking_budget}")
parts: list[str] = []
try:
    for chunk in provider.stream(messages, model="gemini-3.5-flash"):
        parts.append(chunk)
except Exception as exc:  # noqa: BLE001
    print(f"STREAM RAISED: {type(exc).__name__}: {exc}")
raw = "".join(parts)
print(f"chunks={len(parts)} raw_len={len(raw)}")
print("--- tail 300 ---")
print(raw[-300:])
try:
    payload = parse_scene_payload(raw)
    print(f"PARSE OK: title={payload.title!r} narration_len={len(payload.narration)}")
except Exception as exc:  # noqa: BLE001
    print(f"PARSE FAILED: {type(exc).__name__}: {exc}")
